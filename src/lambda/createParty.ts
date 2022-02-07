import {APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';
import {v4} from 'uuid';
import Ajv, {JSONSchemaType} from 'ajv';

import {logger} from '../util/logging';
import {httpError, NotAuthenticated} from '../util/errors';
import {checkJwt, JwtPayload} from '../util/jwt';
import {Party, PartyStatus} from '../data/party/entity';
import PartiesRepo from '../data/party/repo';
import PartyMoviesRepo from '../data/party-movie/repo';
import MembersRepo from '../data/party-member/repo';
import MovieGroupsRepo from '../data/movie-grouping/repo';
import {forEach} from '../util/async';
import {PartyMovie} from '../data/party-movie/entity';
import {shuffle} from '../util/shuffle';

import {randomString} from '../util/random';
import {decodeB64} from '../util/base64';
import BadRequest from '../util/errors/badRequest';

// Initialize clients
const dynamodb = new DynamoDB.DocumentClient();
const partiesRepo = new PartiesRepo(dynamodb);
const partyMoviesRepo = new PartyMoviesRepo(dynamodb);
const membersRepo = new MembersRepo(dynamodb);
const movieGroupsRepo = new MovieGroupsRepo(dynamodb);

// Constants
const codeLength = 7;
const maxRetries = 10;
const maxRating = 10;

// Interfaces
interface Body {
  genres: string[];
  minYear: number;
  maxYear: number;
  minRating: number;
  maxSwipes: number;
}

// Validate payload
const ajv = new Ajv();
const schema: JSONSchemaType<Body> = {
  type: 'object',
  properties: {
    genres: {
      type: 'array',
      nullable: false,
      items: {type: 'string'},
      maxItems: 3,
    },
    minYear: {type: 'integer', nullable: false, minimum: 1980, maximum: 2025},
    maxYear: {type: 'integer', nullable: false, minimum: 1980, maximum: 2025},
    minRating: {type: 'integer', nullable: false, minimum: 0, maximum: 10},
    maxSwipes: {type: 'integer', nullable: false, maximum: 150, minimum: 25},
  },
  required: ['genres', 'minYear', 'maxYear', 'maxSwipes', 'minRating'],
  additionalProperties: false,
};
const validate = ajv.compile(schema);

const isJson = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch (err) {
    return false;
  }
};

// Fetch a list of movies from the specified parameters and create a new movie list
const createPartyMovies = async (partyId: string, body: Body): Promise<void> => {
  const {genres, minYear, maxYear, minRating, maxSwipes} = body;

  // Get range of all ratings
  const ratings: number[] = [];
  for (let i = minRating; i <= maxRating; i += 1) ratings.push(i);

  // Get all movies with given criteria
  const seenMovies: Record<string, PartyMovie> = {};
  const movieGenres: Record<string, string[] | undefined> = {};
  let movies: PartyMovie[] = [];

  // Iterate over each grouping
  logger.debug('Query movie groups...');
  await forEach(genres, async genre => {
    await forEach(ratings, async rating => {
      // Get movie group from DB
      logger.debug(`Trying to query group: movie-group#${genre}#${rating} for years ${minYear}-${maxYear}`);
      const group = await movieGroupsRepo.getMovieGroup(genre, rating, minYear, maxYear);
      group.forEach(grouping => {
        const curGenres = movieGenres[grouping.movieId];

        // If seen before, simply append current genre to list
        if (curGenres) movieGenres[grouping.movieId] = [...curGenres, genre];
        // Create new entry in genres hashmap and seenMovies
        else {
          movieGenres[grouping.movieId] = [genre];
          seenMovies[grouping.movieId] = {partyId, movieId: grouping.movieId, score: 0};
        }
      });
    });
  });

  // Only return movies that match minimum genres
  Object.keys(movieGenres).forEach(key => {
    if ((movieGenres[key]?.length || 0) >= genres.length) movies.push(seenMovies[key]);
  });

  logger.debug(`Found ${movies.length} total movies.`);

  // Shuffle list
  movies = shuffle(movies);
  movies = movies.slice(0, maxSwipes);

  // Populate changes in DB
  logger.debug('Saving party movies...');
  await partyMoviesRepo.saveBatch(movies);
};

// Create a new party member, the owner
const createPartyMember = async (partyId: string, user: JwtPayload): Promise<void> => {
  const now = new Date();
  await membersRepo.save({
    partyId,
    memberId: user.sub,
    name: user.name,
    joinTime: now.getTime(),
    swiped: 0,
  });
};

// Create new party
const createParty = async (body: Body, user: JwtPayload): Promise<Party> => {
  const now = new Date();
  const partyId = v4();

  // Generate unique join code
  logger.debug('Generating join code...');
  let joinCode = randomString(codeLength);
  let backoffs = 0;
  while (backoffs < maxRetries) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await partiesRepo.joinCodeExists(joinCode))) {
      break;
    }

    backoffs += 1;
    joinCode = randomString(codeLength);

    if (backoffs === maxRetries) throw new Error('Unable to generate unique join code.');
  }

  // persist party to database
  logger.debug('Saving party...');
  const party = {
    partyId,
    joinCode,
    creationTime: now.getTime(),
    lastModified: now.getTime(),
    ownerId: user.sub,
    status: 'waiting' as PartyStatus,
  };
  await partiesRepo.save(party);

  return party;
};

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const user = await checkJwt(event);

    // Validate request body
    const body = event.isBase64Encoded ? decodeB64(event.body || '') : event.body;
    if (body === undefined) throw new BadRequest('No request body given.');
    if (!isJson(body)) throw new BadRequest('Request body does not appear to be valid JSON');
    if (!validate(JSON.parse(body)))
      throw new BadRequest(`Invalid payload: ${validate.errors ? JSON.stringify(validate.errors) : ''}`);

    const inp = JSON.parse(body) as Body;

    // Create party
    logger.debug('Creating party...');
    const party = await createParty(inp, user);

    // Create party member
    logger.debug('Creating party member...');
    await createPartyMember(party.partyId, user);

    // Create party movies
    logger.debug('Creating party movies...');
    await createPartyMovies(party.partyId, inp);

    return {
      statusCode: 200,
      body: JSON.stringify(party),
    };
  } catch (err) {
    if (err instanceof NotAuthenticated) {
      return httpError(401, err.message);
    }

    logger.error(err);
    return httpError();
  }
};

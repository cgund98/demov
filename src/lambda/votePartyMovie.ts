import {APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import {logger} from '../util/logging';
import {httpError, NotPermitted} from '../util/errors';
import {checkJwt} from '../util/jwt';
import HttpError from '../util/errors/httpError';
import PartyMoviesRepo from '../data/party-movie/repo';
import MembersRepo from '../data/party-member/repo';
import BadRequest from '../util/errors/badRequest';

// Initialize clients
const dynamodb = new DynamoDB.DocumentClient();
const partyMoviesRepo = new PartyMoviesRepo(dynamodb);
const membersRepo = new MembersRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';
  const movieId = event.pathParameters?.movieId || '';

  try {
    // Check parameters
    if (partyId === '' || movieId === '') throw new BadRequest();

    // Parse JWT
    const user = await checkJwt(event);

    // Ensure user is party member
    logger.debug('Checking if user is a party member...');
    if (!(await membersRepo.existsIds(partyId, user.sub))) throw new NotPermitted();

    // Update movie votes
    logger.debug('Fetching movie...');
    const movie = await partyMoviesRepo.getMovieByIds(partyId, movieId);
    movie.score += 1;

    logger.debug('Saving movie...');
    await partyMoviesRepo.save(movie);

    return {
      statusCode: 200,
      body: JSON.stringify(movie),
    };
  } catch (err) {
    if (err instanceof HttpError) {
      return err.serialize();
    }

    logger.error(err);
    return httpError();
  }
};

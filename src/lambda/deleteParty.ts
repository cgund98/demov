import {APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyHandlerV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import MembersRepo from '../data/party-member/repo';
import {Party} from '../data/party/entity';
import PartiesRepo from '../data/party/repo';
import PartyMoviesRepo from '../data/party-movie/repo';
import {httpError, NotPermitted, NotFound} from '../util/errors';
import HttpError from '../util/errors/httpError';
import {checkJwt} from '../util/jwt';
import {logger} from '../util/logging';
import {forEach} from '../util/async';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const partyMoviesRepo = new PartyMoviesRepo(dynamodb);
const membersRepo = new MembersRepo(dynamodb);
const partiesRepo = new PartiesRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';

  if (partyId === undefined) return httpError(400, 'No party ID  given');

  try {
    // Parse JWT
    const user = await checkJwt(event);

    // Ensure user is owner of party
    logger.debug('Verifying ownership...');
    let party: Party;
    try {
      party = await partiesRepo.getPartyById(partyId);
      if (party.ownerId !== user.sub) throw new NotPermitted();
    } catch (err) {
      if (err instanceof NotFound) throw new NotPermitted();
      throw err;
    }

    // Delete all party movies
    logger.debug('Deleting party movies...');
    const movies = await partyMoviesRepo.getMoviesByPartyId(partyId);
    await forEach(movies, async movie => partyMoviesRepo.delete(movie));

    // Delete all party members
    logger.debug('Deleting party members...');
    const members = await membersRepo.getMembersByPartyId(partyId);
    await forEach(members, async member => membersRepo.delete(member));

    // Delete party
    logger.debug('Deleting party...');
    await partiesRepo.delete(party);

    // Return response
    return {
      statusCode: 200,
    };
  } catch (err) {
    if (err instanceof HttpError) {
      return err.serialize();
    }

    logger.error(err);
    return httpError();
  }
};

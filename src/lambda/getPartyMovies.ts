import {APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyHandlerV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import MembersRepo from '../data/party-member/repo';
import PartyMoviesRepo from '../data/party-movie/repo';
import {httpError, NotPermitted} from '../util/errors';
import HttpError from '../util/errors/httpError';
import {checkJwt} from '../util/jwt';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const membersRepo = new MembersRepo(dynamodb);
const partyMoviesRepo = new PartyMoviesRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';

  try {
    // Parse JWT
    const user = await checkJwt(event);

    // Ensure user is in a member of party
    if (!(await membersRepo.existsIds(partyId, user.sub))) throw new NotPermitted();

    // Fetch party movies
    const movies = await partyMoviesRepo.getMoviesByPartyId(partyId);

    // Return response
    return {
      body: JSON.stringify(movies),
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

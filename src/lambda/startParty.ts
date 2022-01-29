import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import {logger} from '../util/logging';
import {httpError, NotPermitted} from '../util/errors';
import {checkJwt} from '../util/jwt';
import PartiesRepo from '../data/party/repo';
import HttpError from '../util/errors/httpError';

// Initialize clients
const dynamodb = new DynamoDB.DocumentClient();
const partiesRepo = new PartiesRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';

  try {
    const user = await checkJwt(event);

    // Fetch party
    const party = await partiesRepo.getPartyById(partyId);

    // Ensure user is party owner
    if (user.sub !== party.ownerId) throw new NotPermitted();

    // Update status
    party.status = 'active';
    await partiesRepo.save(party);

    return {
      statusCode: 200,
      body: JSON.stringify(party),
    };
  } catch (err) {
    if (err instanceof HttpError) {
      return err.serialize();
    }

    logger.error(err);
    return httpError();
  }
};

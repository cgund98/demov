import {APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyHandlerV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import PartiesRepo from '../data/party/repo';
import {httpError} from '../util/errors';
import HttpError from '../util/errors/httpError';
import {checkJwt} from '../util/jwt';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const partiesRepo = new PartiesRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';

  try {
    await checkJwt(event);

    const party = await partiesRepo.getPartyById(partyId);

    return {
      body: JSON.stringify(party),
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

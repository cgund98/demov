import {APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyHandlerV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import MembersRepo from '../data/party-member/repo';
import PartiesRepo from '../data/party/repo';
import {httpError, NotPermitted, NotFound} from '../util/errors';
import HttpError from '../util/errors/httpError';
import {checkJwt} from '../util/jwt';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const membersRepo = new MembersRepo(dynamodb);
const partiesRepo = new PartiesRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';
  const memberId = event.pathParameters?.memberId || '';

  if (partyId === undefined || memberId === undefined) return httpError(400, 'No party ID or member ID given');

  try {
    // Parse JWT
    const user = await checkJwt(event);

    // Ensure user is owner of party or the member being logged out
    try {
      const member = await membersRepo.getMemberByIds(partyId, memberId);

      if (member.memberId !== user.sub) {
        const party = await partiesRepo.getPartyById(partyId);
        if (party.ownerId !== user.sub) throw new NotPermitted();
      }

      await membersRepo.delete(member);
    } catch (err) {
      if (err instanceof NotFound) throw new NotPermitted();
      throw err;
    }

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

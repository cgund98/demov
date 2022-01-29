import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyHandlerV2,
} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import MembersRepo from '../data/party-member/repo';
import {
  NotFound,
  httpError,
  NotAuthenticated,
  NotPermitted,
} from '../util/errors';
import {checkJwt} from '../util/jwt';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const membersRepo = new MembersRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';

  try {
    // Parse JWT
    const user = await checkJwt(event);

    // Fetch members
    const members = await membersRepo.getMembersByPartyId(partyId);

    // Ensure user is in list
    let inMembers = false;
    members.forEach(member => {
      if (member.memberId === user.sub) inMembers = true;
    });
    if (!inMembers) throw new NotPermitted();

    // Return response
    return {
      body: JSON.stringify(members),
      statusCode: 200,
    };
  } catch (err) {
    if (err instanceof NotFound) {
      return httpError(404, err.message);
    }
    if (err instanceof NotAuthenticated) {
      return httpError(401, err.message);
    }
    if (err instanceof NotPermitted) {
      return httpError(403, err.message);
    }

    logger.error(err);

    return httpError(500, 'Internal server error.');
  }
};

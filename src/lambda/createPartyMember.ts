import {APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyHandlerV2} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import MembersRepo from '../data/party-member/repo';
import {Party} from '../data/party/entity';
import PartiesRepo from '../data/party/repo';
import {httpError, HttpError, Conflict} from '../util/errors';
import BadRequest from '../util/errors/badRequest';
import {checkJwt} from '../util/jwt';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const partiesRepo = new PartiesRepo(dynamodb);
const membersRepo = new MembersRepo(dynamodb);

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Parse path parameter
  const partyId = event.pathParameters?.partyId || '';
  const joinCode = event.pathParameters?.joinCode || '';

  try {
    if (partyId === '' && joinCode === '') throw new BadRequest();

    // Parse JWT
    const user = await checkJwt(event);

    // Ensure party exists
    let party: Party;
    if (partyId) party = await partiesRepo.getPartyById(partyId);
    else party = await partiesRepo.getPartyByJoinCode(joinCode);

    // See if member already exists
    if (await membersRepo.existsIds(party.partyId, user.sub)) throw new Conflict();

    // Create new party member
    const now = new Date();
    const member = {
      partyId: party.partyId,
      memberId: user.sub,
      name: user.name,
      joinTime: now.getTime(),
      swiped: 0,
    };
    await membersRepo.save(member);

    // Return response
    return {
      body: JSON.stringify(member),
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

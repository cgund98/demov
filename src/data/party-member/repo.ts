import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoMember, Member} from './entity';
import {MemberMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';

/** This interface extends the base repo interface and will be implemented by our members repository */
interface IMembersRepo extends Repo<Member> {
  getMembersByPartyId(partyId: string): Promise<Member[]>;
  existsIds(partyId: string, memberId: string): Promise<boolean>;
}

// Helper methods
const wrapPk = (partyId: string) => `party#${partyId}#members`;
const wrapSk = (memberId: string) => `party-member#${memberId}`;

/** The members repository persists and fetches objects from our state store */
export default class MembersRepo implements IMembersRepo {
  private dynamodb: DynamoDB.DocumentClient;

  constructor(dynamodb: DynamoDB.DocumentClient) {
    this.dynamodb = dynamodb;
  }

  // Persist a member to DB
  public async save(member: Member): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Item: MemberMapper.toDB(member),
    };

    await this.dynamodb.put(params).promise();
  }

  // Check if a member exists in DB
  public async exists(member: Member): Promise<boolean> {
    return this.existsIds(member.partyId, member.memberId);
  }

  // Check if a member exists in DB
  public async existsIds(partyId: string, memberId: string): Promise<boolean> {
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':partyid': wrapPk(partyId),
        ':memberid': wrapSk(memberId),
      },
      KeyConditionExpression: 'sk = :memberid AND pk = :partyid',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    return data.Count !== 0;
  }

  // Delete a member from DB
  public async delete(member: Member): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: wrapPk(member.partyId),
        sk: wrapSk(member.memberId),
      },
    };

    await this.dynamodb.delete(params).promise();
  }

  // Get all party members for a given party ID
  public async getMembersByPartyId(partyId: string): Promise<Member[]> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':partyid': wrapPk(partyId),
      },
      KeyConditionExpression: 'pk = :partyid',
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no member found
    if (data.Items === undefined) throw new NotFound(partyId);

    // Map from DB format
    return data.Items.map(item => MemberMapper.fromDB(item as DynamoMember));
  }
}

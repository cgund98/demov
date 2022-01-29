import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoMember, Member} from './entity';
import {MemberMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';

/** This interface extends the base repo interface and will be implemented by our members repository */
interface IMembersRepo extends Repo<Member> {
  getMemberById(memberId: string, partyId: string): Promise<Member>;
}

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
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':partyid': `party#${member.partyId}`,
        ':memberid': `party-member#${member.memberId}`,
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
        pk: `party#${member.partyId}`,
        sk: `party-member#${member.memberId}`,
      },
    };

    await this.dynamodb.delete(params).promise();
  }

  // Get a member by its ID from DB
  public async getMemberById(
    memberId: string,
    partyId: string,
  ): Promise<Member> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':partyid': `party#${partyId}`,
        ':memberid': `party-member#${memberId}`,
      },
      KeyConditionExpression: 'sk = :memberid AND pk = :partyid',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no member found
    if (data.Items === undefined || data.Count === 0)
      throw new NotFound(memberId);

    // Map from DB format
    return MemberMapper.fromDB(data.Items[0] as DynamoMember);
  }
}

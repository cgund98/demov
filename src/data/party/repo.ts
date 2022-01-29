import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoParty, Party} from './entity';
import {PartyMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';

/** This interface extends the base repo interface and will be implemented by our partys repository */
interface IPartiesRepo extends Repo<Party> {
  getPartyById(partyId: string): Promise<Party>;
  joinCodeExists(joinCode: string): Promise<boolean>;
}

/** The partys repository persists and fetches objects from our state store */
export default class PartiesRepo implements IPartiesRepo {
  private dynamodb: DynamoDB.DocumentClient;

  constructor(dynamodb: DynamoDB.DocumentClient) {
    this.dynamodb = dynamodb;
  }

  // Persist a party to DB
  public async save(party: Party): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Item: PartyMapper.toDB(party),
    };

    await this.dynamodb.put(params).promise();
  }

  // Check if a party exists in DB
  public async exists(party: Party): Promise<boolean> {
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':start': `join-code#`,
        ':id': `party#${party.partyId}`,
      },
      KeyConditionExpression: 'pk = :id AND begin_with(sk, :start)',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    return data.Count !== 0;
  }

  // Check if a party exists in DB
  public async joinCodeExists(joinCode: string): Promise<boolean> {
    const params = {
      TableName: DYNAMO_TABLE,
      IndexName: 'GSI-1',
      ExpressionAttributeValues: {
        ':id': `join-code#${joinCode}`,
      },
      KeyConditionExpression: 'sk = :id',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    return data.Count !== 0;
  }

  // Delete a party from DB
  public async delete(party: Party): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: `party#${party.partyId}`,
      },
      ExpressionAttributeValues: {
        ':start': `join-code#`,
      },
      KeyConditionExpression: ':id begin_with(sk, :start)',
      Limit: 1,
    };

    await this.dynamodb.delete(params).promise();
  }

  // Get a party by its ID from DB
  public async getPartyById(partyId: string): Promise<Party> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':start': `join-code#`,
        ':id': `party#${partyId}`,
      },
      KeyConditionExpression: 'pk = :id AND begin_with(sk, :start)',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no party found
    if (data.Items === undefined || data.Count === 0)
      throw new NotFound(partyId);

    // Map from DB format
    return PartyMapper.fromDB(data.Items[0] as DynamoParty);
  }
}

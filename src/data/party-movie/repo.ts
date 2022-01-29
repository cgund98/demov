import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoPartyMovie, PartyMovie} from './entity';
import {PartyMovieMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';

/** This interface extends the base repo interface and will be implemented by our movies repository */
interface IPartyMoviesRepo extends Repo<PartyMovie> {
  getPartyMovieById(movieId: string, partyId: string): Promise<PartyMovie>;
  saveBatch(movies: PartyMovie[]): Promise<void>;
}

/** The movies repository persists and fetches objects from our state store */
export default class PartyMoviesRepo implements IPartyMoviesRepo {
  private dynamodb: DynamoDB.DocumentClient;

  constructor(dynamodb: DynamoDB.DocumentClient) {
    this.dynamodb = dynamodb;
  }

  // Persist a movie to DB
  public async save(movie: PartyMovie): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Item: PartyMovieMapper.toDB(movie),
    };

    await this.dynamodb.put(params).promise();
  }

  // Persist an array of movies to DB
  public async saveBatch(movies: PartyMovie[]): Promise<void> {
    const req = movies.map(movie => ({
      PutRequest: {
        Item: PartyMovieMapper.toDB(movie),
      },
    }));

    const params = {
      RequestItems: {
        [DYNAMO_TABLE]: req,
      },
    };

    await this.dynamodb.batchWrite(params).promise();
  }

  // Check if a movie exists in DB
  public async exists(movie: PartyMovie): Promise<boolean> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: `party#${movie.partyId}`,
        sk: `movie#${movie.movieId}`,
      },
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    return data.Count !== 0;
  }

  // Delete a movie from DB
  public async delete(movie: PartyMovie): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: `party#${movie.partyId}`,
        sk: `movie#${movie.movieId}`,
      },
    };

    await this.dynamodb.delete(params).promise();
  }

  // Get a movie by its ID from DB
  public async getPartyMovieById(
    movieId: string,
    partyId: string,
  ): Promise<PartyMovie> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':partyid': `party#${partyId}`,
        ':movieid': `movie#${movieId}`,
      },
      KeyConditionExpression: 'sk = :movieid AND pk = :partyid',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no movie found
    if (data.Items === undefined || data.Count === 0)
      throw new NotFound(movieId);

    // Map from DB format
    return PartyMovieMapper.fromDB(data.Items[0] as DynamoPartyMovie);
  }
}

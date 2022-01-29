import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoPartyMovie, PartyMovie} from './entity';
import {PartyMovieMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';
import {forEach} from '../../util/async';

// Helper methods
const wrapPk = (movieId: string) => `party-movie#${movieId}`;
const wrapSk = (partyId: string) => `party#${partyId}#movies`;

/** This interface extends the base repo interface and will be implemented by our movies repository */
interface IPartyMoviesRepo extends Repo<PartyMovie> {
  getMoviesByPartyId(partyId: string): Promise<PartyMovie[]>;
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
    // Split movies into chunks, as size limit for a batch is 25
    let i = 0;
    const j = movies.length;
    const chunkSize = 24;
    const chunks: PartyMovie[][] = [];
    while (i < j) {
      chunks.push(movies.slice(i, i + chunkSize));

      i += chunkSize;
    }

    // Batch save each chunk
    await forEach(chunks, async chunk => {
      const req = chunk.map(movie => ({
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
    });
  }

  // Check if a movie exists in DB
  public async exists(movie: PartyMovie): Promise<boolean> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: wrapPk(movie.movieId),
        sk: wrapSk(movie.partyId),
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
        pk: wrapPk(movie.movieId),
        sk: wrapSk(movie.partyId),
      },
    };

    await this.dynamodb.delete(params).promise();
  }

  // Get all party movies for a given party ID
  public async getMoviesByPartyId(partyId: string): Promise<PartyMovie[]> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      IndexName: 'GSI-1',
      KeyConditionExpression: 'sk = :id',
      ExpressionAttributeValues: {
        ':id': wrapSk(partyId),
      },
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no member found
    if (data.Items === undefined) throw new NotFound(partyId);

    // Map from DB format
    return data.Items.map(item =>
      PartyMovieMapper.fromDB(item as DynamoPartyMovie),
    );
  }
}

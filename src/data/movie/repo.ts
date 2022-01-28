import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoMovie, Movie} from './entity';
import {MovieMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';

/** Options to specify when attempting to fetch a random movie */
export interface RandomMovieOpts {
  minReleaseDate: Date | null;
  minRating: number | null;
}

/** This interface extends the base repo interface and will be implemented by our movies repository */
interface IMoviesRepo extends Repo<Movie> {
  getMovieById(movieId: string): Promise<Movie>;
  getMovieByImdbId(movieId: string): Promise<Movie>;
  getRandomMovie(opts: RandomMovieOpts): Promise<Movie>;
}

/** The movies repository persists and fetches objects from our state store */
export default class MoviesRepo implements IMoviesRepo {
  private dynamodb: DynamoDB.DocumentClient;

  constructor(dynamodb: DynamoDB.DocumentClient) {
    this.dynamodb = dynamodb;
  }

  // Persist a movie to DB
  public async save(movie: Movie): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Item: MovieMapper.toDB(movie),
    };

    await this.dynamodb.put(params).promise();
  }

  // Check if a movie exists in DB
  public async exists(movie: Movie): Promise<boolean> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: `movie#${movie.movieId}`,
      },
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    return data.Count === 0;
  }

  // Delete a movie from DB
  public async delete(movie: Movie): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Key: {
        pk: `movie#${movie.movieId}`,
      },
    };

    await this.dynamodb.delete(params).promise();
  }

  // Get a movie by its ID from DB
  public async getMovieById(movieId: string): Promise<Movie> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      ExpressionAttributeValues: {
        ':id': `movie#${movieId}`,
      },
      KeyConditionExpression: 'pk = :id',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no movie found
    if (data.Items === undefined || data.Count === 0)
      throw new NotFound(movieId);

    // Map from DB format
    return MovieMapper.fromDB(data.Items[0] as DynamoMovie);
  }

  // Get a movie by its IMDb ID from DB
  public async getMovieByImdbId(imdbId: string): Promise<Movie> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      IndexName: 'GSI-1',
      ExpressionAttributeValues: {
        ':id': `imdb#${imdbId}`,
      },
      KeyConditionExpression: 'sk = :id',
      Limit: 1,
    };

    const data = await this.dynamodb.query(params).promise();

    // Throw error if no movie found
    if (data.Items === undefined || data.Count === 0)
      throw new NotFound(imdbId);

    // Map from DB format
    return MovieMapper.fromDB(data.Items[0] as DynamoMovie);
  }

  // Get a random movie from DB
  public async getRandomMovie(opts: RandomMovieOpts): Promise<Movie> {
    throw new Error('Not yet implemeneted');
  }
}

import {DynamoDB} from 'aws-sdk';

import {Repo} from '../repo';
import {DynamoMovie, Movie} from './entity';
import {MovieMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';

/** Options to specify when attempting to fetch a random movie */
export interface RandomMovieOpts {
  minReleaseDate: Date | null;
  minRating: number | null;
}

/** This interface extends the base repo interface and will be implemented by our movies repository */
interface IMoviesRepo extends Repo<Movie> {
  getMovieById(movieId: string): Promise<Movie>;
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
    };

    await this.dynamodb.get(params).promise();
    return true;
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
      Key: {
        pk: `movie#${movieId}`,
      },
    };

    const data = await this.dynamodb.get(params).promise();

    // Map from DB format
    return MovieMapper.fromDB(data.Item as DynamoMovie);
  }

  // Get a random movie from DB
  public async getRandomMovie(opts: RandomMovieOpts): Promise<Movie> {
    throw new Error('Not yet implemeneted');
  }
}

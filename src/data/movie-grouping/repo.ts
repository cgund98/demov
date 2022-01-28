import {DynamoDB} from 'aws-sdk';

import {DynamoMovieGrouping, MovieGrouping} from './entity';
import {MovieGroupingMapper} from './mapper';
import {DYNAMO_TABLE} from '../../util/config';
import {NotFound} from '../../util/errors';

/** This interface extends the base repo interface and will be implemented by our movies repository */
interface IMovieGroupsRepo {
  getMovieGroup: (
    genre: string,
    ratingTrunc: number,
    minYear: number,
    maxYear: number,
  ) => Promise<MovieGrouping[]>;
}

/** The movies repository persists and fetches objects from our state store */
export default class MovieGroupsRepo implements IMovieGroupsRepo {
  private dynamodb: DynamoDB.DocumentClient;

  constructor(dynamodb: DynamoDB.DocumentClient) {
    this.dynamodb = dynamodb;
  }

  // Persist a movie grouping to DB
  public async save(grouping: MovieGrouping): Promise<void> {
    const params = {
      TableName: DYNAMO_TABLE,
      Item: MovieGroupingMapper.toDB(grouping),
    };

    await this.dynamodb.put(params).promise();
  }

  // Get a group of movies based on genre, rating, and a range of years
  public async getMovieGroup(
    genre: string,
    ratingTrunc: number,
    minYear: number,
    maxYear: number,
  ): Promise<MovieGrouping[]> {
    // Query DB
    const params = {
      TableName: DYNAMO_TABLE,
      IndexName: 'GSI-1',
      KeyConditionExpression: 'sk = :id AND sk2 BETWEEN :minYear and :maxYear',
      ExpressionAttributeValues: {
        ':id': `movie-group#${genre}#${ratingTrunc}`,
        ':minYear': minYear,
        ':maxYear': maxYear,
      },
    };

    const data = await this.dynamodb.query(params).promise();

    // If items are undefined, throw error.
    if (data.Items === undefined)
      throw new NotFound(
        `movie-group#${genre}#${ratingTrunc}, year BETWEEN ${minYear} and ${maxYear}`,
        'group',
      );

    // Map from DB format
    const movies = data.Items?.map(item =>
      MovieGroupingMapper.fromDB(item as DynamoMovieGrouping),
    );

    return movies;
  }
}

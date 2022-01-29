import {DynamoEntity} from '../entity';

/**
 * MovieGrouping is an entity representing a feature film.
 */
export interface MovieGrouping {
  movieId: string;
  year: number;
  genre: string;
  ratingTrunc: number;
}

/**
 * DynamoMovieGrouping is the format in which a MovieGrouping object will be persisted in DynamoDB.
 */
export type DynamoMovieGrouping = DynamoEntity;

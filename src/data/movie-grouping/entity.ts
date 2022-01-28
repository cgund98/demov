import {DynamoEntity} from '../entity';

/**
 * Movie is an entity representing a feature film.
 */
export interface MovieGrouping {
  movieId: string;
  year: number;
  genre: string;
  ratingTrunc: number;
}

/**
 * DynamoMovie is the format in which a Movie object will be persisted in DynamoDB.
 */
export type DynamoMovieGrouping = DynamoEntity;

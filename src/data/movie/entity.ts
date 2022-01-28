import {DynamoEntity} from '../entity';

/**
 * Movie is an entity representing a feature film.
 */
export interface Movie {
  movieId: string;
  imdbId: string;
  year: number;
  title: string;
  director: string;
  stars: string;
  runtime: string;
  ratings: {
    metascore: string;
    imdb: string;
  };
  plot: string;
  imageUrlHR: string;
  imageUrlLR: string;
}

/**
 * DynamoMovie is the format in which a Movie object will be persisted in DynamoDB.
 */
export interface DynamoMovie extends DynamoEntity {
  title: string;
  director: string;
  stars: string;
  runtime: string;
  ratings: {
    metascore: string;
    imdb: string;
  };
  plot: string;
  imageUrlHR: string;
  imageUrlLR: string;
}

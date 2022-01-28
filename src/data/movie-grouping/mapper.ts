import {Mapper} from '../mapper';
import {MovieGrouping, DynamoMovieGrouping} from './entity';

/**
 * MovieGroupingMapper maps movie objects between state store and logical formats.
 */
export const MovieGroupingMapper: Mapper<
  MovieGrouping,
  DynamoMovieGrouping
> = class {
  // Convert to state store format
  public static toDB(movie: MovieGrouping): DynamoMovieGrouping {
    return {
      pk: `movie#${movie.movieId}`,
      sk: `movie-group#${movie.genre}#${movie.ratingTrunc}`,
      sk2: movie.year,
    };
  }

  // Convert from state store format
  public static fromDB(dyMovieGrouping: DynamoMovieGrouping): MovieGrouping {
    return {
      movieId: dyMovieGrouping.pk.split('#')[1],
      genre: dyMovieGrouping.sk.split('#')[1],
      ratingTrunc: parseFloat(dyMovieGrouping.sk.split('#')[2]),
      year: dyMovieGrouping.sk2,
    };
  }
};

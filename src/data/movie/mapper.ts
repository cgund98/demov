import {Movie, DynamoMovie} from './entity';

/**
 * MovieMapper maps movie objects between state store and logical formats.
 */
export class MovieMapper {
  // Convert to state store format
  public static toDB(movie: Movie): DynamoMovie {
    return {
      pk: `movie#${movie.movieId}`,
      sk: `imdb#${movie.imdbId}`,
      sk2: movie.year,
      title: movie.title,
      director: movie.director,
      stars: movie.stars,
      imageUrlHR: movie.imageUrlHR,
      imageUrlLR: movie.imageUrlLR,
      ratings: movie.ratings,
      runtime: movie.runtime,
      plot: movie.plot,
    };
  }

  // Convert from state store format
  public static fromDB(dyMovie: DynamoMovie): Movie {
    return {
      movieId: dyMovie.pk.split('#')[1],
      imdbId: dyMovie.sk.split('#')[1],
      year: dyMovie.sk2,
      ratings: dyMovie.ratings,
      title: dyMovie.title,
      director: dyMovie.director,
      stars: dyMovie.stars,
      imageUrlHR: dyMovie.imageUrlHR,
      imageUrlLR: dyMovie.imageUrlLR,
      runtime: dyMovie.runtime,
      plot: dyMovie.plot,
    };
  }
}

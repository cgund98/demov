import {DynamoDB} from 'aws-sdk';

import {Movie} from '../data/movie/entity';
import {MovieGrouping} from '../data/movie-grouping/entity';
import MoviesRepo from '../data/movie/repo';
import MovieGroupsRepo from '../data/movie-grouping/repo';
import {logger} from '../util/logging';
import {forEach} from '../util/async';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const moviesRepo = new MoviesRepo(dynamodb);
const moviesGroupsRepo = new MovieGroupsRepo(dynamodb);

// Constants
const startYear = 1980;
const endYear = 2020;

// Interfaces
interface MovieProc {
  movieId: string;
  year: number;
  genres: string[];
  rating: number;
}

// Fetch movies from DB for all valid years
const fetchMovies = async (): Promise<Movie[]> => {
  // Create range of years
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year += 1) years.push(year);

  // Fetch movies from DB
  const movieChunks = await Promise.all(
    years.map(async year => moviesRepo.getMoviesByYear(year)),
  );

  // Flatten array
  const allMovies: Movie[] = ([] as Movie[]).concat(...movieChunks);

  return allMovies;
};

// Process movies into new format
const procMovies = (movies: Movie[]): MovieProc[] =>
  movies.map(movie => ({
    movieId: movie.movieId,
    year: movie.year,
    genres: movie.genres.toLowerCase().split(', '),
    rating: parseFloat(movie.ratings.imdb),
  }));

// Group movies by their genre and rating (truncated)
const groupMovies = (movies: MovieProc[]): MovieGrouping[] => {
  const grouped: MovieGrouping[] = [];

  movies.forEach(movie => {
    movie.genres.forEach(genre => {
      grouped.push({
        movieId: movie.movieId,
        year: movie.year,
        ratingTrunc: Math.trunc(movie.rating),
        genre,
      });
    });
  });

  return grouped;
};

// Lambda handler
export const handler = async (): Promise<void> => {
  try {
    // Fetch movies from DB
    logger.info('Fetching movies...');
    const movies = await fetchMovies();
    logger.info(`Fetched ${movies.length} movies.`);

    // Reformat movies
    logger.info('Reformatting movies...');
    const proced = procMovies(movies);

    // Group movies
    logger.info('Grouping movies...');
    const grouped = groupMovies(proced);

    // Persist in DB
    logger.info('Saving groups...');
    await forEach(grouped, async grouping => {
      await moviesGroupsRepo.save(grouping);
    });
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

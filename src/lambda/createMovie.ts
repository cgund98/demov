import {SQSEvent, SQSHandler} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';
import {v4} from 'uuid';

import MoviesRepo from '../data/movie/repo';
import {forEach} from '../util/async';
import {NotFound} from '../util/errors';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const moviesRepo = new MoviesRepo(dynamodb);

// Define interfaces
interface Input {
  imdbId: string;
  year: number;
  title: string;
  director: string;
  genres: string;
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

// Create individual Movie
const createMovie = async (inp: Input) => {
  // Check that movie does not already exist, skip if it does
  try {
    await moviesRepo.getMovieByImdbId(inp.imdbId);
    return;
  } catch (err) {
    if (!(err instanceof NotFound)) {
      throw err;
    }
  }

  // Create new movie
  const movie = {
    movieId: v4(),
    ...inp,
  };

  await moviesRepo.save(movie);
};

// Lambda handler
export const handler: SQSHandler = async (event: SQSEvent) => {
  try {
    await forEach(event.Records, async record => {
      // Fetch additional data
      const inp = JSON.parse(record.body) as Input;
      await createMovie(inp);
    });
  } catch (err) {
    logger.error(`Error occured: ${err as string}`);
    throw err;
  }
};

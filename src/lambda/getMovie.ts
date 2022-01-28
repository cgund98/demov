import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyHandlerV2,
} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';

import MoviesRepo from '../data/movie/repo';
import {NotFound, httpError} from '../util/errors';
import {logger} from '../util/logging';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const moviesRepo = new MoviesRepo(dynamodb);

// Lambda handler
export const movieIdHandler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  console.log(`Message received. ${event.rawPath}`);

  const movieId = event.pathParameters?.movieId || '';

  try {
    const movie = await moviesRepo.getMovieById(movieId);
    return {
      body: JSON.stringify(movie),
      statusCode: 200,
    };
  } catch (err) {
    if (err instanceof NotFound) {
      return httpError(404, err.message);
    }

    logger.error(err);

    return httpError(500, 'Internal server error.');
  }
};

// Lambda handler
export const imdbIdHandler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  console.log(`Message received. ${event.rawPath}`);

  const imdbId = event.pathParameters?.imdbId || '';

  try {
    const movie = await moviesRepo.getMovieByImdbId(imdbId);
    return {
      body: JSON.stringify(movie),
      statusCode: 200,
    };
  } catch (err) {
    if (err instanceof NotFound) {
      return httpError(404, err.message);
    }

    logger.error(err);

    return httpError(500, 'Internal server error.');
  }
};

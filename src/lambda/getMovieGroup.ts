import {DynamoDB} from 'aws-sdk';
import {APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2} from 'aws-lambda';

import MovieGroupsRepo from '../data/movie-grouping/repo';
import {logger} from '../util/logging';
import {httpError} from '../util/errors';
import HttpError from '../util/errors/httpError';
import {checkJwt} from '../util/jwt';

// Init clients
const dynamodb = new DynamoDB.DocumentClient();
const movieGroupsRepo = new MovieGroupsRepo(dynamodb);

// Interfaces
interface QParams {
  genre: string;
  ratingTrunc: number;
  minYear: number;
  maxYear: number;
}

// Validate query parameters
const validateParams = (event: APIGatewayProxyEventV2): string => {
  if (event.queryStringParameters === undefined)
    return 'No query parameters given.  Required: [genre, ratingTrunc, minYear, maxYear]';

  const query = event.queryStringParameters;

  // Validate genre
  if (query.genre === undefined || query.genre === '') return 'No genre specified';

  // Validate ratingTrunc
  let exists = query.ratingTrunc !== undefined;
  if (!exists || Number.isNaN(parseInt(query.ratingTrunc || '', 10)))
    return `Invalid ratingTrunc: '${query.ratingTrunc || ''}'`;

  // Validate minYear
  exists = query.minYear !== undefined;
  if (!exists || Number.isNaN(parseInt(query.minYear || '', 10))) return `Invalid minYear: '${query.minYear || ''}'`;

  // Validate maxYear
  exists = query.maxYear !== undefined;
  if (!exists || Number.isNaN(parseInt(query.maxYear || '', 10))) return `Invalid maxYear: '${query.maxYear || ''}'`;

  return '';
};

// Read query parameters
const readParams = (event: APIGatewayProxyEventV2): QParams => {
  const query = event.queryStringParameters;

  if (query === undefined) throw new Error('Bad query validation');

  const genre = query.genre || '';
  const ratingTrunc = parseInt(query.ratingTrunc || '', 10);
  const minYear = parseInt(query.minYear || '', 10);
  const maxYear = parseInt(query.maxYear || '', 10);

  return {
    genre,
    ratingTrunc,
    minYear,
    maxYear,
  };
};

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Validate query parameters
  const validation = validateParams(event);
  if (validation !== '') return httpError(400, validation);

  // Load query parameters
  const {genre, ratingTrunc, minYear, maxYear} = readParams(event);

  try {
    await checkJwt(event);

    const group = await movieGroupsRepo.getMovieGroup(genre, ratingTrunc, minYear, maxYear);

    return {
      statusCode: 200,
      body: JSON.stringify(group),
    };
  } catch (err) {
    if (err instanceof HttpError) {
      return err.serialize();
    }

    logger.error(err);
    return httpError();
  }
};

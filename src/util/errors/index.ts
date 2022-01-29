import {APIGatewayProxyResultV2} from 'aws-lambda';

/**
 * httpError generates an API HTTP error response.
 */
export const httpError = (
  code = 500,
  message = 'Internal Server Error',
): APIGatewayProxyResultV2 => ({
  statusCode: code,
  body: JSON.stringify({message}),
});

// Export other errors
export {default as NotAuthenticated} from './notAuthenticated';
export {default as NotFound} from './notFound';
export {default as NotPermitted} from './notPermitted';

import {APIGatewayProxyResultV2} from 'aws-lambda';

/**
 * NotFound exception is thrown when an object cannot be found.
 */
export class NotFound extends Error {
  constructor(value: string, field = 'ID') {
    const msg = `No object could be found for given ${field}: '${value}'`;
    super(msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotFound.prototype);
  }
}

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

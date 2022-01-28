import {APIGatewayProxyResultV2} from 'aws-lambda';

/**
 * NotFound exception is thrown when an object cannot be found
 * for it's given id.
 */
export class NotFound extends Error {
  constructor(id: string) {
    const msg = `No object could be found for given ID: '${id}'`;
    super(msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotFound.prototype);
  }
}

/**
 * httpError generates an API HTTP error response.
 */
export const httpError = (
  code: number,
  message: string,
): APIGatewayProxyResultV2 => ({
  statusCode: code,
  body: JSON.stringify({message}),
});

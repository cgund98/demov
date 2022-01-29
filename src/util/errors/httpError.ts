import {APIGatewayProxyResultV2} from 'aws-lambda';

/**
 * Base error class used for throwing HTTP errors
 */
export default class HttpError extends Error {
  private code: number;

  constructor(code: number, msg: string) {
    super(msg);

    this.code = code;

    // set prototype excplicitly
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  // Serialize the error into an API response
  public serialize(): APIGatewayProxyResultV2 {
    return {
      statusCode: this.code,
      body: JSON.stringify({message: this.message}),
    };
  }
}

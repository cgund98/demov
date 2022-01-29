import HttpError from './httpError';

/**
 * BadRequest exception is thrown when an object cannot be found.
 */
export default class BadRequest extends HttpError {
  constructor(msg = 'Bad Request') {
    super(400, msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, BadRequest.prototype);
  }
}

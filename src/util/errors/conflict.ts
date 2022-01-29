import HttpError from './httpError';

/**
 * Conflict exception is thrown when an object cannot be found.
 */
export default class Conflict extends HttpError {
  constructor(msg = 'Resource already exists.') {
    super(409, msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, Conflict.prototype);
  }
}

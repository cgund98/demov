import HttpError from './httpError';

/**
 * NotFound exception is thrown when an object cannot be found.
 */
export default class NotFound extends HttpError {
  constructor(value: string, field = 'ID') {
    const msg = `No object could be found for given ${field}: '${value}'`;
    super(404, msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotFound.prototype);
  }
}

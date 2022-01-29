import HttpError from './httpError';

/**
 * NotAuthenticated exception is thrown when a user cannot be logged in.
 * This is likely due to an invalid JWT.
 */
export default class NotAuthenticated extends HttpError {
  constructor(msg = 'User is not authenticated') {
    super(401, msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotAuthenticated.prototype);
  }
}

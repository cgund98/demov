import HttpError from './httpError';

/**
 * NotPermitted exception is thrown when a user does not have the
 * necessary permissions to perform a task.
 */
export default class NotPermitted extends HttpError {
  constructor(
    msg = 'User does not have necessary permission to complete this task.',
  ) {
    super(403, msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotPermitted.prototype);
  }
}

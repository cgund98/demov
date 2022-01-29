/**
 * NotPermitted exception is thrown when a user does not have the
 * necessary permissions to perform a task.
 */
export default class NotPermitted extends Error {
  constructor() {
    const msg = `User does not have necessary permission to complete this task.`;
    super(msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotPermitted.prototype);
  }
}

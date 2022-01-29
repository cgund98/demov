/**
 * NotAuthenticated exception is thrown when a user cannot be logged in.
 * This is likely due to an invalid JWT.
 */
export default class NotAuthenticated extends Error {
  constructor() {
    const msg = `User is not authenticated`;
    super(msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotAuthenticated.prototype);
  }
}

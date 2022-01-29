/**
 * NotFound exception is thrown when an object cannot be found.
 */
export default class NotFound extends Error {
  constructor(value: string, field = 'ID') {
    const msg = `No object could be found for given ${field}: '${value}'`;
    super(msg);

    // set prototype excplicitly
    Object.setPrototypeOf(this, NotFound.prototype);
  }
}

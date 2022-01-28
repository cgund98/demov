/** A mapper maps between data store and logical representations of object */
export interface Mapper<T, D> {
  toDB: (imdt: T) => D;
  fromDB: (db: D) => T;
}

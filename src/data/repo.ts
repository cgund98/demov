/** Repo is a general interface for a Repository pattern */
export interface Repo<T> {
  exists(t: T): Promise<boolean>;
  delete(t: T): Promise<void>;
  save(t: T): Promise<void>;
}

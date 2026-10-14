/**
 * Runs `work` atomically: either every write made through the handed repositories commits, or
 * none does. Mutation use cases write the entity and its audit row inside one unit (BR-11, NFR-09).
 */
export interface UnitOfWork<Repos> {
  run<T>(work: (repos: Repos) => Promise<T>): Promise<T>
}

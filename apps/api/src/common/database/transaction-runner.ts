import type { Db, DbExecutor } from '@sryg/db'

/**
 * Runs `work` atomically: either every write made through the handed repositories commits, or none
 * does. Mutations write the entity and its audit row inside one run (BR-11, NFR-09). Each run opens
 * one Postgres transaction and builds the repositories bound to it.
 */
export class TransactionRunner<Repos> {
  constructor(
    private readonly db: Db,
    private readonly createRepos: (tx: DbExecutor) => Repos,
  ) {}

  run<T>(work: (repos: Repos) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(this.createRepos(tx)))
  }
}

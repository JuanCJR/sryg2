import type { Db, DbExecutor } from '@sryg/db'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'

/** Opens one Postgres transaction per run and builds the repositories bound to it. */
export class DrizzleUnitOfWork<Repos> implements UnitOfWork<Repos> {
  constructor(
    private readonly db: Db,
    private readonly createRepos: (tx: DbExecutor) => Repos,
  ) {}

  run<T>(work: (repos: Repos) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(this.createRepos(tx)))
  }
}

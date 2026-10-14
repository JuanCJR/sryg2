import { ACCESS_LOG_LIMIT, type AccessLog } from '@sryg/types'
import type { AccessLogReader, AccessLogRecord } from '../domain/access-log'

const toEntry = ({ at, ip }: AccessLogRecord) => ({ at: at.toISOString(), ip })

export class GetAccessLogUseCase {
  constructor(private readonly reader: AccessLogReader) {}

  /** D23: the latest successful and failed logins of the signed-in user. */
  async execute(userId: string): Promise<AccessLog> {
    const [successful, failed] = await Promise.all([
      this.reader.latest(userId, true, ACCESS_LOG_LIMIT),
      this.reader.latest(userId, false, ACCESS_LOG_LIMIT),
    ])
    return { successful: successful.map(toEntry), failed: failed.map(toEntry) }
  }
}

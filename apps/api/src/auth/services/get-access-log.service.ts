import { ACCESS_LOG_LIMIT, type AccessLog } from '@sryg/types'
import type { AccessLogRecord } from '../dtos/access-log.dto'
import type { AccessLogRepository } from '../repositories/access-log.repository'

const toEntry = ({ at, ip }: AccessLogRecord) => ({ at: at.toISOString(), ip })

export class GetAccessLogService {
  constructor(private readonly reader: AccessLogRepository) {}

  /** D23: the latest successful and failed logins of the signed-in user. */
  async execute(userId: string): Promise<AccessLog> {
    const [successful, failed] = await Promise.all([
      this.reader.latest(userId, true, ACCESS_LOG_LIMIT),
      this.reader.latest(userId, false, ACCESS_LOG_LIMIT),
    ])
    return { successful: successful.map(toEntry), failed: failed.map(toEntry) }
  }
}

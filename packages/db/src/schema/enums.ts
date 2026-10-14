import { pgEnum } from 'drizzle-orm/pg-core'
import {
  AUDIT_ACTIONS,
  BLOCK_STATUSES,
  BLOCK_TYPES,
  BLOOD_TYPES,
  CREDENTIAL_STATUSES,
  PERSONNEL_STATUSES,
  RAV60_CATEGORIES,
  RAV67_CLASSES,
  ROLES,
} from '@sryg/types'

export const userRole = pgEnum('user_role', ROLES)
export const credentialStatus = pgEnum('credential_status', CREDENTIAL_STATUSES)
export const rav60Category = pgEnum('rav60_category', RAV60_CATEGORIES)
export const rav67Class = pgEnum('rav67_class', RAV67_CLASSES)
export const personnelStatus = pgEnum('personnel_status', PERSONNEL_STATUSES)
export const bloodType = pgEnum('blood_type', BLOOD_TYPES)
export const blockType = pgEnum('block_type', BLOCK_TYPES)
export const blockStatus = pgEnum('block_status', BLOCK_STATUSES)
export const auditAction = pgEnum('audit_action', AUDIT_ACTIONS)

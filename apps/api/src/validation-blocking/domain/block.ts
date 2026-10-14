import type { BlockStatus, BlockType } from '@sryg/types'

export const BLOCK_ENTITY = 'bloqueo'

/** The user performing a mutation; access was already checked by the permission guard. */
export interface Actor {
  id: string
}

export interface UserRef {
  id: string
  fullName: string
}

export interface Block {
  id: string
  personalId: string
  person: { cedula: string; firstNames: string; lastNames: string }
  type: BlockType
  reason: string
  status: BlockStatus
  createdBy: UserRef
  createdAt: Date
  resolvedBy: UserRef | null
  resolvedAt: Date | null
  resolutionNote: string | null
  updatedAt: Date
}

/** A block is always registered active (BR-07); its resolution is a separate step (BR-08). */
export interface NewBlock {
  personalId: string
  type: BlockType
  reason: string
}

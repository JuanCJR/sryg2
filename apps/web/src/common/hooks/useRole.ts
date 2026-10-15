import { useContext } from 'react'
import { RoleContext } from '../utils/role-context'

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return ctx
}

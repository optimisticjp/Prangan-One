import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useBusiness } from '../../lib/business/store'

export function BusinessFinanceGate({ children }: { children: ReactNode }) {
  const { isStaff } = useBusiness()
  if (isStaff) return <Navigate to="/business" replace />
  return <>{children}</>
}

export function BusinessTeamGate({ children }: { children: ReactNode }) {
  const { canManageTeam, isStaff } = useBusiness()
  if (!canManageTeam && !isStaff) return <Navigate to="/business" replace />
  return <>{children}</>
}

export function BusinessStaffOnlyGate({ children }: { children: ReactNode }) {
  const { isStaff } = useBusiness()
  if (!isStaff) return <Navigate to="/business/staff" replace />
  return <>{children}</>
}

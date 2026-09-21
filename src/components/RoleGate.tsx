import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useData } from '../lib/store'
import type { Role } from '../lib/types'

const residentRoles: Role[] = ['resident_owner', 'resident_tenant']

export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { session } = useData()
  const loginPath = allow.every(role => residentRoles.includes(role)) ? '/user-login' : '/admin-login'
  if (!session.role) return <Navigate to={loginPath} replace />
  if (!allow.includes(session.role)) return <Navigate to="/403" replace />
  return <>{children}</>
}

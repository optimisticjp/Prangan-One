import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useData } from '../lib/store'
import type { Role } from '../lib/types'

/**
 * UX-only routing guard. Real access control happens in Supabase RLS,
 * see supabase/schema.sql - this never was and isn't meant to be real
 * security, it just keeps someone from landing on a screen that doesn't
 * apply to their role. Not logged in at all goes back to the login
 * screen; logged in with the wrong role for this route goes to a real
 * 403 page instead, since those are different situations worth telling
 * apart rather than silently bouncing both to the same place.
 */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { session } = useData()
  if (!session.role) return <Navigate to="/login" replace />
  if (!allow.includes(session.role)) return <Navigate to="/403" replace />
  return <>{children}</>
}

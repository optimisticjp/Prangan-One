// Role access matrix - deny by default. This mirrors what Supabase RLS
// will enforce server-side later (see supabase/schema.sql). In the demo
// it only shapes the UI; it is NOT real security. Frontend gates are UX
// only - the roadmap doc says this explicitly, and it's correct.
import type { DocPermission, Role, TenantAccessMode } from './types'

export const roleLabel: Record<Role, string> = {
  owner: 'Prangan One ઓનર',
  society_admin: 'સોસાયટી એડમિન',
  committee_member: 'કમિટી સભ્ય',
  accountant: 'એકાઉન્ટન્ટ',
  resident_owner: 'રહેવાસી (માલિક)',
  resident_tenant: 'રહેવાસી (ભાડૂત)',
  auditor: 'ઓડિટર (માત્ર જોવા માટે)',
}

// Where a real, resolved login lands someone - see src/pages/AuthCallback.tsx.
export const roleHomeRoute: Record<Role, string> = {
  owner: '/owner',
  society_admin: '/admin',
  committee_member: '/admin',
  accountant: '/accounts',
  resident_owner: '/app',
  resident_tenant: '/app',
  auditor: '/admin',
}

export const isResident = (role: Role | null) => role === 'resident_owner' || role === 'resident_tenant'
export const isCommitteeLevel = (role: Role | null) => role === 'society_admin' || role === 'committee_member'
// society_admin and accountant always have full billing access (accountant
// absorbed the old treasurer role's finance powers, see the Role comment
// block in types.ts for why they were merged). committee_member needs an
// explicit per-membership override (Membership.canManageBilling) once real
// memberships exist; in the demo (no persisted per-user membership store
// yet) committee_member is treated as billing-restricted by default, which
// is the safer default per the roadmap ("not billing unless allowed").
export const canManageBilling = (role: Role | null, membershipOverride?: boolean) =>
  role === 'society_admin' || role === 'owner' || role === 'accountant' || (role === 'committee_member' && !!membershipOverride)

export const canCancelReceipt = (role: Role | null) => role === 'society_admin' || role === 'owner' || role === 'accountant'

const AREA_ACCESS: Record<string, Role[]> = {
  residentApp: ['resident_owner', 'resident_tenant'],
  adminPanel: ['society_admin', 'committee_member', 'auditor'],
  accountsPanel: ['accountant', 'society_admin', 'owner'],
  ownerConsole: ['owner'],
}
export const canAccessArea = (role: Role | null, area: keyof typeof AREA_ACCESS) =>
  !!role && AREA_ACCESS[area].includes(role)

export const canSeeDoc = (role: Role | null, perm: DocPermission) => {
  if (!role) return false
  if (perm === 'public') return true
  if (perm === 'committee') return isCommitteeLevel(role) || role === 'owner'
  if (perm === 'accountant') return role === 'accountant' || isCommitteeLevel(role) || role === 'owner'
  return role === 'society_admin' || role === 'owner'
}

// What a tenant can see/do, gated by the society's own TenantAccessMode.
// 'disabled' means a tenant has no login at all for this society (this
// should be checked before a tenant ever reaches a role-gated route, see
// RoleGate); 'limited' and 'full' both allow login, differing in scope.
export interface TenantCapabilities {
  viewDues: boolean; viewNotices: boolean; fileComplaints: boolean
  viewDocuments: boolean; joinPollsEvents: boolean; viewParking: boolean
  modifyOwnershipRecords: boolean  // always false for a tenant, at any mode
}
export function tenantCapabilities(mode: TenantAccessMode): TenantCapabilities {
  if (mode === 'disabled') {
    return { viewDues: false, viewNotices: false, fileComplaints: false, viewDocuments: false, joinPollsEvents: false, viewParking: false, modifyOwnershipRecords: false }
  }
  if (mode === 'limited') {
    return { viewDues: true, viewNotices: true, fileComplaints: true, viewDocuments: false, joinPollsEvents: false, viewParking: false, modifyOwnershipRecords: false }
  }
  return { viewDues: true, viewNotices: true, fileComplaints: true, viewDocuments: true, joinPollsEvents: true, viewParking: true, modifyOwnershipRecords: false }
}

// Displayed on the Settings page so committees can see who can do what.
// Split resident into owner/tenant columns since tenant access now varies
// by society setting, not just role name.
export const permissionMatrix: { action: string; residentOwner: boolean; residentTenant: boolean; accountant: boolean; committeeMember: boolean; societyAdmin: boolean }[] = [
  { action: 'પોતાનું બિલ અને રસીદ જોવી', residentOwner: true, residentTenant: true, accountant: true, committeeMember: true, societyAdmin: true },
  { action: 'ફરિયાદ નોંધાવવી', residentOwner: true, residentTenant: true, accountant: false, committeeMember: true, societyAdmin: true },
  { action: 'ચુકવણી નોંધવી / રસીદ બનાવવી', residentOwner: false, residentTenant: false, accountant: true, committeeMember: false, societyAdmin: true },
  { action: 'બિલ જનરેટ કરવા', residentOwner: false, residentTenant: false, accountant: true, committeeMember: false, societyAdmin: true },
  { action: 'રસીદ રદ કરવી (કારણ સાથે)', residentOwner: false, residentTenant: false, accountant: true, committeeMember: false, societyAdmin: true },
  { action: 'ખર્ચ નોંધવો', residentOwner: false, residentTenant: false, accountant: true, committeeMember: true, societyAdmin: true },
  { action: 'નોટિસ પ્રકાશિત કરવી', residentOwner: false, residentTenant: false, accountant: false, committeeMember: true, societyAdmin: true },
  { action: 'સભ્યો ઉમેરવા / બદલવા', residentOwner: false, residentTenant: false, accountant: false, committeeMember: false, societyAdmin: true },
  { action: 'રિપોર્ટ અને ઓડિટ એક્સપોર્ટ', residentOwner: false, residentTenant: false, accountant: true, committeeMember: true, societyAdmin: true },
  { action: 'સોસાયટી સેટિંગ્સ / મોડ્યુલ બદલવી', residentOwner: false, residentTenant: false, accountant: false, committeeMember: false, societyAdmin: true },
  { action: 'ફ્લેટની માલિકી બદલવી', residentOwner: false, residentTenant: false, accountant: false, committeeMember: false, societyAdmin: true },
]

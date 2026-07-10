import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { useData } from '../lib/store'
import { roleLabel } from '../lib/permissions'
import type { Role } from '../lib/types'

/**
 * A quick, in-context way to switch roles inside a demo session,
 * without leaving the page and going all the way back to /demo to pick
 * again. Visible only during a demo session (session.isRealSession is
 * false) - a real committee admin or resident never sees this at all.
 *
 * Switching roles here calls login() directly on the same, still-
 * mounted demo provider, then navigates - it never touches sessionStorage
 * itself and never forces a reload, since build 3's storage design
 * already means a role switch never needs to touch the underlying demo
 * data at all, only which role is currently looking at it.
 */
const roleDestination: Record<Role, string> = {
  owner: '/owner', society_admin: '/admin', committee_member: '/admin', accountant: '/accounts',
  resident_owner: '/app', resident_tenant: '/app', auditor: '/admin',
}

export function DemoRoleSwitcher() {
  const { session, rawDb, login } = useData()
  const nav = useNavigate()
  if (session.isRealSession) return null

  const switchTo = (value: string) => {
    if (value === 'society_admin' || value === 'accountant') {
      login(value)
      nav(roleDestination[value])
    } else if (value.startsWith('flat:')) {
      const flatId = value.slice('flat:'.length)
      login('resident_owner', flatId)
      nav('/app')
    }
  }

  const currentValue = session.role === 'resident_owner' || session.role === 'resident_tenant'
    ? `flat:${session.flatId ?? ''}`
    : session.role ?? ''

  return (
    <label className="flex items-center gap-1.5 text-[12px]">
      <ArrowLeftRight size={13} className="shrink-0 opacity-70" aria-hidden />
      <select
        aria-label="ડેમો રોલ બદલો"
        value={currentValue}
        onChange={e => switchTo(e.target.value)}
        className="bg-navy-800 text-cream-50 rounded-full px-2 py-0.5 text-[11.5px] font-semibold border-none focus:outline-none focus:ring-1 focus:ring-saffron-400 max-w-[140px]"
      >
        <option value="society_admin">{roleLabel.society_admin}</option>
        <option value="accountant">{roleLabel.accountant}</option>
        <optgroup label="રહેવાસી તરીકે">
          {/* rawDb, deliberately, not db - this only ever renders during
              a demo session (guarded above), never a real one, where the
              usual warning against reading rawDb from a resident-facing
              component genuinely applies. The whole point of this
              specific dropdown is letting someone freely explore every
              fictional flat, which is exactly what rawDb, not the
              current role's own scoped db, actually provides. */}
          {rawDb.flats.map(f => (
            <option key={f.id} value={`flat:${f.id}`}>ફ્લેટ {f.number}</option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

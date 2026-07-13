import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PackageX } from 'lucide-react'
import { useData } from '../lib/store'
import type { SocietyModules } from '../lib/types'
import { Card, EmptyState } from './ui'

/**
 * Wraps a module's routes. If the active society has this module switched
 * off (by the owner, or by the society's own admin within what the owner
 * allowed), show a clear explanation instead of a silent redirect - covers
 * direct URL access, not just hidden nav links (see also the nav-array
 * filtering in App.tsx and Layouts.tsx, which hides the link in the first
 * place). A silent redirect leaves someone wondering if they mistyped a
 * URL or hit a bug; an explicit message tells them exactly what happened.
 */
export function ModuleGate({ module, fallback, children }: {
  module: keyof SocietyModules; fallback: string; children: ReactNode
}) {
  const { moduleEnabled } = useData()
  if (!moduleEnabled(module)) {
    return (
      <div className="p-4">
        <Card>
          <EmptyState icon={<PackageX size={22} />} title="આ સુવિધા આપની સોસાયટી માટે ચાલુ નથી"
            sub="કમિટીને અથવા Prangan One ને સંપર્ક કરો જો આ ચાલુ કરવું હોય." />
          <Link to={fallback} className="text-[13.5px] font-semibold text-saffron-600 mt-3 inline-block">પાછા જાઓ</Link>
        </Card>
      </div>
    )
  }
  return <>{children}</>
}

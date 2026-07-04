import { AlertTriangle } from 'lucide-react'
import { useData } from '../lib/store'
import { effectiveStatus } from '../lib/subscription'

/**
 * Renders the grace/paused banner for the given audience, or nothing if
 * the society is trial/active. See src/lib/subscription.ts for the copy
 * and the write-guard logic this reflects. Grace reads as a warning
 * (amber); paused is more serious (red), since writes are actually
 * blocked at that point, not just at risk.
 */
export function SubscriptionBanner({ audience }: { audience: 'admin' | 'resident' }) {
  const { society, subscriptionBannerFor } = useData()
  const message = subscriptionBannerFor(audience)
  if (!message) return null
  const severe = effectiveStatus(society) === 'paused'
  return (
    <div className={`px-4 py-2.5 text-[13px] flex items-center gap-2 sticky top-0 z-50 border-b ${severe ? 'bg-red-50 border-red-200 text-over' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      <AlertTriangle size={15} className="shrink-0" /> {message}
    </div>
  )
}

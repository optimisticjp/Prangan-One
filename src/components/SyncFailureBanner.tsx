import { AlertTriangle, RotateCw, X } from 'lucide-react'
import { useData } from '../lib/store'

/**
 * Shows exactly what the audit that prompted this build called out: a
 * real write that fails used to be invisible, the screen would show the
 * change as if it had saved and nothing further would happen. Every real
 * write now goes through attemptRealWrite (see store.tsx), which tracks
 * failures in db.pendingSync - this is simply where that becomes visible
 * and actionable, not just tracked internally.
 *
 * A second, related gap the same audit round caught: even after the
 * first fix, dismissing this banner (or just reloading the page) made
 * the warning disappear while the actual unsaved record stayed sitting
 * there looking exactly like it had saved fine - the warning lived only
 * in memory, never in anything that survived a reload. failedWrites is
 * now a live view of db.pendingSync (persisted, not memory-only), so
 * this banner - and whatever it's warning about - is still here after a
 * reload, not just for the rest of the current session. Retrying uses
 * whatever's actually still there, current data from db, not a stale
 * closure from the original attempt.
 *
 * Deliberately not an auto-dismissing toast like the blocked-write one
 * (see Layouts.tsx) - a failed save needs to stay on screen until it's
 * actually resolved, since the whole point is giving someone time to
 * notice it and tap retry, not a message that vanishes before they can
 * act on it. Dismissing here is now a genuine, deliberate choice to stop
 * tracking a specific one - it removes the underlying entry, not just
 * this notification about it.
 */
export function SyncFailureBanner() {
  const { failedWrites, retryFailedWrite, dismissFailedWrite } = useData()
  if (failedWrites.length === 0) return null

  return (
    <div role="status" className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm space-y-2">
      {failedWrites.map(f => (
        <div key={f.id} className="bg-navy-900 text-cream-50 rounded-xl shadow-lift px-4 py-3 flex items-center gap-3 animate-fadeUp">
          <AlertTriangle size={18} className="text-saffron-400 shrink-0" />
          <div className="flex-1 min-w-0 text-[13px]">
            <span className="font-semibold">{f.label}</span> સેવ ના થયું
          </div>
          <button onClick={() => retryFailedWrite(f.id)}
            className="shrink-0 flex items-center gap-1 text-[12.5px] font-semibold bg-saffron-500 text-navy-900 rounded-lg px-2.5 py-1.5">
            <RotateCw size={13} /> ફરી પ્રયત્ન
          </button>
          <button onClick={() => dismissFailedWrite(f.id)} className="shrink-0 text-cream-100/60" aria-label="છોડી દો, ફરી પ્રયત્ન નહીં કરાય">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

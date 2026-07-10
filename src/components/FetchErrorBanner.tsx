import { AlertCircle, RotateCw } from 'lucide-react'
import { useData } from '../lib/store'

/**
 * Found by systematically checking for anything shaped like the two
 * findings in the previous build, not just fixing the ones already
 * named - a real reliability gap, confirmed real (the fetch effect's
 * own comment already admitted it: "a real error-surface for this is
 * worth adding later"). Before this, if the initial real-session data
 * fetch failed for any reason, the person was left looking at whatever
 * was already there - stale, or completely empty on a first load - with
 * absolutely nothing telling them anything had gone wrong. This is
 * where that becomes visible and actionable, not just silently
 * swallowed.
 *
 * Positioned at the top, not alongside SyncFailureBanner at the bottom -
 * this is a different kind of thing. A failed write is one specific
 * action that didn't go through; this is "the data on this whole screen
 * might not be current," which deserves to be seen immediately, not
 * discovered after acting on stale information.
 */
export function FetchErrorBanner() {
  const { fetchError, retryFetch } = useData()
  if (!fetchError) return null

  return (
    <div role="status" className="sticky top-0 z-40 bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2.5 text-[13px]">
      <AlertCircle size={16} className="text-over shrink-0" />
      <span className="flex-1 text-over font-medium">ડેટા લોડ ના થયો, જે દેખાય છે તે જૂનું હોઈ શકે છે.</span>
      <button onClick={retryFetch} className="shrink-0 flex items-center gap-1 text-[12.5px] font-semibold bg-white text-over border border-red-200 rounded-lg px-2.5 py-1.5">
        <RotateCw size={13} /> ફરી પ્રયત્ન
      </button>
    </div>
  )
}

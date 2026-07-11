import { AlertCircle, RotateCw, WifiOff, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { useData } from '../lib/store'

/**
 * The one place the real session's connection health becomes visible. It
 * started as a single red "data failed to load" banner (the original silent
 * gap this fixed), and now shows the whole small health model from
 * dataHealth (see DataHealth in storeContext.ts) without becoming a second
 * permanent alert:
 *
 *   - Something genuinely wrong (offline, or a refresh that failed) keeps the
 *     original prominent red banner style, so it's impossible to miss.
 *   - Everything fine is a small, quiet corner status ("અપડેટ થયું: હમણાં જ"),
 *     not an alert, so a healthy app doesn't nag.
 *
 * When a refresh fails after data had loaded before, the message carries the
 * real age of the last good data, not a bare "failed", so someone can tell
 * whether they're looking at data from 30 seconds ago or 3 hours ago.
 *
 * Real sessions only: the demo and the local-fallback have no real server to
 * report on, so dataHealth is undefined there and this renders nothing, same
 * as before.
 */

// A plain, injected-time-friendly age: computed from Date.now() at render, so
// tests driving the clock with fake timers see an exact, deterministic value.
function formatAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60000)
  if (minutes < 1) return 'હમણાં જ'
  if (minutes < 60) return `${minutes} મિનિટ પહેલાં`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} કલાક પહેલાં`
  return `${Math.floor(hours / 24)} દિવસ પહેલાં`
}

export function FetchErrorBanner() {
  const { dataHealth, session, retryFetch } = useData()
  if (!session.isRealSession || !dataHealth) return null

  const { refreshState, lastRefreshSuccessAt, lastRefreshFailureAt, offline, pendingWriteCount } = dataHealth
  const refreshing = refreshState === 'refreshing'
  // The last refresh outcome was a failure: a failure exists and it's more
  // recent than the last success (or there's never been a success). Derived
  // from the two timestamps, the same fact fetchError already carries, so the
  // banner and that boolean can't drift apart.
  const failed = lastRefreshFailureAt != null && (lastRefreshSuccessAt == null || lastRefreshFailureAt > lastRefreshSuccessAt)

  const wrongBanner = 'sticky top-0 z-40 bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2.5 text-[13px]'

  // --- Something is genuinely wrong: the prominent red banner ---
  if (offline) {
    return (
      <div role="alert" className={wrongBanner}>
        <WifiOff size={16} className="text-over shrink-0" />
        <span className="flex-1 text-over font-medium">
          તમે ઓફલાઇન છો, ડેટા અપડેટ થઈ શકતો નથી.
          {pendingWriteCount > 0 && ` ${pendingWriteCount} ફેરફાર ઇન્ટરનેટ પાછું આવે ત્યારે સેવ થશે.`}
        </span>
      </div>
    )
  }
  // Not while a fresh attempt is already in flight - then the quiet
  // "updating" below is the honest, less alarming thing to show.
  if (failed && !refreshing) {
    return (
      <div role="alert" className={wrongBanner}>
        <AlertCircle size={16} className="text-over shrink-0" />
        <span className="flex-1 text-over font-medium">
          {lastRefreshSuccessAt != null
            ? `ડેટા અપડેટ ના થયો. છેલ્લે અપડેટ: ${formatAge(Date.now() - lastRefreshSuccessAt)}.`
            : 'ડેટા લોડ ના થયો, જે દેખાય છે તે જૂનું હોઈ શકે છે.'}
        </span>
        <button onClick={retryFetch} className="shrink-0 flex items-center gap-1 text-[12.5px] font-semibold bg-white text-over border border-red-200 rounded-lg px-2.5 py-1.5">
          <RotateCw size={13} /> ફરી પ્રયત્ન
        </button>
      </div>
    )
  }

  // --- Everything is fine: a small, quiet corner status, not an alert ---
  const pendingChip = pendingWriteCount > 0 && (
    <span className="inline-flex items-center gap-1 text-pend">
      <Clock size={11} className="shrink-0" /> {pendingWriteCount} સેવ બાકી
    </span>
  )
  const quietChip = 'fixed top-2 right-2 z-30 inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-navy-400 shadow-soft backdrop-blur'

  if (refreshing) {
    return (
      <div role="status" className={quietChip}>
        <Loader2 size={12} className="shrink-0 animate-spin" /> અપડેટ થાય છે...
        {pendingChip}
      </div>
    )
  }
  if (lastRefreshSuccessAt != null) {
    return (
      <div role="status" className={quietChip}>
        <CheckCircle2 size={12} className="text-paid shrink-0" /> અપડેટ થયું: {formatAge(Date.now() - lastRefreshSuccessAt)}
        {pendingChip}
      </div>
    )
  }
  if (pendingWriteCount > 0) {
    return <div role="status" className={quietChip}>{pendingChip}</div>
  }
  // Nothing has been fetched yet and nothing is wrong - nothing to report.
  return null
}

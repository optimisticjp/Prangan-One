import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

/**
 * Self-healing wrapper around React.lazy for route-split pages.
 *
 * The failure it fixes: every production build emits content-hashed chunk
 * files (e.g. assets/Pricing-DEDgDZ0X.js). When a new version is deployed the
 * hashes change, but a browser that still has the *previous* index.html cached
 * keeps asking the CDN for the old chunk names. Those no longer exist, so the
 * dynamic import() rejects with a "Failed to fetch dynamically imported
 * module" (Chrome) / "error loading dynamically imported module" (Firefox) /
 * "Importing a module script failed" (Safari) style error. React surfaces that
 * rejected lazy import to the nearest error boundary, which is why a routine
 * deploy could turn a working link (e.g. Home -> કિંમત) into the generic
 * "કંઈક ખોટું થયું" screen even though nothing is actually broken - the visitor
 * just needs the fresh HTML that points at the current chunk names.
 *
 * Recovery strategy (at most one reload, no loops):
 *   1. Import normally.
 *   2. On a recognised chunk-load failure, retry the import once in place. Note
 *      that for a real dynamic import() a stale-chunk failure is cached in the
 *      browser's module map, so this retry re-rejects without a second fetch -
 *      it's a cheap guard that only helps a genuinely transient failure in the
 *      importer itself; the reload below is what fixes the deploy case.
 *   3. If the retry also fails, reload the page exactly once. A hard reload
 *      gives the document a fresh module map AND fetches the new index.html,
 *      which references the CURRENT chunk names - the actual cure for a stale
 *      HTML shell. A sessionStorage guard records WHEN the last reload happened
 *      so a genuinely permanent failure (offline, CDN outage) falls through to
 *      the error boundary instead of reloading forever.
 *   4. The guard is a timestamp, not a boolean, and it is deliberately NOT
 *      cleared on a successful import. Clearing on success would break loop
 *      protection on any route that loads two lazy chunks in one render (the
 *      /owner console loads a lazy layout AND a lazy child): the layout's
 *      success would disarm the guard microseconds before the child's failure,
 *      so a permanently-broken child chunk would reload forever. Instead the
 *      guard self-expires after RELOAD_WINDOW_MS: within that window a second
 *      failure will NOT reload again (no loop), and once the window passes a
 *      genuinely later deploy in the same tab can recover the same way again.
 *
 * Non-chunk errors (real render bugs) are re-thrown untouched so the error
 * boundary still shows them.
 */

const RELOAD_GUARD = 'prangan_chunk_reload'
// A reload that "just happened" is remembered for this long. Long enough to
// cover a fresh document loading several lazy chunks after a recovery reload
// (so a still-broken sibling chunk can't trigger a second reload), short enough
// that an unrelated stale deploy minutes later is treated as a new event.
const RELOAD_WINDOW_MS = 10_000

/**
 * Recognises the cross-browser wording for "a dynamically imported JS chunk
 * failed to load". The engine-specific phrasings ("...dynamically imported
 * module" on Chrome/Firefox, "Importing a module script failed" on Safari) and
 * the bundler phrasings ("Loading chunk N failed" / ChunkLoadError) already
 * cover every real case, so we match those specifically rather than a bare
 * "failed to fetch": a lone "TypeError: Failed to fetch" is what a broken
 * API call throws, and misclassifying that as a chunk error would wrongly
 * trigger a retry+reload instead of surfacing the real bug.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase()
  const name = error instanceof Error ? error.name.toLowerCase() : ''
  return (
    name === 'chunkloaderror' ||
    message.includes('dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk')
  )
}

function reloadedRecently(): boolean {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_GUARD)
    if (!raw) return false
    const ts = Number(raw)
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < RELOAD_WINDOW_MS
  } catch { return false }
}

/**
 * Records "a reload is happening now" and reports whether it was actually
 * persisted. If sessionStorage is unavailable (Safari private mode, storage
 * blocked by policy) this returns false, and the caller must then NOT reload -
 * because without a persisted guard a permanent failure would reload forever.
 * Failing safe to the error boundary is strictly better than an infinite loop.
 */
function tryMarkReloaded(): boolean {
  try {
    window.sessionStorage.setItem(RELOAD_GUARD, String(Date.now()))
    return true
  } catch { return false }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer()
    } catch (error) {
      if (!isChunkLoadError(error)) throw error

      // Second chance in place - cheap, recovers a one-off fetch failure.
      try {
        return await importer()
      } catch (retryError) {
        if (!isChunkLoadError(retryError)) throw retryError

        // Still failing: most likely stale HTML from a fresh deploy. Reload to
        // pick up the new index.html + chunk names, but only if (a) we didn't
        // already reload within the window (loop guard) and (b) we can persist
        // that fact. If either check fails, surface to the error boundary.
        if (!reloadedRecently() && tryMarkReloaded()) {
          window.location.reload()
          // Never resolve: keep the Suspense fallback on screen until the
          // reload actually navigates this document away.
          return new Promise<{ default: T }>(() => {})
        }
        throw retryError
      }
    }
  })
}

/**
 * Route prefetching on intent. Every page is lazy-loaded (see App.tsx), which
 * keeps bundles small but means the target chunk only starts downloading after
 * a click - so the first visit to any route flashes the Suspense fallback
 * while the network fetches the chunk. This warms that chunk earlier, on the
 * cheap signal that someone is *about* to navigate (pointer enter / focus /
 * touch start), so by the time they actually click, the chunk is usually
 * already in memory and the navigation is instant.
 *
 * The thunks below are the same dynamic imports App.tsx passes to lazy().
 * Vite resolves a given `import('./x')` specifier to one shared chunk, so
 * calling it here and there loads the module once, then hands back the cached
 * promise - prefetching can never double-download, and a real navigation right
 * after a prefetch reuses the in-flight promise rather than starting over.
 *
 * Kept to the genuinely-common destinations (the resident bottom tabs, the
 * committee sidebar, the resident dashboard's quick actions) rather than every
 * route - prefetching a route nobody was heading to would waste the bandwidth
 * this is meant to save. Unknown paths are a safe no-op.
 */

type Thunk = () => Promise<unknown>

// Keyed by the exact `to` used in the app's NavLinks / Links, so a caller can
// just pass the destination path it already has.
const routeChunks: Record<string, Thunk> = {
  // Resident
  '/app/bill': () => import('../pages/resident/Bill'),
  '/app/receipts': () => import('../pages/resident/Receipts'),
  '/app/complaints': () => import('../pages/resident/Complaints'),
  '/app/notices': () => import('../pages/resident/Notices'),
  '/app/documents': () => import('../pages/resident/Documents'),
  '/app/contacts': () => import('../pages/resident/Contacts'),
  '/app/polls': () => import('../pages/resident/Polls'),
  '/app/events': () => import('../pages/resident/Events'),
  '/app/parking': () => import('../pages/resident/Parking'),
  '/app/profile': () => import('../pages/resident/Profile'),
  '/app/more': () => import('../pages/resident/More'),
  // Committee / admin
  '/admin/billing': () => import('../pages/admin/Billing'),
  '/admin/payments': () => import('../pages/admin/Payments'),
  '/admin/expenses': () => import('../pages/admin/Expenses'),
  '/admin/reports': () => import('../pages/admin/Reports'),
  '/admin/members': () => import('../pages/admin/Members'),
  '/admin/vendors': () => import('../pages/admin/Vendors'),
  '/admin/complaints': () => import('../pages/admin/Complaints'),
  '/admin/parking': () => import('../pages/admin/Parking'),
  '/admin/notices': () => import('../pages/admin/Notices'),
  '/admin/documents': () => import('../pages/admin/Documents'),
  '/admin/polls': () => import('../pages/admin/Polls'),
  '/admin/events': () => import('../pages/admin/Events'),
  '/admin/settings': () => import('../pages/admin/Settings'),
  // Accountant
  '/accounts/reports': () => import('../pages/accountant/Reports'),
  '/accounts/adjustments': () => import('../pages/accountant/Adjustments'),
}

// A given chunk is only ever kicked off once per session; further calls are
// a no-op so repeated hovers cost nothing.
const started = new Set<string>()

/** Warm the chunk for a route, at most once. Safe to call on every hover. */
export function prefetchRoute(path: string): void {
  if (started.has(path)) return
  const thunk = routeChunks[path]
  if (!thunk) return
  started.add(path)
  // Swallow errors: a failed prefetch must never surface: the real navigation
  // will retry the import through lazyWithRetry and show a proper fallback.
  void thunk().catch(() => { started.delete(path) })
}

/**
 * Handlers to spread onto a link/button so it prefetches its destination the
 * moment a pointer or keyboard focus lands on it, before the actual click.
 * onPointerEnter covers mouse/pen hover, onTouchStart covers the tap-down
 * before touchend fires the navigation, and onFocus covers keyboard traversal.
 */
export function prefetchHandlers(path: string) {
  const warm = () => prefetchRoute(path)
  return { onPointerEnter: warm, onTouchStart: warm, onFocus: warm }
}

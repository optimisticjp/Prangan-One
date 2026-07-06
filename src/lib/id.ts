export const uid = (prefix: string) =>
  prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/**
 * A real, valid UUID v4 - used specifically for records created during a
 * real (Supabase-backed) session, so the id used in the optimistic local
 * update and the id actually written to the real database are the exact
 * same value, generated once, client-side, rather than needing to wait
 * for the real insert to come back before showing anything locally.
 * crypto.randomUUID() is available in every modern browser and in the
 * Vitest test environment; the manual fallback below only matters for
 * an environment old enough to lack it entirely.
 */
export const realUid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // RFC 4122-ish fallback, good enough as an id, not used for anything security-sensitive
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

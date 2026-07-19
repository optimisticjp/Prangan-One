import { useEffect, useRef } from 'react'
import { useData } from './store'
import { useToast } from '../components/Toast'

/**
 * Surfaces a blocked write (read-only auditor, read-only support mode, or a
 * subscription that isn't open for writing) as a single transient toast,
 * replacing the two byte-for-byte identical `blockedToast` pills that used to
 * be inlined in both ResidentLayout and Shell (Layouts.tsx). The store already
 * sets lastBlockedReason on every blocked attempt (see guardedSetDb in
 * store.tsx); this just routes it through the shared toast system.
 *
 * Only fires on a genuine transition to a new reason, tracked via a ref, so a
 * re-render that leaves lastBlockedReason unchanged doesn't re-announce it.
 * Call once from each layout shell.
 */
export function useBlockedWriteToast() {
  const { lastBlockedReason } = useData()
  const toast = useToast()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!lastBlockedReason || lastBlockedReason === last.current) return
    last.current = lastBlockedReason
    toast.error(lastBlockedReason)
  }, [lastBlockedReason, toast])
}

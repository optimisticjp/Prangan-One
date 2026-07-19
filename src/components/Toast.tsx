/**
 * A single reusable toast system, replacing the two copy-pasted "blockedToast"
 * pills that used to live inline in both layout shells (ResidentLayout and
 * Shell in Layouts.tsx). Toasts are the app's one channel for transient,
 * unobtrusive confirmation ("ફરિયાદ નોંધાઈ") and non-blocking error feedback,
 * so a mutation no longer just silently closes its modal.
 *
 * Accessibility:
 * - The viewport is an aria-live region so a screen reader announces new
 *   toasts without moving focus. Errors go in an assertive region (they
 *   interrupt), successes/info in a polite one (they wait their turn).
 * - Each toast has a real dismiss button with an accessible label.
 *
 * Safety for tests and partial trees: useToast() never throws. When no
 * ToastProvider is mounted above it (e.g. a page rendered in isolation by a
 * unit test), it returns a no-op API, so adding a toast call to a page can
 * never break a test that doesn't opt into the provider. The real app mounts
 * exactly one ToastProvider at the root (main.tsx).
 *
 * Motion: enter uses animate-fadeIn (~180ms ease-out); the global
 * prefers-reduced-motion block in index.css collapses that to an instant
 * appearance. Auto-dismiss timing is unaffected by reduced motion.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastOptions {
  /** Milliseconds before auto-dismiss. Defaults: 3200 for success/info, 5000
   * for errors (a failure deserves longer to be read). 0 disables auto-dismiss. */
  duration?: number
}

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  duration: number
}

interface ToastApi {
  success: (message: string, opts?: ToastOptions) => void
  error: (message: string, opts?: ToastOptions) => void
  info: (message: string, opts?: ToastOptions) => void
  /** Remove a toast early (used by the dismiss button). */
  dismiss: (id: number) => void
}

const NOOP_API: ToastApi = {
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
}

const ToastCtx = createContext<ToastApi>(NOOP_API)

/** Never throws: falls back to a no-op API outside a provider so a page can
 * always call useToast() safely, including in unit tests. */
export function useToast(): ToastApi {
  return useContext(ToastCtx)
}

const MAX_VISIBLE = 3
const DEFAULT_DURATION: Record<ToastKind, number> = { success: 3200, info: 3200, error: 5000 }

const kindStyles: Record<ToastKind, { icon: typeof CheckCircle2; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-paid' },
  error: { icon: AlertCircle, iconClass: 'text-red-400' },
  info: { icon: Info, iconClass: 'text-saffron-400' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  // Track timers so we can clear them on manual dismiss / unmount rather than
  // leaving a setState firing after the toast is already gone.
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
    setToasts(list => list.filter(t => t.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, message: string, opts?: ToastOptions) => {
    const id = nextId.current++
    const duration = opts?.duration ?? DEFAULT_DURATION[kind]
    setToasts(list => {
      // Collapse an identical, still-visible message instead of stacking
      // duplicates (e.g. a rapid double-tap firing the same confirmation).
      const withoutDupe = list.filter(t => !(t.kind === kind && t.message === message))
      const next = [...withoutDupe, { id, kind, message, duration }]
      // Cap the stack; drop the oldest and clear its timer.
      while (next.length > MAX_VISIBLE) {
        const removed = next.shift()!
        const timer = timers.current.get(removed.id)
        if (timer) { clearTimeout(timer); timers.current.delete(removed.id) }
      }
      return next
    })
    if (duration > 0) {
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
    }
  }, [dismiss])

  useEffect(() => {
    const map = timers.current
    return () => { map.forEach(clearTimeout); map.clear() }
  }, [])

  const api = useMemo<ToastApi>(() => ({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
    dismiss,
  }), [push, dismiss])

  const errors = toasts.filter(t => t.kind === 'error')
  const statuses = toasts.filter(t => t.kind !== 'error')

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <Viewport toasts={statuses} live="polite" onDismiss={dismiss} />
      <Viewport toasts={errors} live="assertive" onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

function Viewport({ toasts, live, onDismiss }: { toasts: ToastItem[]; live: 'polite' | 'assertive'; onDismiss: (id: number) => void }) {
  return (
    <div
      role={live === 'assertive' ? 'alert' : 'status'}
      aria-live={live}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex w-[92vw] max-w-sm flex-col items-center gap-2 pointer-events-none"
    >
      {toasts.map(t => {
        const { icon: Icon, iconClass } = kindStyles[t.kind]
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full items-center gap-2.5 rounded-xl bg-navy-900 px-4 py-2.5 text-cream-50 shadow-lift animate-fadeIn"
          >
            <Icon size={17} className={`shrink-0 ${iconClass}`} />
            <span className="flex-1 text-[13px] font-semibold leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="બંધ કરો"
              className="shrink-0 rounded-md text-cream-100/60 transition-colors hover:text-cream-50"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

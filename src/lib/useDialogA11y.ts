import { useEffect, useRef } from 'react'

/**
 * The exact focus-trap, Escape-to-close, and focus-restoration behavior
 * the reusable Modal (components/ui.tsx) already had - extracted here so
 * the mobile navigation drawer (Layouts.tsx) can have the genuinely same
 * behavior instead of a visually similar but behaviorally plain div.
 * Before this, the drawer was visually modal but not actually modal:
 * Escape didn't close it, Tab could move focus to whatever was behind
 * it, and closing it didn't return focus to whatever opened it.
 *
 * containerRef should point at the actual dialog element (the thing
 * role="dialog" goes on), not a wrapping backdrop - focusable elements
 * are searched for within it specifically.
 */
export function useDialogA11y(open: boolean, onClose: () => void, containerRef: React.RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const focusables = () => Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter(el => !el.hasAttribute('disabled'))

    // Move focus into the dialog on open, so keyboard/screen-reader users
    // land somewhere sensible instead of staying on whatever triggered it.
    const first = focusables()[0]
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) return
      const firstEl = els[0], lastEl = els[els.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to whatever opened the dialog, so keyboard users
      // don't lose their place in the page underneath.
      previouslyFocused.current?.focus()
    }
  }, [open, onClose, containerRef])
}

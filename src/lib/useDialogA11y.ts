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
 *
 * onClose is deliberately kept in a ref, not the effect's own dependency
 * array. A real, previously-shipped bug: every caller of Modal passes
 * onClose as a plain inline arrow function (onClose={() => setOpen(false)}),
 * completely standard React, and typing into any input inside an open
 * modal re-renders that modal's parent on every keystroke, which produces
 * a brand new onClose reference each time. With onClose in the dependency
 * array, that meant the whole setup effect tore down and reran on every
 * single keystroke - including "move focus to the first focusable element
 * in the dialog", which in this app's own Modal is the close button,
 * appearing in the markup before the form content. Someone typing a flat
 * number would lose focus back to the close button after every letter.
 * Reading the latest onClose from a ref instead means the effect only
 * needs to genuinely care about open changing, not about whatever
 * function identity a caller happened to pass this render.
 */
export function useDialogA11y(open: boolean, onClose: () => void, containerRef: React.RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const focusables = () => Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter(el => !el.hasAttribute('disabled'))

    const first = focusables()[0]
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }
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
      previouslyFocused.current?.focus()
    }
  }, [open, containerRef])
}

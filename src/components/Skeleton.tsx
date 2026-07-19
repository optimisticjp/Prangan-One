/**
 * Skeleton placeholders. Used instead of a lone centered spinner so a data
 * refresh keeps the page's shape on screen (no blank swap, no cumulative
 * layout shift) while real content arrives. The shimmer sweep is pure
 * transform/opacity and is fully suppressed by the prefers-reduced-motion
 * block in index.css, where it degrades to a static tinted block.
 *
 * All skeletons are decorative to assistive tech (aria-hidden): the region
 * that swaps them in is what should carry aria-busy, so a screen reader hears
 * "busy", not a tree of empty placeholder boxes. See PageSkeleton's callers in
 * Layouts.tsx.
 */
import type { ReactNode } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`relative block overflow-hidden rounded-lg bg-cream-200 ${className}`}>
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </span>
  )
}

/** A card-shaped skeleton, matching the .card surface used across the app. */
export function SkeletonCard({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`card p-4 sm:p-5 ${className}`}>{children ?? (
    <div className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )}</div>
}

/**
 * A whole-page loading placeholder that mirrors the common page structure
 * (a title, a hero figure, then a grid of cards). Kept intentionally generic:
 * it stands in for any page while its real data loads, so the app never blanks
 * to a spinner. The wrapping element carries role="status" + aria-busy so
 * assistive tech announces the loading state once, not per placeholder box.
 */
export function PageSkeleton({ label = 'લોડ થાય છે...' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4 animate-fadeIn">
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <SkeletonCard>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </SkeletonCard>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="!p-3">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-3 w-14" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

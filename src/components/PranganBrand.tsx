/**
 * The real Prangan One brand, using the official assets in public/brand/.
 * Replaces the old hand-drawn PranganMark placeholder - do not keep both
 * in use. This is the platform's brand, separate from any tenant's own
 * logo (see SocietyLogo.tsx, which stays exactly as it was: a resident or
 * committee screen shows the active SOCIETY's identity, never Prangan
 * One's, except in the small "Powered by" contexts below).
 *
 * Usage guide (matches how the assets are actually meant to be used):
 *   - wordmark-navy: public desktop header/footer, owner-facing light surfaces
 *   - wordmark-white: dark owner sidebar, dark public sections with room for the full logo
 *   - symbol-navy: mobile public header, 404/403/error screens, compact light surfaces
 *   - symbol-white: compact dark navigation, dark owner-console mobile header
 * For "Powered by Prangan One" contexts (receipts, admin footer), use
 * PoweredByPrangan below instead of this component directly, it is sized
 * and worded for that specific, small, secondary placement.
 */
type Variant = 'wordmark-navy' | 'wordmark-white' | 'symbol-navy' | 'symbol-white'

const srcByVariant: Record<Variant, string> = {
  'wordmark-navy': '/brand/prangan-one-logo.svg',
  'wordmark-white': '/brand/prangan-one-logo-white.svg',
  'symbol-navy': '/brand/prangan-one-symbol.svg',
  'symbol-white': '/brand/prangan-one-symbol-white.svg',
}
// Real aspect ratio from the source SVGs (wordmark viewBox 1981x336,
// symbol viewBox 1254x1254), so callers can set just a height/size and
// the image never stretches or distorts.
const aspectByVariant: Record<Variant, number> = {
  'wordmark-navy': 1981 / 336,
  'wordmark-white': 1981 / 336,
  'symbol-navy': 1,
  'symbol-white': 1,
}

export function PranganBrand({ variant, height = 28, decorative = false, className = '' }: {
  variant: Variant
  /** Rendered height in px; width is derived from the asset's real aspect ratio. */
  height?: number
  /** True when the surrounding text already says "Prangan One" out loud, so the image is purely decorative to a screen reader. */
  decorative?: boolean
  className?: string
}) {
  const width = Math.round(height * aspectByVariant[variant])
  return (
    <img
      src={srcByVariant[variant]}
      width={width}
      height={height}
      alt={decorative ? '' : 'Prangan One'}
      aria-hidden={decorative || undefined}
      className={className}
      style={{ height, width }}
    />
  )
}

/** The small "Powered by Prangan One" mark for receipts and admin/accountant footers. Always the navy symbol, since it sits on light surfaces in both places. */
export function PoweredByPrangan({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <PranganBrand variant="symbol-navy" height={14} decorative />
      <span>Powered by Prangan One</span>
    </span>
  )
}

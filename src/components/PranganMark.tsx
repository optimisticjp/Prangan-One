/**
 * Prangan One's own platform mark, a courtyard motif (prangan = courtyard):
 * a compound wall with an open courtyard at its center. This is the
 * platform's brand, separate from any tenant's own logo, see
 * src/components/SocietyLogo.tsx for how a specific society (like Rajhans
 * Tower's swan) gets its own mark instead. Use this one for the owner
 * console and anything representing Prangan One itself, not a society.
 * dark=true is for placing it on a dark surface (matches SocietyLogo's
 * convention): the badge background flips to cream so it still shows up.
 */
export function PranganMark({ size = 32, dark = false }: { size?: number; dark?: boolean }) {
  const bg = dark ? '#FDFBF7' : '#1B2740'
  const wall = dark ? '#1B2740' : '#FDFBF7'
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <rect width="96" height="96" rx="22" fill={bg} />
      <rect x="24" y="24" width="48" height="48" rx="10" fill="none" stroke={wall} strokeWidth="5" />
      <rect x="40" y="40" width="16" height="16" rx="3" fill="#E68F1B" />
    </svg>
  )
}

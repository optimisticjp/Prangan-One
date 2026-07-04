import { useData } from '../lib/store'
import { getPreset } from '../lib/theme/presets'
import type { Society } from '../lib/types'

/**
 * Rajhans Tower's swan mark (rajhans = royal swan) is that society's own
 * permanent brand, not a generic system logo, so it only ever appears for
 * soc_rajhans specifically. Every other society either uploads a real logo
 * or gets a generated initials badge in their own theme colors - never the
 * swan. dark=true is for placing the badge on a dark surface (the admin
 * sidebar, the login hero band, the SaaS dark preview).
 *
 * SocietyBadge takes an explicit society - use this in contexts like the
 * SaaS owner console where you're rendering OTHER societies, not just the
 * currently active one. SocietyLogo is the convenience wrapper for the
 * common case of "show the active society's own logo."
 */
export function SocietyBadge({ society, size = 30, dark = false }: { society: Society; size?: number; dark?: boolean }) {
  if (society.logoDataUrl) {
    return (
      <img src={society.logoDataUrl} alt={society.name} width={size} height={size}
        className="rounded-[22%] object-cover shrink-0" style={{ width: size, height: size }} />
    )
  }

  if (society.id === 'soc_rajhans') {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden className="shrink-0">
        <rect width="96" height="96" rx="22" fill="#1B2740" />
        <path d="M30 66 C30 48 44 46 47 34 C48.5 28 57 28 57.5 34.5 C57.8 38.5 54 41 52.5 45.5 C63 47 72 53 72 61 C72 68 63 71 48 71 C37 71 30 70 30 66 Z" fill="#FDFBF7" />
        <path d="M56.5 31.5 L64 33.5 L57.2 36.8 Z" fill="#E68F1B" />
      </svg>
    )
  }

  const preset = getPreset(society.themeKey)
  const initials = society.nameEn.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  return (
    <div
      className="flex items-center justify-center rounded-[22%] font-bold shrink-0"
      style={{
        width: size, height: size, fontSize: Math.round(size * 0.38),
        background: dark ? preset.saffron['500'].hex : preset.navy['800'].hex,
        color: dark ? preset.navy['900'].hex : '#FDFBF7',
      }}
    >
      {initials}
    </div>
  )
}

export function SocietyLogo({ size = 30, dark = false }: { size?: number; dark?: boolean }) {
  const { society } = useData()
  return <SocietyBadge society={society} size={size} dark={dark} />
}

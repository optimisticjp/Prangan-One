/**
 * Applies a theme preset by writing CSS custom properties onto :root.
 * Every existing className in the app (bg-navy-800, text-saffron-600, ...)
 * keeps working unchanged; this only changes what those tokens resolve to.
 *
 * Called once on boot with the active society's theme, and again any time
 * the society's themeKey changes (see DataProvider in src/lib/store.tsx).
 * Cheap enough to call on every render if needed: it's just ~16 style
 * property writes, no reflow-heavy work.
 */
import { getPreset } from './presets'

export function applyTheme(themeKey: string) {
  const preset = getPreset(themeKey)
  const root = document.documentElement.style
  for (const [step, scale] of Object.entries(preset.navy)) {
    root.setProperty(`--color-navy-${step}`, scale.rgb)
  }
  for (const [step, scale] of Object.entries(preset.saffron)) {
    root.setProperty(`--color-saffron-${step}`, scale.rgb)
  }
}

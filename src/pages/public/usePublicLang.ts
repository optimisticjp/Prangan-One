import { useEffect, useState } from 'react'

export type PublicLang = 'en' | 'gu'
const KEY = 'prangan_public_lang'

/**
 * Language toggle for the public marketing site only (English default,
 * Gujarati toggle). The app itself (src/pages/resident, admin, etc.)
 * never uses this and stays fully Gujarati - see docs/PRANGAN_ONE_ROADMAP.md
 * section 7. Backed by localStorage so the choice persists across the
 * site's 5 pages without needing a context provider threaded through App.tsx.
 */
export function usePublicLang(): [PublicLang, (l: PublicLang) => void] {
  const [lang, setLang] = useState<PublicLang>(() => {
    try { return (localStorage.getItem(KEY) as PublicLang) || 'en' } catch { return 'en' }
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, lang) } catch { /* ignore */ }
    document.documentElement.lang = lang
    // Restore the app's own default (Gujarati) if this public page
    // unmounts, so navigating from a public page into /app or /admin
    // doesn't leave a stale lang="en" on the <html> tag.
    return () => { document.documentElement.lang = 'gu' }
  }, [lang])
  return [lang, setLang]
}

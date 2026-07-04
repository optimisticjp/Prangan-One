import { useEffect, useState } from 'react'

export type PublicLang = 'en' | 'gu'
const KEY = 'prangan_public_lang'

/**
 * Language toggle for the public marketing site only (Gujarati default,
 * English toggle - most visitors are finding this through WhatsApp
 * shares and word of mouth in Gujarati, so that's the first thing they
 * should see). The app itself (src/pages/resident, admin, etc.) never
 * uses this and stays fully Gujarati always, no toggle at all. Backed by
 * localStorage so the choice persists across the site's pages without
 * needing a context provider threaded through App.tsx.
 */
export function usePublicLang(): [PublicLang, (l: PublicLang) => void] {
  const [lang, setLang] = useState<PublicLang>(() => {
    try { return (localStorage.getItem(KEY) as PublicLang) || 'gu' } catch { return 'gu' }
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

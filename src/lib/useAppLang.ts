import { useEffect } from 'react'

/** The app itself is always Gujarati, no toggle - see docs/PRANGAN_ONE_ROADMAP.md
 * section 7. Called once by each top-level app shell (ResidentLayout, Shell,
 * OwnerLayout) so a direct/bookmarked link into the app doesn't leave the
 * public site's lang="en" default sitting on <html>. */
export function useAppLang() {
  useEffect(() => {
    document.documentElement.lang = 'gu'
  }, [])
}

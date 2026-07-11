import { useEffect } from 'react'

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name'
  let tag = document.querySelector(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Sets document title + meta description + basic OpenGraph tags for the
 * current public page. Used only by src/pages/public/* - app routes stay
 * behind auth and are marked noindex separately (see index.html and
 * public/robots.txt for the app-route exclusion).
 */
// Same absolute image the static shells (index.html + the build-time
// scripts/generate-seo-html.mjs step) reference, so an in-app navigation never
// leaves a stale or relative image behind.
const OG_IMAGE = 'https://pranganone.com/og-image.png'

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const fullTitle = `${title} | Prangan One`
    document.title = fullTitle
    setMeta('description', description)
    setMeta('og:title', fullTitle, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)
    setMeta('og:site_name', 'Prangan One', true)
    // Keep the OG/Twitter card tags consistent across in-app navigation, the
    // same way the pre-generated static shells set them, so a link copied from
    // inside the running app previews correctly too.
    setMeta('og:url', window.location.origin + window.location.pathname, true)
    setMeta('og:image', OG_IMAGE, true)
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', description)
    setMeta('twitter:image', OG_IMAGE)
    // index.html defaults to noindex for the whole app (it sits behind
    // auth); public pages are the exception and should be crawlable.
    setMeta('robots', 'index, follow')
    return () => { setMeta('robots', 'noindex, nofollow') }
  }, [title, description])
}

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
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const fullTitle = `${title} | Prangan One`
    document.title = fullTitle
    setMeta('description', description)
    setMeta('og:title', fullTitle, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)
    // index.html defaults to noindex for the whole app (it sits behind
    // auth); public pages are the exception and should be crawlable.
    setMeta('robots', 'index, follow')
    return () => { setMeta('robots', 'noindex, nofollow') }
  }, [title, description])
}

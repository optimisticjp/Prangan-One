// Generates static, crawlable HTML shells for the public marketing routes,
// AFTER `vite build`. Each shell is dist/index.html (the real SPA bundle) with
// only the <head>'s per-page SEO tags rewritten - title, description, og/twitter
// title+description, og:url, canonical - and robots forced to `index, follow`,
// overriding the template's default noindex. The <body> and script tags are
// left byte-for-byte identical, so the SPA still boots and client-side routing
// takes over for real users; the rewritten head is purely what a crawler or a
// link-preview bot (WhatsApp, Facebook, Slack, iMessage, LinkedIn) reads before
// any JS runs.
//
// This is deliberately NOT a prerender/SSG framework - it is a small string
// rewrite over the one built index.html. The image (og:image / twitter:image)
// and its dimensions come from index.html and are the same on every route, so
// they are left untouched here.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PUBLIC_ROUTES } from './public-seo.mjs'

const ORIGIN = 'https://pranganone.com'

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Replace an existing <head> tag matched by `matcher`, or inject `rendered`
// just before </head> if it isn't present. Matching is by identifying
// attribute value (exact), so tag attribute ORDER doesn't matter and a
// prefix like og:image never accidentally matches og:image:width.
function upsertTag(html, matcher, rendered) {
  if (matcher.test(html)) return html.replace(matcher, rendered)
  return html.replace(/<\/head>/i, `    ${rendered}\n  </head>`)
}

function setTitle(html, value) {
  const rendered = `<title>${escapeText(value)}</title>`
  return upsertTag(html, /<title>[\s\S]*?<\/title>/i, rendered)
}

// <meta name="X" ...> or <meta property="X" ...>, any attribute order.
function setMeta(html, attr, name, content) {
  const rendered = `<meta ${attr}="${name}" content="${escapeAttr(content)}" />`
  const matcher = new RegExp(`<meta\\b[^>]*\\b${attr}=["']${escapeRegExp(name)}["'][^>]*>`, 'i')
  return upsertTag(html, matcher, rendered)
}

function setCanonical(html, href) {
  const rendered = `<link rel="canonical" href="${escapeAttr(href)}" />`
  const matcher = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i
  return upsertTag(html, matcher, rendered)
}

/** Rewrites the head of the built template for one route. Pure - returns a new HTML string. */
export function renderRouteHtml(template, route) {
  const url = `${ORIGIN}${route.path}`
  let html = template
  html = setTitle(html, route.title)
  html = setMeta(html, 'name', 'description', route.description)
  html = setMeta(html, 'property', 'og:title', route.title)
  html = setMeta(html, 'property', 'og:description', route.description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', route.title)
  html = setMeta(html, 'name', 'twitter:description', route.description)
  // The public marketing pages are the crawlable exception to index.html's
  // app-wide default noindex.
  html = setMeta(html, 'name', 'robots', 'index, follow')
  html = setCanonical(html, url)
  return html
}

/** Reads distDir/index.html and writes a shell per route. Returns the routes written. */
export async function generateSeoHtml(distDir) {
  const template = await readFile(join(distDir, 'index.html'), 'utf8')
  const written = []
  for (const route of PUBLIC_ROUTES) {
    const html = renderRouteHtml(template, route)
    // root "/" overwrites dist/index.html itself; every other route becomes
    // dist/<route>/index.html so Cloudflare Pages serves it at the clean URL.
    const outPath = route.path === '/' ? join(distDir, 'index.html') : join(distDir, route.path, 'index.html')
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, html)
    written.push({ path: route.path, outPath })
  }
  return written
}

// Run against ./dist when invoked directly (node scripts/generate-seo-html.mjs).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const written = await generateSeoHtml(distDir)
  console.log(`[seo] wrote ${written.length} crawlable route shells into ${distDir}:`)
  for (const w of written) console.log(`      ${w.path}  ->  ${w.outPath}`)
}

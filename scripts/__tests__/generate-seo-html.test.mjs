import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateSeoHtml } from '../generate-seo-html.mjs'
import { PUBLIC_ROUTES } from '../public-seo.mjs'

// A minimal stand-in for a real Vite-built dist/index.html: it has the head
// tags the generator rewrites (deliberately in a different attribute order and
// with the default noindex) plus a body/script the generator must leave alone.
const TEMPLATE = `<!doctype html>
<html lang="gu">
  <head>
    <meta charset="UTF-8" />
    <title>Prangan One | old</title>
    <meta name="description" content="old description" />
    <meta content="Prangan One | old" property="og:title" />
    <meta property="og:description" content="old" />
    <meta property="og:image" content="https://pranganone.com/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="canonical" href="https://pranganone.com/" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-abc123.js"></script>
  </body>
</html>`

let dir

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = undefined
})

describe('generate-seo-html', () => {
  it('writes a crawlable shell per route with the right title, description, and index,follow', async () => {
    dir = await mkdtemp(join(tmpdir(), 'seo-'))
    await mkdir(join(dir, 'dist'), { recursive: true })
    const distDir = join(dir, 'dist')
    await writeFile(join(distDir, 'index.html'), TEMPLATE)

    const written = await generateSeoHtml(distDir)
    expect(written.length).toBe(PUBLIC_ROUTES.length)

    // The root "/" overwrites dist/index.html; a sub-route lands in its own folder.
    const pricing = PUBLIC_ROUTES.find(r => r.path === '/pricing')
    const pricingHtml = await readFile(join(distDir, 'pricing', 'index.html'), 'utf8')

    // Title + description match the single source of truth, and old values are gone.
    expect(pricingHtml).toContain(`<title>${pricing.title}</title>`)
    expect(pricingHtml).not.toContain('Prangan One | old')
    expect(pricingHtml).toContain(`content="${pricing.description}"`)
    expect(pricingHtml).not.toContain('old description')

    // Robots is flipped to index,follow, overriding the template's noindex.
    expect(pricingHtml).toMatch(/name="robots"\s+content="index, follow"/)
    expect(pricingHtml).not.toContain('noindex, nofollow')

    // Per-route og:url + canonical, and og:title updated despite reversed attr order.
    expect(pricingHtml).toContain('content="https://pranganone.com/pricing"')
    expect(pricingHtml).toContain('href="https://pranganone.com/pricing"')
    expect(pricingHtml).toMatch(/property="og:title"\s+content="Pricing \| Prangan One"/)

    // The shared image is untouched, and the SPA body/script survive verbatim.
    expect(pricingHtml).toContain('https://pranganone.com/og-image.png')
    expect(pricingHtml).toContain('<div id="root"></div>')
    expect(pricingHtml).toContain('/assets/index-abc123.js')

    // Root really overwrote dist/index.html with the home route's meta.
    const rootHtml = await readFile(join(distDir, 'index.html'), 'utf8')
    const home = PUBLIC_ROUTES.find(r => r.path === '/')
    expect(rootHtml).toContain(`<title>${home.title}</title>`)
    expect(rootHtml).toMatch(/name="robots"\s+content="index, follow"/)
  })
})

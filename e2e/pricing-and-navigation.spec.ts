import { expect, test, type Page } from '@playwright/test'
import { attachErrorSink, expectNoErrorBoundary, expectNoRuntimeErrors } from './helpers/errorSink'

/**
 * Regression suite for the production incident where clicking "કિંમત" (Pricing)
 * from the Gujarati home page dropped visitors onto the generic error boundary
 * ("કંઈક ખોટું થયું ... લોગિન પર જાઓ").
 *
 * Two confirmed root causes are covered here end to end:
 *   1. A stale HTML shell (from a previous deploy) requesting a hashed lazy
 *      chunk that no longer exists -> "Failed to fetch dynamically imported
 *      module" -> boundary. Fixed by lazyWithRetry (retry once, then one
 *      guarded reload) plus /assets long-cache + HTML no-cache headers.
 *   2. An invalid persisted public-language value (e.g. "Gujarati") being cast
 *      straight into copy[lang], crashing every public page. Fixed by
 *      validating localStorage back to 'gu'/'en'.
 *
 * Every navigation is asserted "runtime-clean": no uncaught error, no
 * console.error, no unhandled rejection, no failed request, no 4xx/5xx, and no
 * rendered error boundary. That single guard is what enforces the task's
 * requirement to fail on any of those conditions.
 */

const PUBLIC_ROUTES: { path: string; heading: RegExp }[] = [
  { path: '/', heading: /કમિટી ડેશબોર્ડ/ },
  { path: '/features', heading: /સોસાયટી ચલાવવા માટે/ },
  { path: '/pricing', heading: /સાદી કિંમત/ },
  { path: '/faq', heading: /વારંવાર પુછાતા પ્રશ્નો/ },
  { path: '/contact', heading: /સોસાયટી સેટઅપની વિનંતી/ },
  { path: '/privacy', heading: /પ્રાઇવસી પોલિસી/ },
  { path: '/terms', heading: /સેવાની શરતો/ },
]

test.beforeEach(async ({ context }) => { await context.clearCookies() })

// ---------------------------------------------------------------------------
// 1. The exact reported failure: reaching Pricing every way in.
// ---------------------------------------------------------------------------
test.describe('Pricing is reachable from every entry point, error-free', () => {
  test('desktop nav link Home -> કિંમત', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'કિંમત' }).click()
    await expect(page).toHaveURL(/\/pricing$/)
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'nav -> pricing')
    expectNoRuntimeErrors(sink, 'nav -> pricing')
  })

  test('mobile menu Home -> કિંમત', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await page.getByRole('button', { name: /મેનુ ખોલો/ }).click()
    await page.getByRole('banner').getByRole('link', { name: 'કિંમત' }).click()
    await expect(page).toHaveURL(/\/pricing$/)
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'mobile menu -> pricing')
    expectNoRuntimeErrors(sink, 'mobile menu -> pricing')
  })

  test('footer link -> કિંમત', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: 'કિંમત' }).click()
    await expect(page).toHaveURL(/\/pricing$/)
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'footer -> pricing')
    expectNoRuntimeErrors(sink, 'footer -> pricing')
  })

  test('direct navigation and hard refresh on /pricing', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'direct + refresh pricing')
    expectNoRuntimeErrors(sink, 'direct + refresh pricing')
  })

  test('browser back / forward across Pricing', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'કિંમત' }).click()
    await expect(page).toHaveURL(/\/pricing$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL(/\/pricing$/)
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'back/forward pricing')
    expectNoRuntimeErrors(sink, 'back/forward pricing')
  })
})

// ---------------------------------------------------------------------------
// 2. Every public lazy route loads clean (direct + client-side navigation).
// ---------------------------------------------------------------------------
test.describe('all public lazy routes load without runtime errors', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`direct load ${route.path}`, async ({ page }) => {
      const sink = await attachErrorSink(page)
      await page.goto(route.path)
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
      await expectNoErrorBoundary(page, route.path)
      expectNoRuntimeErrors(sink, route.path)
    })
  }
})

// ---------------------------------------------------------------------------
// 3. Root-cause #2: a poisoned language value must never crash a public page.
// ---------------------------------------------------------------------------
test.describe('invalid persisted public language falls back to gu, never crashes', () => {
  for (const bad of ['Gujarati', 'english', '', 'random-junk']) {
    test(`stored value ${JSON.stringify(bad)} still renders Pricing`, async ({ page }) => {
      const sink = await attachErrorSink(page)
      await page.addInitScript(value => {
        try { localStorage.setItem('prangan_public_lang', value as string) } catch { /* ignore */ }
      }, bad)
      await page.goto('/pricing')
      await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible()
      // Falls back to Gujarati rather than a broken English/undefined render.
      await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
      await expectNoErrorBoundary(page, `bad lang ${JSON.stringify(bad)}`)
      expectNoRuntimeErrors(sink, `bad lang ${JSON.stringify(bad)}`)
    })
  }
})

// ---------------------------------------------------------------------------
// 4. Root-cause #1 simulated: a stale/missing chunk self-heals via one reload.
// ---------------------------------------------------------------------------
test.describe('a stale Pricing chunk recovers automatically', () => {
  test('the first document’s chunk fetch fails, then one reload recovers', async ({ page }) => {
    // A failed dynamic import is cached in the browser's module map, so there is
    // exactly ONE chunk fetch per document load (the in-place retry re-rejects
    // from cache, it does not re-fetch). Aborting only the first document's
    // fetch reproduces a stale deploy: the guarded reload gives the next
    // document a fresh module map, its fetch is allowed, and Pricing renders.
    // Count real document loads so the reload is positively proven, not merely
    // inferred from fetch counts.
    await page.addInitScript(() => {
      const n = Number(sessionStorage.getItem('__doc_loads') || '0') + 1
      sessionStorage.setItem('__doc_loads', String(n))
    })

    let attempts = 0
    await page.route('**/assets/Pricing-*.js', route => {
      attempts += 1
      if (attempts <= 1) return route.abort('failed')
      return route.continue()
    })

    await page.goto('/pricing', { waitUntil: 'commit' })

    // Appears only after the automatic reload re-fetches the chunk successfully.
    await expect(page.getByRole('heading', { level: 1, name: /સાદી કિંમત/ })).toBeVisible({ timeout: 15_000 })
    await expectNoErrorBoundary(page, 'stale chunk recovery')

    // Positive proof a full-document reload happened: the document loaded twice.
    const docLoads = await page.evaluate(() => Number(sessionStorage.getItem('__doc_loads') || '0'))
    expect(docLoads).toBeGreaterThanOrEqual(2)
    expect(attempts).toBeGreaterThanOrEqual(2)

    // The guard records the reload as a timestamp (it is intentionally NOT
    // cleared on success - see lazyWithRetry - so it self-expires instead).
    const guard = await page.evaluate(() => Number(sessionStorage.getItem('prangan_chunk_reload') || '0'))
    expect(guard).toBeGreaterThan(0)
  })

  test('a permanently missing chunk does not loop; it settles on the boundary once', async ({ page }) => {
    // Never let the chunk through. After the single guarded reload the app must
    // stop reloading and show the recovery screen rather than loop forever.
    let attempts = 0
    await page.route('**/assets/Pricing-*.js', route => { attempts += 1; return route.abort('failed') })

    await page.goto('/pricing', { waitUntil: 'commit' })
    await expect(page.getByText('કંઈક ખોટું થયું')).toBeVisible({ timeout: 15_000 })

    // The recovery screen offers a real way out, and it is NOT login-only.
    await expect(page.getByRole('link', { name: /હોમ પર જાઓ/ })).toBeVisible()

    // Bounded: one fetch on the initial document + one on the single reloaded
    // document = 2. The guard then blocks further reloads, so it must settle at
    // 2 and never climb.
    await page.waitForTimeout(2000)
    expect(attempts).toBeLessThanOrEqual(2)
    const guard = await page.evaluate(() => Number(sessionStorage.getItem('prangan_chunk_reload') || '0'))
    expect(guard).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Crawl every internal link discoverable from the public site.
// ---------------------------------------------------------------------------
test.describe('internal link crawl stays error-free', () => {
  test('every internal link reachable from the public pages loads clean', async ({ page }) => {
    const sink = await attachErrorSink(page)

    const toVisit = new Set<string>()
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route.path)
      const hrefs = await page.locator('a[href^="/"]').evaluateAll(as =>
        as.map(a => (a as HTMLAnchorElement).getAttribute('href') || '')
          .filter(h => h.startsWith('/') && !h.startsWith('//')))
      hrefs.forEach(h => toVisit.add(h.split('#')[0].split('?')[0]))
    }

    for (const path of toVisit) {
      await page.goto(path)
      // Page-agnostic "it actually rendered something" check: the SPA mounts
      // into #root, so wait until React has painted real text there (not every
      // route has an <h1> or <main> - the demo page, for instance, does not).
      await page.waitForFunction(() => (document.getElementById('root')?.innerText || '').trim().length > 0)
      await expectNoErrorBoundary(page, `crawl ${path}`)
    }

    expectNoRuntimeErrors(sink, 'internal crawl')
    // Sanity: the crawl genuinely exercised the marketing routes.
    expect([...toVisit]).toEqual(expect.arrayContaining(['/pricing', '/features', '/faq', '/contact', '/privacy', '/terms', '/login']))
  })
})

// ---------------------------------------------------------------------------
// 6. Demo role journeys (committee, resident, accountant) load clean.
// ---------------------------------------------------------------------------
async function reachedApp(page: Page, urlRe: RegExp) {
  await expect(page).toHaveURL(urlRe)
}

test.describe('demo role entry points load their panels error-free', () => {
  test('committee member -> /admin', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/demo')
    await page.getByText('હું કમિટી મેમ્બર છું').click()
    await reachedApp(page, /\/admin$/)
    await expect(page.getByRole('heading', { name: /કમિટી ડેશબોર્ડ/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'demo committee')
    expectNoRuntimeErrors(sink, 'demo committee')
  })

  test('accountant -> /accounts', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/demo')
    await page.getByText('હું એકાઉન્ટન્ટ છું').click()
    await reachedApp(page, /\/accounts$/)
    await expectNoErrorBoundary(page, 'demo accountant')
    expectNoRuntimeErrors(sink, 'demo accountant')
  })

  test('resident -> /app', async ({ page }) => {
    const sink = await attachErrorSink(page)
    await page.goto('/demo')
    await page.getByRole('button', { name: /શરૂ કરો/ }).click()
    await reachedApp(page, /\/app$/)
    await expect(page.getByRole('heading', { name: /નમસ્તે/ })).toBeVisible()
    await expectNoErrorBoundary(page, 'demo resident')
    expectNoRuntimeErrors(sink, 'demo resident')
  })
})

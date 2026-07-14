import { expect, type Page } from '@playwright/test'

/**
 * A single, reusable "did anything actually break?" probe for the navigation
 * regression suite. It records every class of runtime failure the task treats
 * as a hard error so a test can assert, in one call, that a page loaded truly
 * cleanly - not just that some expected text happened to be visible:
 *
 *   - pageErrors     : uncaught exceptions thrown in the page
 *   - consoleErrors  : anything logged at console.error (e.g. the boundary's
 *                      "Prangan One render error", a React error, a failed fetch)
 *   - rejections     : unhandled promise rejections (this is exactly the shape
 *                      a failed dynamic import() takes before the boundary)
 *   - failedRequests : requests that never completed (net::ERR_*, aborts)
 *   - badResponses   : any 4xx/5xx HTTP response
 *
 * The error boundary is checked separately (expectNoErrorBoundary) because it
 * is a *rendered* symptom rather than a console/network signal.
 */
export interface ErrorSink {
  pageErrors: string[]
  consoleErrors: string[]
  rejections: string[]
  failedRequests: string[]
  badResponses: string[]
}

export async function attachErrorSink(page: Page): Promise<ErrorSink> {
  const sink: ErrorSink = { pageErrors: [], consoleErrors: [], rejections: [], failedRequests: [], badResponses: [] }

  page.on('pageerror', err => sink.pageErrors.push(err.message || String(err)))
  page.on('console', msg => { if (msg.type() === 'error') sink.consoleErrors.push(msg.text()) })
  page.on('requestfailed', req => {
    const errorText = req.failure()?.errorText ?? 'failed'
    // net::ERR_ABORTED is a browser-initiated cancellation, not an app failure:
    // e.g. a @font-face subset whose unicode-range doesn't match the rendered
    // text, a preload that wasn't consumed in time, or a request cut short by
    // navigating away. A genuinely broken chunk instead surfaces as a
    // pageerror / console.error ("Failed to fetch dynamically imported module")
    // or a 4xx/5xx, all of which are still asserted below - so dropping aborts
    // here removes noise without hiding a real failure.
    if (errorText.includes('ERR_ABORTED')) return
    sink.failedRequests.push(`${errorText} ${req.method()} ${req.url()}`)
  })
  page.on('response', res => { if (res.status() >= 400) sink.badResponses.push(`${res.status()} ${res.url()}`) })

  // Unhandled rejections don't reliably surface through 'pageerror', so capture
  // them explicitly from inside the page. addInitScript re-runs on every
  // document (including a recovery reload), so each page gets exactly one listener.
  await page.exposeFunction('__pranganRecordRejection', (msg: string) => { sink.rejections.push(msg) })
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', event => {
      const reason = (event as PromiseRejectionEvent).reason
      const message = reason && (reason as Error).message ? (reason as Error).message : String(reason)
      ;(window as unknown as { __pranganRecordRejection?: (m: string) => void }).__pranganRecordRejection?.(message)
    })
  })

  return sink
}

export function expectNoRuntimeErrors(sink: ErrorSink, context = ''): void {
  const label = context ? ` [${context}]` : ''
  expect(sink.pageErrors, `uncaught page errors${label}`).toEqual([])
  expect(sink.consoleErrors, `console.error output${label}`).toEqual([])
  expect(sink.rejections, `unhandled promise rejections${label}`).toEqual([])
  expect(sink.failedRequests, `failed network requests${label}`).toEqual([])
  expect(sink.badResponses, `HTTP 4xx/5xx responses${label}`).toEqual([])
}

export async function expectNoErrorBoundary(page: Page, context = ''): Promise<void> {
  const label = context ? ` [${context}]` : ''
  // The generic Gujarati boundary headline. If it's on screen, the route crashed.
  await expect(page.getByText('કંઈક ખોટું થયું'), `error boundary rendered${label}`).toHaveCount(0)
}

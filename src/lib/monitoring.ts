/**
 * Production error monitoring, null-until-configured exactly like supabase.ts:
 * it does nothing at all until VITE_SENTRY_DSN is set AND this is a real
 * production build. In dev, in tests, and in any build without a DSN, no Sentry
 * client is ever created and no network request is ever made.
 *
 * This is a privacy-sensitive product (resident names, phones, flat numbers,
 * payment amounts) with a "data stays in India" stance, so the config below is
 * deliberately minimal and scrubbed:
 *   - sendDefaultPii: false, so Sentry never attaches IP/user data on its own.
 *   - No session replay and no browser tracing (they are opt-in, so simply not
 *     adding them keeps them out) - replay would record the screen, and both
 *     add real bundle weight. Errors only.
 *   - A beforeSend hook strips anything that could still carry personal data:
 *     request body/cookies/query-string/headers, and the whole user object.
 *
 * Call sites use reportError(), never import Sentry directly, so monitoring is
 * decoupled from the app and trivial to mock in tests.
 */
import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

let initialized = false

export function initMonitoring(): void {
  // Only a real production build with a DSN configured actually turns this on.
  // Dev and tests fall straight through and do nothing - no init, no network.
  if (!import.meta.env.PROD || !dsn) return

  Sentry.init({
    dsn,
    environment: 'production',
    // Never let Sentry attach IP or other default personal data.
    sendDefaultPii: false,
    // Errors only: no browser tracing, no performance sampling, and (by not
    // adding replayIntegration/browserTracingIntegration) no session replay -
    // for privacy and to keep the initial bundle small. The default
    // integrations that DO stay on include the global handlers for unhandled
    // errors and unhandled promise rejections, which is exactly what we want.
    tracesSampleRate: 0,
    beforeSend(event) {
      // Strip anything that could carry personal data. When in doubt, remove it.
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        delete event.request.query_string
        delete event.request.headers // can carry cookies / auth tokens
      }
      // No identifiable user is ever sent: no email, phone, name, or IP.
      delete event.user
      return event
    },
  })
  initialized = true
}

/**
 * Report a handled error with safe, structured context (attached as Sentry
 * `extra`). No-ops safely when monitoring was never initialized - dev, tests,
 * or a production build with no DSN - so it is always safe to call.
 *
 * Callers are responsible for passing only non-personal context (operation
 * names, ids), never resident data.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

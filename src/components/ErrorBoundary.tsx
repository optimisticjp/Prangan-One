import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertOctagon, Home, RotateCcw } from 'lucide-react'
import { PranganBrand } from './PranganBrand'
import { reportError } from '../lib/monitoring'

interface State { hasError: boolean; message?: string }

/**
 * Catches render errors anywhere below it in the tree and shows a real
 * recovery screen instead of a blank white page. Must be a class
 * component - React error boundaries don't have a hooks equivalent.
 *
 * The technical error (message + component stack) goes to the console and to
 * reportError for diagnostics only; visitors never see raw stack traces. What
 * they get instead are two clear ways out: retry the current screen in place
 * (recovers transient render errors without losing their place), or go to the
 * home page (always in the main bundle, so it loads even if a lazy chunk was
 * the thing that failed). Support email is offered as the last resort. The old
 * behaviour sent everyone to /login, which was wrong for public visitors who
 * were never logged in and just wanted the page they clicked.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Prangan One render error:', error, info.componentStack)
    reportError(error, { componentStack: info.componentStack, boundary: 'root' })
  }

  private handleRetry = () => {
    // Clear the boundary so the subtree re-renders. Recovers render errors
    // that were transient; if the same error recurs the boundary simply
    // re-appears rather than leaving a broken screen.
    this.setState({ hasError: false, message: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
          <div className="card max-w-sm text-center p-6">
            <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
            <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-over">
              <AlertOctagon size={26} />
            </div>
            <h1 className="font-bold text-navy-900 text-[18px]">કંઈક ખોટું થયું</h1>
            <p className="text-[13.5px] text-navy-500 mt-1.5">
              માફ કરશો, આ સ્ક્રીન લોડ કરવામાં ભૂલ આવી. ફરી પ્રયાસ કરો, અથવા સમસ્યા રહે તો{' '}
              <a href="mailto:care@pranganone.com" className="font-semibold text-navy-700 underline hover:text-saffron-600">care@pranganone.com</a>{' '}
              પર જણાવો.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 text-cream-50 px-4 py-2.5 text-[14px] font-semibold hover:bg-navy-700">
                <RotateCcw size={16} /> ફરી પ્રયાસ કરો
              </button>
              <a href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white text-navy-800 px-4 py-2.5 text-[14px] font-semibold hover:border-saffron-400">
                <Home size={16} /> હોમ પર જાઓ
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

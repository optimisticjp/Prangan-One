import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertOctagon, RotateCcw } from 'lucide-react'
import { PranganBrand } from './PranganBrand'

interface State { hasError: boolean; message?: string }

/**
 * Catches render errors anywhere below it in the tree and shows a real
 * recovery screen instead of a blank white page. Must be a class
 * component - React error boundaries don't have a hooks equivalent.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Prangan One render error:', error, info.componentStack)
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
              માફ કરશો, આ સ્ક્રીન લોડ કરવામાં ભૂલ આવી. ફરી પ્રયત્ન કરો, અથવા સમસ્યા રહે તો care@pranganone.com પર જણાવો.
            </p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/login' }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-800 text-cream-50 px-4 py-2.5 text-[14px] font-semibold hover:bg-navy-700">
              <RotateCcw size={16} /> લોગિન પર જાઓ
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { useState } from 'react'
import { X, Sparkles, CheckCircle2 } from 'lucide-react'
import { useData } from '../lib/store'
import { loadGuideState, saveGuideState, computePaymentJourneySteps, computeComplaintJourneySteps } from '../lib/demoGuide'

/**
 * The optional "try this journey" guide, deliberately small: shows the
 * next real thing to do, never blocks anything else on the screen, and
 * a dismiss genuinely dismisses it for the rest of this session, not
 * just until the next render. Never appears for a real session.
 *
 * Reads guide state fresh from storage on every single render, not
 * cached in its own state - the guide can be started from elsewhere
 * (Demo.tsx, before this component even exists yet) or progress because
 * of something that happened on a completely different page, so caching
 * it and only refreshing on a session change would miss real updates
 * that don't happen to coincide with one. tick exists purely to force a
 * fresh render when dismiss is clicked, a genuinely local action that
 * doesn't touch session at all.
 */
export function DemoGuideBanner() {
  const { session, db } = useData()
  const [, setTick] = useState(0)
  const state = loadGuideState()

  if (session.isRealSession || !state.journey || state.dismissed || !state.targetFlatId) return null
  if (state.journey === 'payment' && !state.targetBillId) return null

  const steps = state.journey === 'payment'
    ? computePaymentJourneySteps(db, session, state.targetFlatId, state.targetBillId!)
    : computeComplaintJourneySteps(db, session, state.targetFlatId)

  const nextStep = steps.find(s => !s.done)
  const doneCount = steps.filter(s => s.done).length
  const dismiss = () => {
    saveGuideState({ ...state, dismissed: true })
    setTick(t => t + 1)
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-md animate-fadeUp">
      <div className="rounded-2xl bg-navy-900 text-cream-50 shadow-lift border border-navy-800 px-4 py-3 flex items-start gap-3">
        {nextStep ? <Sparkles size={18} className="text-saffron-400 shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="text-paid shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-saffron-400 uppercase tracking-wide">
            {nextStep ? `આગળનું પગલું · ${doneCount}/${steps.length}` : 'જર્ની પૂરી થઈ 🎉'}
          </div>
          <div className="text-[13.5px] font-semibold mt-0.5">
            {nextStep ? nextStep.text : 'તમે આખી જર્ની જોઈ લીધી.'}
          </div>
        </div>
        <button onClick={dismiss} aria-label="ગાઇડ બંધ કરો" className="shrink-0 text-navy-300 hover:text-cream-50 p-1">
          <X size={17} />
        </button>
      </div>
    </div>
  )
}

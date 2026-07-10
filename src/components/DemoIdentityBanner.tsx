import { useState } from 'react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { useData } from '../lib/store'
import { Modal, Button } from './ui'

/**
 * The permanent, always-visible identification this whole demo has been
 * missing until this build - nothing about a demo session should ever
 * be mistakable for something real, and a role switcher tucked into a
 * sidebar, on its own, doesn't say that plainly enough on its own.
 * Never appears for a real session. Deliberately styled distinctly from
 * the owner support-mode banner (navy background here, not saffron) so
 * the two, which mean genuinely different things, are never visually
 * confused with each other.
 */
export function DemoIdentityBanner() {
  const { session, resetAll } = useData()
  const [confirmOpen, setConfirmOpen] = useState(false)
  if (session.isRealSession) return null

  return (
    <>
      <div className="bg-navy-900 text-saffron-400 px-4 py-2 flex items-center justify-between gap-3 text-[12.5px] font-semibold sticky top-0 z-40">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <FlaskConical size={15} className="shrink-0" />
          <span className="truncate">ડેમો સોસાયટી · કાલ્પનિક ડેટા · ફેરફારો કામચલાઉ છે</span>
        </span>
        <button onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-1 underline shrink-0">
          <RotateCcw size={13} /> રીસ્ટાર્ટ
        </button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="ડેમો રીસ્ટાર્ટ કરો?">
        <p className="text-[13.5px] text-navy-500 mb-4">
          આ સેશનમાં તમે જે પણ કર્યું છે (ચુકવણી, ફરિયાદ, નોટિસ) બધું ભૂંસાઈ જશે અને ડેમો શરૂઆતની સ્થિતિમાં પાછું જશે.
        </p>
        <div className="flex gap-2">
          <Button variant="soft" full onClick={() => setConfirmOpen(false)}>રહેવા દો</Button>
          <Button variant="danger" full onClick={() => { resetAll(); setConfirmOpen(false) }}>રીસ્ટાર્ટ કરો</Button>
        </div>
      </Modal>
    </>
  )
}

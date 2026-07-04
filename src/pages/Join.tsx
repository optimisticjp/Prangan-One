import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock3, AlertCircle } from 'lucide-react'
import { useData } from '../lib/store'
import { Button, Card, Input } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'

const errorCopy: Record<string, string> = {
  society_not_found: 'આ કોડ સાચો લાગતો નથી. તમારી કમિટી પાસે સાચો કોડ ચેક કરો.',
  flat_not_found: 'આ ફ્લેટ નંબર આ સોસાયટીમાં મળ્યો નહીં. નંબર ફરી ચેક કરો.',
  tenant_access_disabled: 'આ સોસાયટીમાં ભાડૂત માટે એક્સેસ હાલમાં બંધ છે. તમારી કમિટીનો સંપર્ક કરો.',
  already_enrolled: 'આ ઈમેલ પહેલેથી જ આ સોસાયટીમાં નોંધાયેલો છે. લોગિન કરવાનો પ્રયત્ન કરો.',
}

/**
 * pranganone.com/join - a resident enters their society's join code
 * (shared via WhatsApp/notice board, see the code shown in
 * owner/SocietyDetail.tsx) plus their flat number and contact details.
 * If the phone matches what's already on file for that flat, they're in
 * immediately. Otherwise it's a pending request the committee approves
 * with one tap - see the pending-approvals card in admin/Members.tsx.
 *
 * Deliberately doesn't ask "are you the owner or a tenant" - that's
 * derived from the flat's own occupancy record, not self-declared, so it
 * can't be gamed and doesn't add an extra question to a form that's
 * already asking a fair amount.
 */
export default function Join() {
  useAppLang()
  const nav = useNavigate()
  const { selfEnrollResident } = useData()

  const [form, setForm] = useState({ joinCode: '', flatNumber: '', name: '', phone: '', email: '' })
  const [result, setResult] = useState<'active' | 'pending' | null>(null)
  const [error, setError] = useState('')

  const canSubmit = form.joinCode.trim() && form.flatNumber.trim() && form.name.trim() && form.phone.trim() && form.email.trim()

  const submit = () => {
    if (!canSubmit) return
    setError('')
    const outcome = selfEnrollResident(form)
    if (outcome.ok) setResult(outcome.status)
    else setError(errorCopy[outcome.error] ?? 'કંઈક ખોટું થયું, ફરી પ્રયત્ન કરો.')
  }

  const inputClass = "w-full rounded-xl border border-cream-300 bg-white px-3.5 min-h-[46px] text-[14.5px] focus:outline-none focus:ring-2 focus:ring-saffron-400/50 focus:border-saffron-400"

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-5">
          <PranganBrand variant="symbol-navy" height={38} className="mx-auto mb-3" />
          <h1 className="font-bold text-navy-900 text-[20px]">તમારી સોસાયટીમાં જોડાઓ</h1>
          <p className="text-[13.5px] text-navy-500 mt-1">તમારી કમિટી પાસેથી મળેલો કોડ અને તમારો ફ્લેટ નંબર નાખો.</p>
        </div>

        <Card>
          {result === 'active' ? (
            <div className="text-center py-2">
              <CheckCircle2 size={30} className="text-paid mx-auto mb-2" />
              <p className="text-[15px] text-navy-700 font-semibold">તમે જોડાઈ ગયા છો!</p>
              <p className="text-[13px] text-navy-500 mt-1">હવે લોગિન કરીને તમારો ડેશબોર્ડ જુઓ.</p>
              <Button variant="primary" className="mt-4 w-full" onClick={() => nav('/login')}>લોગિન કરો</Button>
            </div>
          ) : result === 'pending' ? (
            <div className="text-center py-2">
              <Clock3 size={30} className="text-pend mx-auto mb-2" />
              <p className="text-[15px] text-navy-700 font-semibold">તમારી વિનંતી કમિટી પાસે મોકલી છે</p>
              <p className="text-[13px] text-navy-500 mt-1">તમારી વિગતો ફ્લેટના રેકોર્ડ સાથે સીધી મળી નથી, એટલે કમિટી મંજૂરી આપશે. મંજૂરી મળ્યા પછી લોગિન કરી શકશો.</p>
              <Button variant="soft" className="mt-4 w-full" onClick={() => nav('/login')}>લોગિન પર જાઓ</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input value={form.joinCode} onChange={e => setForm({ ...form, joinCode: e.target.value })} placeholder="સોસાયટી કોડ (દા.ત. RAJHANS24)" className={inputClass} />
              <Input value={form.flatNumber} onChange={e => setForm({ ...form, flatNumber: e.target.value })} placeholder="ફ્લેટ નંબર" className={inputClass} />
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="તમારું નામ" className={inputClass} />
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="ફોન નંબર" className={inputClass} />
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ઈમેલ" className={inputClass} />
              {error && <p className="text-[13px] text-over flex items-start gap-1.5"><AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}</p>}
              <Button variant="primary" className="w-full" onClick={submit} disabled={!canSubmit}>જોડાઓ</Button>
            </div>
          )}
        </Card>

        {!result && (
          <p className="text-center text-[12.5px] text-navy-400 mt-4">
            કોડ નથી? <button onClick={() => nav('/login')} className="font-semibold text-saffron-600">લોગિન પર જાઓ</button>
          </p>
        )}
      </div>
    </div>
  )
}

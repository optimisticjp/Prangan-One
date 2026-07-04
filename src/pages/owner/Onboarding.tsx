/**
 * New-society onboarding wizard for the SaaS owner console.
 * Five short steps, everything defaults to a sensible value, modules start
 * all-on. Built for someone who has never used a SaaS admin panel before -
 * see docs/DESIGN_SYSTEM.md "SaaS owner console vs committee-facing UI" for
 * why this one gets more hand-holding than most of the app.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Upload, Sparkles, Store as StoreIcon,
  ReceiptText, Wrench, Bell, FolderOpen, Vote, PartyPopper, Car, BarChart3,
} from 'lucide-react'
import { useData } from '../../lib/store'
import { themePresets } from '../../lib/theme/presets'
import { Button, Card, Field, Input, Select } from '../../components/ui'
import type { SocietyModules, TenantAccessMode } from '../../lib/types'

const steps = ['વિગત', 'બ્રાન્ડિંગ', 'સેટઅપ', 'સુવિધાઓ', 'ખાતરી']

const moduleInfo: { key: keyof SocietyModules; icon: typeof ReceiptText; label: string; sub: string }[] = [
  { key: 'billing', icon: ReceiptText, label: 'બિલિંગ અને ચુકવણી', sub: 'મેન્ટેનન્સ બિલ બનાવવું, ચુકવણી નોંધવી' },
  { key: 'complaints', icon: Wrench, label: 'ફરિયાદ', sub: 'રહેવાસી ફરિયાદ નોંધાવે, કમિટી ઉકેલે' },
  { key: 'notices', icon: Bell, label: 'નોટિસ બોર્ડ', sub: 'જાહેરાત અને સૂચના મૂકવી' },
  { key: 'documents', icon: FolderOpen, label: 'દસ્તાવેજો', sub: 'ઓડિટ, નિયમો, કરાર સાચવવા' },
  { key: 'vendors', icon: StoreIcon, label: 'વેન્ડર / AMC', sub: 'સર્વિસ આપનારા અને કોન્ટ્રાક્ટ મુદત' },
  { key: 'polls', icon: Vote, label: 'મતદાન', sub: 'સભ્યોનો અભિપ્રાય લેવો' },
  { key: 'events', icon: PartyPopper, label: 'ઇવેન્ટ / ફાળો', sub: 'તહેવાર, ફાળો, વોલન્ટિયર' },
  { key: 'parking', icon: Car, label: 'પાર્કિંગ', sub: 'વાહન અને સ્લોટની નોંધ' },
  { key: 'reports', icon: BarChart3, label: 'રિપોર્ટ', sub: 'આવક-ખર્ચનું વિશ્લેષણ' },
]

export default function Onboarding() {
  const { addSociety, addMembership, enterSociety } = useData()
  const nav = useNavigate()
  const [step, setStep] = useState(0)

  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [city, setCity] = useState('સુરત')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')

  const [themeKey, setThemeKey] = useState(themePresets[0].key)
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>()
  const [logoName, setLogoName] = useState('')

  const [maintenanceAmount, setMaintenanceAmount] = useState('1200')
  const [dueDay, setDueDay] = useState('10')
  const [receiptPrefix, setReceiptPrefix] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [tenantAccess, setTenantAccess] = useState<TenantAccessMode>('full')
  const [adminEmail, setAdminEmail] = useState('')

  const [modules, setModules] = useState<SocietyModules>({
    billing: true, complaints: true, notices: true, documents: true,
    vendors: true, polls: true, events: true, parking: true, reports: true,
  })

  const canNext = [
    name.trim() && nameEn.trim() && city.trim() && address.trim(),
    true, // branding: preset always has a default, logo optional
    Number(maintenanceAmount) > 0 && Number(dueDay) >= 1 && Number(dueDay) <= 28,
    true, // modules: any combination is valid, including all off
    true,
  ][step]

  const onLogoFile = (f?: File) => {
    if (!f) return
    setLogoName(f.name)
    const reader = new FileReader()
    reader.onload = () => setLogoDataUrl(typeof reader.result === 'string' ? reader.result : undefined)
    reader.readAsDataURL(f)
  }

  const autoPrefix = () => nameEn.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'SOC'

  const finish = () => {
    const soc = addSociety({
      name: name.trim(), nameEn: nameEn.trim(), city: city.trim(), area: area.trim(),
      address: address.trim(), maintenanceAmount: Number(maintenanceAmount), dueDay: Number(dueDay),
      receiptPrefix: (receiptPrefix.trim() || autoPrefix()).toUpperCase(),
      themeKey, logoDataUrl, supportPhone: supportPhone.trim() || undefined,
      modules: { ownerEnabled: modules, adminVisible: modules }, tenantAccess,
    })
    if (adminEmail.trim()) {
      addMembership({ societyId: soc.id, email: adminEmail.trim(), role: 'society_admin', phone: supportPhone.trim() || undefined })
    }
    enterSociety(soc.id, 'society_admin', 'write')
    nav('/admin')
  }

  return (
    <div className="min-h-screen bg-cream-100 px-4 py-6 sm:py-10">
      <div className="max-w-xl mx-auto">
        <button onClick={() => nav('/owner/societies')} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-navy-500 mb-4">
          <ArrowLeft size={15} /> ઓનર પેનલમાં પાછા
        </button>

        {/* stepper */}
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-saffron-500' : 'bg-cream-300'}`} />
              <div className={`text-[10.5px] font-semibold mt-1.5 text-center ${i === step ? 'text-navy-800' : 'text-navy-300'}`}>{s}</div>
            </div>
          ))}
        </div>

        <Card className="animate-fadeUp">
          {step === 0 && (
            <div className="space-y-3.5">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900">નવી સોસાયટીની વિગત</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">થોડી પાયાની માહિતી, પછી બધું બદલી શકાશે</p>
              </div>
              <Field label="સોસાયટીનું નામ (ગુજરાતીમાં)"><Input value={name} onChange={e => setName(e.target.value)} placeholder="દા.ત. શ્રી હરિ રેસિડન્સી" /></Field>
              <Field label="નામ (English, બિલ/દસ્તાવેજ માટે)"><Input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="e.g. Shree Hari Residency" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="શહેર"><Input value={city} onChange={e => setCity(e.target.value)} /></Field>
                <Field label="વિસ્તાર"><Input value={area} onChange={e => setArea(e.target.value)} placeholder="દા.ત. કતારગામ" /></Field>
              </div>
              <Field label="પૂરું સરનામું"><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="દા.ત. કતારગામ, સુરત" /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900">બ્રાન્ડિંગ</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">રંગ પસંદ કરો, બધું જ યોગ્ય કોન્ટ્રાસ્ટ સાથે તૈયાર છે</p>
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-navy-600 mb-2">રંગ થીમ</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {themePresets.map(p => (
                    <button key={p.key} onClick={() => setThemeKey(p.key)}
                      className={`text-left rounded-xl border-2 p-3 transition-colors ${themeKey === p.key ? 'border-saffron-500 bg-saffron-50/50' : 'border-cream-300 bg-white'}`}>
                      <div className="flex gap-1.5 mb-2">
                        <span className="h-6 w-6 rounded-lg" style={{ background: p.navy['800'].hex }} />
                        <span className="h-6 w-6 rounded-lg" style={{ background: p.saffron['500'].hex }} />
                      </div>
                      <div className="text-[13px] font-semibold text-navy-800 flex items-center gap-1">
                        {p.labelGu}
                        {themeKey === p.key && <Check size={13} className="text-saffron-600" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-navy-600 mb-2">લોગો (વૈકલ્પિક)</div>
                <label className="w-full min-h-[46px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-500 cursor-pointer px-3">
                  <Upload size={16} /> {logoName || 'લોગો ફાઈલ પસંદ કરો'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => onLogoFile(e.target.files?.[0])} />
                </label>
                <p className="text-[12px] text-navy-400 mt-1.5">લોગો ના હોય તો કંઈ વાંધો નહીં, નામ પરથી બેજ બની જશે.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900">બિલિંગ સેટઅપ</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">પછી સેટિંગ્સમાં જઈને બદલી શકાશે</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="માસિક મેન્ટેનન્સ (₹)"><Input type="number" value={maintenanceAmount} onChange={e => setMaintenanceAmount(e.target.value)} /></Field>
                <Field label="ભરવાની છેલ્લી તારીખ" hint="મહિનાની તારીખ, 1-28"><Input type="number" min={1} max={28} value={dueDay} onChange={e => setDueDay(e.target.value)} /></Field>
              </div>
              <Field label="રસીદ પ્રીફિક્સ" hint={`ખાલી રાખો તો આપોઆપ બનશે (દા.ત. ${autoPrefix()})`}>
                <Input value={receiptPrefix} onChange={e => setReceiptPrefix(e.target.value.toUpperCase())} placeholder={autoPrefix()} maxLength={6} />
              </Field>
              <Field label="સપોર્ટ ફોન નંબર (વૈકલ્પિક)"><Input value={supportPhone} onChange={e => setSupportPhone(e.target.value)} placeholder="90000 00000" /></Field>
              <Field label="ભાડૂત એક્સેસ" hint="ભાડૂત લોગિન કરી શકે કે નહીં, અને કેટલું જોઈ શકે">
                <Select value={tenantAccess} onChange={e => setTenantAccess(e.target.value as TenantAccessMode)}>
                  <option value="disabled">બંધ, ભાડૂત લોગિન ના કરી શકે</option>
                  <option value="limited">મર્યાદિત, બિલ+નોટિસ+ફરિયાદ</option>
                  <option value="full">પૂરું, માલિક જેટલું જ</option>
                </Select>
              </Field>
              <Field label="મુખ્ય એડમિનનો ઈમેલ" hint="લોગિન લિંક આ ઈમેલ પર જશે, એકવાર Supabase જોડાય પછી">
                <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-[19px] font-bold text-navy-900">કઈ સુવિધા જોઈએ છે?</h1>
              <p className="text-[13.5px] text-navy-400 mt-0.5 mb-3.5">બધું ચાલુ છે, જે ના જોઈએ તે બંધ કરી શકાય. પછી ગમે ત્યારે સેટિંગ્સમાં બદલી શકાશે.</p>
              <div className="space-y-2">
                {moduleInfo.map(m => (
                  <label key={m.key} className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-3.5 py-3 cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-navy-50 border border-navy-100 text-navy-600 flex items-center justify-center shrink-0"><m.icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-navy-800 text-[14px]">{m.label}</div>
                      <div className="text-[12px] text-navy-400 truncate">{m.sub}</div>
                    </div>
                    <input type="checkbox" checked={modules[m.key]} onChange={e => setModules({ ...modules, [m.key]: e.target.checked })}
                      className="accent-saffron-500 shrink-0" style={{ width: 20, height: 20 }} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900">ખાતરી કરી લો</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">બરાબર લાગે તો સોસાયટી બનાવો</p>
              </div>
              <div className="rounded-xl bg-cream-100 border border-cream-200 p-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between"><span className="text-navy-400">નામ</span><span className="font-semibold text-navy-800">{name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">શહેર / વિસ્તાર</span><span className="font-semibold text-navy-800">{city}{area ? `, ${area}` : ''}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">માસિક મેન્ટેનન્સ</span><span className="font-semibold text-navy-800 num">₹{maintenanceAmount || 0}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">રસીદ પ્રીફિક્સ</span><span className="font-semibold text-navy-800 num">{(receiptPrefix || autoPrefix()).toUpperCase()}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">રંગ થીમ</span><span className="font-semibold text-navy-800">{themePresets.find(p => p.key === themeKey)?.labelGu}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">ચાલુ સુવિધા</span><span className="font-semibold text-navy-800">{Object.values(modules).filter(Boolean).length} / {moduleInfo.length}</span></div>
              </div>
              <div className="flex items-start gap-2 text-[12.5px] text-navy-400 bg-saffron-50 border border-saffron-100 rounded-xl px-3.5 py-2.5">
                <Sparkles size={15} className="shrink-0 mt-0.5 text-saffron-500" />
                સોસાયટી બન્યા પછી તરત જ એના કમિટી પેનલમાં લઈ જવાશે. ફ્લેટ અને સભ્ય પછીથી સભ્યો પેજ પરથી ઉમેરી શકાશે.
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-5 mt-5 border-t border-cream-200">
            {step > 0 && <Button variant="soft" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> પાછળ</Button>}
            <div className="flex-1" />
            {step < steps.length - 1
              ? <Button variant="accent" onClick={() => setStep(step + 1)} disabled={!canNext}>આગળ <ArrowRight size={16} /></Button>
              : <Button variant="accent" onClick={finish}><Check size={16} /> સોસાયટી બનાવો</Button>}
          </div>
        </Card>
      </div>
    </div>
  )
}

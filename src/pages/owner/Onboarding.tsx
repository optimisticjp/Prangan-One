/**
 * New-society onboarding wizard for the SaaS owner console.
 *
 * Ten steps, not five. The earlier, shorter version collected everything
 * up front and only created the society at the very end, punting flats
 * and the first bill run to "later, from the Members page." This version
 * creates the society right after step 1 (with sensible defaults for
 * everything not yet collected), then genuinely walks through importing
 * flats and generating the first month's bills right here - the same
 * "society created, flats imported, maintenance configured, bill preview,
 * bills generated" sequence the product's own roadmap named as a
 * committee's actual first success, not something to leave for later.
 *
 * Because the society exists from step 1 onward, every step after that
 * uses the exact same store functions the rest of the app already uses
 * (addFlatsBulk, previewBillGeneration, generateBills) - nothing here is
 * onboarding-specific plumbing, it's the real admin functions, just
 * reached through a guided flow instead of separate pages.
 *
 * createSociety() calls setOwnerWorkingSociety(), not enterSociety() -
 * this matters, and was actually the site of a real, previously-unnoticed
 * bug. enterSociety() is built for a genuinely different job (an owner
 * entering read-only "view as" support mode for a society), so it changes
 * the acting context rather than just re-scoping the owner's own writes.
 * Using it here meant every step of this wizard past society creation ran
 * in that support context instead of as the owner's own real writes - at
 * the time that silently left the wizard's later steps off the real
 * backend, so a society could look fully set up in the browser that built
 * it while the real database only ever received the bare society record
 * from step 1. setOwnerWorkingSociety() only changes which society the
 * owner's own real writes are scoped to; it never touches role, support
 * mode, or isRealSession, so a real owner stays exactly as real for the
 * whole wizard as they were before starting it.
 *
 * trialStartedAt is deliberately NOT set when the society is created - see
 * the comment on activateSociety in store.tsx. A society sitting mid-wizard
 * is fully writable (a 'trial' society with no trialStartedAt yet never
 * reads as expired), so nothing here is blocked, but the 90-day countdown
 * only starts once the wizard reaches its own explicit "activate" step.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Upload, Sparkles, Store as StoreIcon,
  ReceiptText, Wrench, Bell, FolderOpen, Vote, PartyPopper, Car, BarChart3,
  Users, AlertTriangle, CheckCircle2, Rocket, Eye, SkipForward,
} from 'lucide-react'
import { useData } from '../../lib/store'
import { themePresets } from '../../lib/theme/presets'
import { thisMonth, fmtMonth, inr } from '../../lib/format'
import { parseCsv, validateFlatImport } from '../../lib/csv'
import type { FlatImportResult } from '../../lib/csv'
import { Button, Card, Field, Input, Select, Badge, TableWrap, td, th } from '../../components/ui'
import type { SocietyModules, TenantAccessMode } from '../../lib/types'

const steps = ['વિગત', 'બ્રાન્ડિંગ', 'બિલિંગ', 'ઍક્સેસ', 'સુવિધાઓ', 'ફ્લેટ', 'પૂર્વાવલોકન', 'બિલ', 'સક્રિય', 'પૂર્ણ']

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
  const {
    addSociety, addMembership, setOwnerWorkingSociety, session, uploadSocietyLogoAndSave,
    updateSociety, addFlatsBulk, previewBillGeneration, generateBills, activateSociety, db, society: activeSociety,
  } = useData()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [societyId, setSocietyId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [city, setCity] = useState('સુરત')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')

  const [themeKey, setThemeKey] = useState(themePresets[0].key)
  const [logoName, setLogoName] = useState('')
  const [logoFile, setLogoFile] = useState<File | undefined>()

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

  const [importResult, setImportResult] = useState<FlatImportResult | null>(null)
  const [importDone, setImportDone] = useState<{ added: number; skippedDuplicates: string[] } | null>(null)
  const [billsGenerated, setBillsGenerated] = useState<number | null>(null)
  const [activated, setActivated] = useState(false)

  const autoPrefix = () => nameEn.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'SOC'
  const flatCount = societyId ? db.flats.filter(f => f.societyId === societyId).length : 0
  const preview = societyId ? previewBillGeneration(thisMonth()) : []
  const newBillsCount = preview.filter(p => !p.alreadyExists).length

  const canNext = [
    name.trim() && nameEn.trim() && city.trim() && address.trim(),
    true, // branding: preset always has a default, logo optional
    Number(maintenanceAmount) > 0 && Number(dueDay) >= 1 && Number(dueDay) <= 28,
    true, // access: tenant mode always has a default, admin email optional
    true, // modules: any combination is valid, including all off
    true, // flats: importing is encouraged, not required - can add later too
    true, // preview: just looking
    true, // bill generation: optional, can skip and do it later from Billing
    true, // activate: the button on this step does the work
    true,
  ][step]

  const onLogoFile = (f?: File) => {
    if (!f) return
    setLogoName(f.name)
    setLogoFile(f)
  }

  // The society is created once, right after step 0, with sensible
  // defaults for everything the later steps will fill in - not deferred
  // to the very end. Every step after this one updates that same real
  // record instead of collecting into local state and creating once at
  // the finish line, which is what would have stopped flats and bills
  // from being able to attach to a real society id during the wizard at all.
  const createSociety = () => {
    const soc = addSociety({
      name: name.trim(), nameEn: nameEn.trim(), city: city.trim(), area: area.trim(), address: address.trim(),
      maintenanceAmount: Number(maintenanceAmount) || 1200, dueDay: Number(dueDay) || 10,
      receiptPrefix: autoPrefix(), themeKey, supportPhone: undefined,
      modules: { ownerEnabled: modules, adminVisible: modules }, tenantAccess: 'full',
    })
    setSocietyId(soc.id)
    setOwnerWorkingSociety(soc.id)
    return soc.id
  }

  const goNext = () => {
    if (step === 0 && !societyId) {
      createSociety()
      setStep(1)
      return
    }
    if (step === 1 && logoFile && session.isRealSession && societyId) {
      uploadSocietyLogoAndSave(societyId, logoFile).catch(() => { /* branding still saved either way */ })
    }
    if (step === 1) updateSociety({ themeKey })
    if (step === 2) updateSociety({ maintenanceAmount: Number(maintenanceAmount) || 1200, dueDay: Number(dueDay) || 10, receiptPrefix: (receiptPrefix.trim() || autoPrefix()).toUpperCase() })
    if (step === 3) {
      updateSociety({ supportPhone: supportPhone.trim() || undefined, tenantAccess })
      if (adminEmail.trim() && societyId) {
        addMembership({ societyId, email: adminEmail.trim(), role: 'society_admin', phone: supportPhone.trim() || undefined })
      }
    }
    if (step === 4) updateSociety({ modules: { ownerEnabled: modules, adminVisible: modules } })
    setStep(step + 1)
  }

  const onImportFile = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text)
    setImportResult(validateFlatImport(rows))
    setImportDone(null)
  }
  const confirmImport = () => {
    if (!importResult || importResult.valid.length === 0) return
    const result = addFlatsBulk(importResult.valid)
    setImportDone(result)
    setImportResult(null)
  }

  const doGenerateBills = () => {
    const created = generateBills(thisMonth())
    setBillsGenerated(created)
  }

  const doActivate = () => {
    if (societyId) activateSociety(societyId)
    setActivated(true)
  }

  const finish = () => nav('/admin')

  return (
    <div className="min-h-screen bg-cream-100 px-4 py-6 sm:py-10">
      <div className="max-w-xl mx-auto">
        <button onClick={() => nav('/owner/societies')} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-navy-500 mb-4">
          <ArrowLeft size={15} /> ઓનર પેનલમાં પાછા
        </button>

        {/* stepper */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-saffron-500' : 'bg-cream-300'}`} />
              <div className={`text-[9.5px] font-semibold mt-1.5 text-center ${i === step ? 'text-navy-800' : 'text-navy-300'}`}>{s}</div>
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
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3.5">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900">ઍક્સેસ અને એડમિન</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">કોણ લોગિન કરી શકે, અને પ્રથમ એડમિન કોણ</p>
              </div>
              <Field label="સપોર્ટ ફોન નંબર (વૈકલ્પિક)"><Input value={supportPhone} onChange={e => setSupportPhone(e.target.value)} placeholder="90000 00000" /></Field>
              <Field label="ભાડૂત એક્સેસ" hint="ભાડૂત લોગિન કરી શકે કે નહીં, અને કેટલું જોઈ શકે">
                <Select value={tenantAccess} onChange={e => setTenantAccess(e.target.value as TenantAccessMode)}>
                  <option value="disabled">બંધ, ભાડૂત લોગિન ના કરી શકે</option>
                  <option value="limited">મર્યાદિત, બિલ+નોટિસ+ફરિયાદ</option>
                  <option value="full">પૂરું, માલિક જેટલું જ</option>
                </Select>
              </Field>
              <Field label="મુખ્ય એડમિનનો ઈમેલ" hint="લોગિન લિંક આ ઈમેલ પર જશે">
                <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
              </Field>
            </div>
          )}

          {step === 4 && (
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

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900 flex items-center gap-2"><Users size={19} className="text-navy-400" /> ફ્લેટ ઉમેરો</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">CSV થી એકસાથે ઉમેરો, અથવા પછી સભ્યો પેજ પરથી એક-એક કરીને ઉમેરી શકાશે</p>
              </div>

              {!importResult && !importDone && (
                <div>
                  <p className="text-[13px] text-navy-500 mb-2.5">
                    કોલમ ક્રમ: number, floor, ownerName, phone, email, occupancy (owner/tenant), tenantName, tenantEmail, sqft. પહેલી હરોળ હેડર તરીકે ઓળખાય છે (વૈકલ્પિક).
                  </p>
                  <label className="w-full min-h-[80px] rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 flex flex-col items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-500 cursor-pointer">
                    <Upload size={22} /> CSV ફાઈલ પસંદ કરો
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => onImportFile(e.target.files?.[0])} />
                  </label>
                  {flatCount > 0 && <p className="text-[12.5px] text-paid mt-2 flex items-center gap-1"><CheckCircle2 size={13} /> અત્યારે {flatCount} ફ્લેટ ઉમેરાયેલા છે</p>}
                </div>
              )}

              {importResult && (
                <div>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <Badge tone="green">{importResult.valid.length} યોગ્ય હરોળ</Badge>
                    {importResult.errors.length > 0 && <Badge tone="red">{importResult.errors.length} ભૂલ સાથે</Badge>}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mb-3 max-h-32 overflow-y-auto rounded-lg bg-red-50 border border-red-100 p-2.5 space-y-1">
                      {importResult.errors.map((e, i) => (
                        <div key={i} className="text-[12.5px] text-over flex items-start gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> હરોળ {e.rowIndex}: {e.reason}</div>
                      ))}
                    </div>
                  )}
                  <TableWrap>
                    <thead><tr><th className={th}>ફ્લેટ</th><th className={th}>નામ</th><th className={th}>પ્રકાર</th><th className={th}>ફોન</th></tr></thead>
                    <tbody>
                      {importResult.valid.slice(0, 20).map((r, i) => (
                        <tr key={i}><td className={`${td} num`}>{r.number}</td><td className={td}>{r.ownerName}</td><td className={td}>{r.occupancy === 'tenant' ? 'ભાડૂત' : 'માલિક'}</td><td className={`${td} num`}>{r.phone}</td></tr>
                      ))}
                    </tbody>
                  </TableWrap>
                  {importResult.valid.length > 20 && <p className="text-[12px] text-navy-400 mt-1.5">... અને બીજી {importResult.valid.length - 20} હરોળ</p>}
                  <div className="flex gap-2 pt-4">
                    <Button variant="soft" full onClick={() => setImportResult(null)}>રદ કરો</Button>
                    <Button full onClick={confirmImport} disabled={importResult.valid.length === 0}>{importResult.valid.length} ફ્લેટ ઉમેરો</Button>
                  </div>
                </div>
              )}

              {importDone && (
                <div>
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-paid font-semibold">
                    <CheckCircle2 size={18} /> {importDone.added} ફ્લેટ ઉમેરાયા
                  </div>
                  {importDone.skippedDuplicates.length > 0 && (
                    <div className="mt-2 text-[13px] text-navy-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      આ ફ્લેટ નંબર પહેલેથી હતા, છોડી દીધા: {importDone.skippedDuplicates.join(', ')}
                    </div>
                  )}
                  <Button variant="soft" full className="mt-3" onClick={() => { setImportDone(null) }}>વધુ ફ્લેટ ઉમેરો</Button>
                </div>
              )}

              {flatCount === 0 && !importResult && (
                <p className="text-[12.5px] text-navy-400 flex items-center gap-1.5"><SkipForward size={13} /> અત્યારે છોડી શકાય છે, ફ્લેટ પછીથી સભ્યો પેજ પરથી ઉમેરી શકાશે.</p>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900 flex items-center gap-2"><Eye size={19} className="text-navy-400" /> બિલ પૂર્વાવલોકન</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">{fmtMonth(thisMonth())} મહિનાનું બિલ આવું બનશે, હજુ કંઈ સેવ થયું નથી</p>
              </div>
              {preview.length === 0 ? (
                <div className="rounded-xl bg-cream-100 border border-cream-200 px-4 py-3.5 text-[13.5px] text-navy-500">
                  હજુ કોઈ ફ્લેટ ઉમેરાયેલ નથી, એટલે બિલ બનાવવા માટે કંઈ નથી. પાછળ જઈને ફ્લેટ ઉમેરી શકાય, અથવા આગળ વધીને પછીથી બિલિંગ પેજ પરથી કરી શકાય.
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-cream-100 border border-cream-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-[13.5px] text-navy-500">કુલ {preview.length} ફ્લેટ, {newBillsCount} નવા બિલ</span>
                    <span className="font-bold text-navy-800 num">{inr(preview.reduce((s, p) => s + (p.alreadyExists ? 0 : p.amount), 0))}</span>
                  </div>
                  <TableWrap>
                    <thead><tr><th className={th}>ફ્લેટ</th><th className={th}>રકમ</th></tr></thead>
                    <tbody>
                      {preview.slice(0, 15).map(p => (
                        <tr key={p.flatId}><td className={`${td} num`}>{p.flatNumber}</td><td className={`${td} num`}>{inr(p.amount)}</td></tr>
                      ))}
                    </tbody>
                  </TableWrap>
                  {preview.length > 15 && <p className="text-[12px] text-navy-400 mt-1.5">... અને બીજા {preview.length - 15} ફ્લેટ</p>}
                </>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900 flex items-center gap-2"><ReceiptText size={19} className="text-navy-400" /> પ્રથમ બિલ બનાવો</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">{fmtMonth(thisMonth())} મહિનાના બિલ હમણાં જ બનાવી શકાય, અથવા પછીથી બિલિંગ પેજ પરથી</p>
              </div>
              {billsGenerated !== null ? (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3.5 flex items-center gap-2 text-paid font-semibold">
                  <CheckCircle2 size={18} /> {billsGenerated} બિલ બની ગયા
                </div>
              ) : newBillsCount === 0 ? (
                <p className="text-[13px] text-navy-400 flex items-center gap-1.5"><SkipForward size={13} /> બનાવવા માટે નવું બિલ નથી, આગળ વધો.</p>
              ) : (
                <Button variant="accent" full onClick={doGenerateBills}><ReceiptText size={16} /> {newBillsCount} બિલ બનાવો</Button>
              )}
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900 flex items-center gap-2"><Rocket size={19} className="text-navy-400" /> સોસાયટી સક્રિય કરો</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">90 દિવસનો ફ્રી ટ્રાયલ અહીંથી શરૂ થાય છે, સોસાયટી બની ત્યારથી નહીં</p>
              </div>
              {activated ? (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3.5 flex items-center gap-2 text-paid font-semibold">
                  <CheckCircle2 size={18} /> સોસાયટી સક્રિય થઈ ગઈ, 90 દિવસનો ટ્રાયલ શરૂ
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-cream-100 border border-cream-200 px-4 py-3.5 text-[13.5px] text-navy-500">
                    સોસાયટી અત્યાર સુધી કામચલાઉ સ્થિતિમાં હતી, ટ્રાયલ ગણતરી શરૂ થઈ ન હતી. સક્રિય કરવાથી જ 90 દિવસની ગણતરી શરૂ થશે.
                  </div>
                  <Button variant="accent" full onClick={doActivate}><Rocket size={16} /> સોસાયટી સક્રિય કરો</Button>
                </>
              )}
            </div>
          )}

          {step === 9 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-[19px] font-bold text-navy-900">પૂર્ણ!</h1>
                <p className="text-[13.5px] text-navy-400 mt-0.5">{activeSociety?.nameEn ?? nameEn} તૈયાર છે</p>
              </div>
              <div className="rounded-xl bg-cream-100 border border-cream-200 p-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between"><span className="text-navy-400">નામ</span><span className="font-semibold text-navy-800">{name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">શહેર / વિસ્તાર</span><span className="font-semibold text-navy-800">{city}{area ? `, ${area}` : ''}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">ફ્લેટ</span><span className="font-semibold text-navy-800 num">{flatCount}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">{fmtMonth(thisMonth())} બિલ</span><span className="font-semibold text-navy-800 num">{billsGenerated ?? 0} બન્યા</span></div>
                <div className="flex justify-between"><span className="text-navy-400">સ્થિતિ</span><span className="font-semibold text-navy-800">{activated ? '90-દિવસ ટ્રાયલ ચાલુ' : 'હજુ સક્રિય નથી'}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">ચાલુ સુવિધા</span><span className="font-semibold text-navy-800">{Object.values(modules).filter(Boolean).length} / {moduleInfo.length}</span></div>
              </div>
              <div className="flex items-start gap-2 text-[12.5px] text-navy-400 bg-saffron-50 border border-saffron-100 rounded-xl px-3.5 py-2.5">
                <Sparkles size={15} className="shrink-0 mt-0.5 text-saffron-500" />
                હવે કમિટી પેનલમાં જઈને બાકીનું ગોઠવી શકાય - વધુ ફ્લેટ, નોટિસ, વેન્ડર, બધું સેટિંગ્સ અને સંબંધિત પેજ પરથી.
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-5 mt-5 border-t border-cream-200">
            {step > 0 && <Button variant="soft" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> પાછળ</Button>}
            <div className="flex-1" />
            {step < steps.length - 1
              ? <Button variant="accent" onClick={goNext} disabled={!canNext}>આગળ <ArrowRight size={16} /></Button>
              : <Button variant="accent" onClick={finish}><Check size={16} /> કમિટી પેનલમાં જાઓ</Button>}
          </div>
        </Card>
      </div>
    </div>
  )
}

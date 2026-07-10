import { useState } from 'react'
import { CheckCircle2, Download, RotateCcw, XCircle, ReceiptText, Wrench, Bell, FolderOpen, Store as StoreIcon, Vote, PartyPopper, Car, BarChart3 } from 'lucide-react'
import { useData } from '../../lib/store'
import { permissionMatrix } from '../../lib/permissions'
import { exportJson } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, PageHeader, Progress, SectionTitle, TableWrap, td, th } from '../../components/ui'
import { SetPasswordCard } from '../../components/SetPasswordCard'
import type { SocietyModules } from '../../lib/types'

const moduleInfo: { key: keyof SocietyModules; icon: typeof ReceiptText; label: string }[] = [
  { key: 'billing', icon: ReceiptText, label: 'બિલિંગ અને ચુકવણી' },
  { key: 'complaints', icon: Wrench, label: 'ફરિયાદ' },
  { key: 'notices', icon: Bell, label: 'નોટિસ બોર્ડ' },
  { key: 'documents', icon: FolderOpen, label: 'દસ્તાવેજો' },
  { key: 'vendors', icon: StoreIcon, label: 'વેન્ડર / AMC' },
  { key: 'polls', icon: Vote, label: 'મતદાન' },
  { key: 'events', icon: PartyPopper, label: 'ઇવેન્ટ / ફાળો' },
  { key: 'parking', icon: Car, label: 'પાર્કિંગ' },
  { key: 'reports', icon: BarChart3, label: 'રિપોર્ટ' },
]

export default function Settings() {
  const { db, society, session, updateSociety, resetAll, adminCanToggle } = useData()
  const [form, setForm] = useState({
    name: society.name, address: society.address,
    maintenanceAmount: String(society.maintenanceAmount), dueDay: String(society.dueDay), upiId: society.upiId,
  })
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const save = () => {
    updateSociety({
      name: form.name.trim() || society.name, address: form.address.trim(),
      maintenanceAmount: Number(form.maintenanceAmount) || society.maintenanceAmount,
      dueDay: Number(form.dueDay) || society.dueDay, upiId: form.upiId.trim(),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const toggleAdminVisible = (key: keyof SocietyModules, value: boolean) => {
    updateSociety({ modules: { ...society.modules, adminVisible: { ...society.modules.adminVisible, [key]: value } } })
  }

  const backup = () => exportJson('prangan-one-backup.json', db)
  const used = db.flats.length
  const pct = Math.round((used / society.flatsLimit) * 100)
  const canEditModules = session.role === 'society_admin'

  return (
    <div>
      <PageHeader title="સેટિંગ્સ" sub="સોસાયટીની માહિતી, સુવિધા અને ડેટા" />

      {session.isRealSession && <div className="mb-4"><SetPasswordCard /></div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="animate-fadeUp">
          <h2 className="font-bold text-navy-800 mb-3">સોસાયટીની માહિતી</h2>
          <div className="space-y-3">
            <Field label="સોસાયટીનું નામ"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="સરનામું"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="માસિક મેન્ટેનન્સ (₹)"><Input type="number" value={form.maintenanceAmount} onChange={e => setForm({ ...form, maintenanceAmount: e.target.value })} /></Field>
              <Field label="ભરવાની છેલ્લી તારીખ"><Input type="number" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></Field>
            </div>
            <Field label="UPI ID" hint="રસીદ અને રિમાઇન્ડરમાં બતાવવા માટે"><Input value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })} placeholder="society@upi" /></Field>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button variant="accent" onClick={save}>સાચવો</Button>
            {saved && <span className="text-[13.5px] font-semibold text-paid inline-flex items-center gap-1"><CheckCircle2 size={15} /> સચવાઈ ગયું</span>}
          </div>
        </Card>

        <div>
          <Card className="animate-fadeUp">
            <h2 className="font-bold text-navy-800 mb-2">પ્લાન</h2>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[14px] text-navy-600 capitalize">{society.plan} પ્લાન</span>
              <span className="num text-[13.5px] font-semibold text-navy-700">{used} / {society.flatsLimit} ફ્લેટ</span>
            </div>
            <Progress value={pct} tone={pct > 90 ? 'saffron' : 'navy'} />
            <p className="text-[12.5px] text-navy-400 mt-2">₹10/ફ્લેટ/મહિનો, Prangan One ઓનર દ્વારા મેન્યુઅલી ટ્રેક થાય છે.</p>
          </Card>

          <Card className="mt-4">
            <h2 className="font-bold text-navy-800 mb-1">ડેટા બેકઅપ</h2>
            <p className="text-[13px] text-navy-400 mb-3">
              {session.isRealSession
                ? 'બધો ડેટા JSON ફાઈલમાં ઉતારો. તમારો ડેટા પહેલેથી જ Supabase માં સુરક્ષિત રીતે સચવાયેલો છે.'
                : 'બધો ડેટા JSON ફાઈલમાં ઉતારો. Supabase સાથે જોડ્યા પછી આ ક્લાઉડમાં આપોઆપ સચવાશે.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={backup}><Download size={16} /> બેકઅપ ડાઉનલોડ</Button>
              {!session.isRealSession && (
                !confirmReset
                  ? <Button variant="danger" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> ડેમો ડેટા રીસેટ</Button>
                  : <span className="inline-flex items-center gap-2">
                      <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false) }}>ખરેખર રીસેટ કરો</Button>
                      <Button variant="ghost" onClick={() => setConfirmReset(false)}>રહેવા દો</Button>
                    </span>
              )}
            </div>
          </Card>
        </div>
      </div>

      <SectionTitle>સુવિધાઓ</SectionTitle>
      <Card>
        <p className="text-[12.5px] text-navy-400 mb-3">
          {canEditModules
            ? 'Prangan One એ જે સુવિધા આપી છે, એમાંથી તમે રહેવાસીઓ માટે શું બતાવવું એ પસંદ કરી શકો છો.'
            : 'ફક્ત સોસાયટી એડમિન આ બદલી શકે છે. તમને (કમિટી સભ્ય) આ ફક્ત જોવા માટે દેખાય છે.'}
        </p>
        <div className="space-y-1.5">
          {moduleInfo.map(m => {
            const ownerAllowed = adminCanToggle(m.key)
            return (
              <label key={m.key} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${ownerAllowed && canEditModules ? 'cursor-pointer hover:bg-cream-100' : 'opacity-60'}`}>
                <m.icon size={16} className="text-navy-500 shrink-0" />
                <span className="flex-1 text-[13.5px] text-navy-700">{m.label}</span>
                {!ownerAllowed && <Badge tone="gray">Prangan One પ્લાનમાં નથી</Badge>}
                <input type="checkbox" checked={society.modules.adminVisible[m.key]} disabled={!ownerAllowed || !canEditModules}
                  onChange={e => toggleAdminVisible(m.key, e.target.checked)}
                  className="accent-saffron-500" style={{ width: 18, height: 18 }} />
              </label>
            )
          })}
        </div>
      </Card>

      <SectionTitle>કોણ શું કરી શકે</SectionTitle>
      <TableWrap>
        <thead><tr>
          <th className={th}>કામ</th>
          <th className={`${th} text-center`}>રહેવાસી (માલિક)</th>
          <th className={`${th} text-center`}>રહેવાસી (ભાડૂત)</th>
          <th className={`${th} text-center`}>એકાઉન્ટન્ટ</th>
          <th className={`${th} text-center`}>કમિટી સભ્ય</th>
          <th className={`${th} text-center`}>સોસાયટી એડમિન</th>
        </tr></thead>
        <tbody>
          {permissionMatrix.map((r, i) => (
            <tr key={i} className="hover:bg-cream-50">
              <td className={td}>{r.action}</td>
              {[r.residentOwner, r.residentTenant, r.accountant, r.committeeMember, r.societyAdmin].map((ok, j) => (
                <td key={j} className={`${td} text-center`}>
                  {ok ? <CheckCircle2 size={17} className="text-paid inline" /> : <XCircle size={17} className="text-cream-300 inline" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="text-[12.5px] text-navy-400 mt-2">આ પરવાનગી ફક્ત UI પૂરતી છે. અસલી સુરક્ષા Supabase RLS થી લાગુ થશે (જુઓ supabase/schema.sql).</p>
    </div>
  )
}

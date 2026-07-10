/**
 * Owner console: single-society detail + edit. The module checkboxes here
 * control the OWNER layer (what the society is allowed to use at all);
 * the society's own admin controls the second layer (what's actually
 * shown to residents, within what the owner enabled) from their own
 * Settings page - see src/pages/admin/Settings.tsx.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowLeftRight, Check, Upload, ReceiptText, Wrench, Bell,
  FolderOpen, Store as StoreIcon, Vote, PartyPopper, Car, BarChart3, CheckCircle2, Mail, UserPlus, KeyRound, Copy,
} from 'lucide-react'
import { useData } from '../../lib/store'
import { themePresets } from '../../lib/theme/presets'
import { effectiveStatus, graceDaysRemaining } from '../../lib/subscription'
import { roleLabel } from '../../lib/permissions'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from '../../components/ui'
import { SocietyBadge } from '../../components/SocietyLogo'
import type { Role, SocietyModules, SubscriptionStatus, TenantAccessMode } from '../../lib/types'

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
const statusOptions: { value: SubscriptionStatus; label: string }[] = [
  { value: 'trial', label: 'ટ્રાયલ' }, { value: 'active', label: 'એક્ટિવ' }, { value: 'grace', label: 'ગ્રેસ' },
  { value: 'paused', label: 'થોભાવેલ' }, { value: 'archived', label: 'આર્કાઇવ' },
]
const memberRoles: Role[] = ['society_admin', 'committee_member', 'accountant', 'auditor']

export default function SocietyDetail() {
  const { id } = useParams()
  const { rawDb, updateSocietyById, setSubscriptionStatus, enterSociety, addMembership, session, uploadSocietyLogoAndSave } = useData()
  const nav = useNavigate()

  const soc = rawDb.societies.find(s => s.id === id)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyJoinCode = () => {
    if (!soc) return
    navigator.clipboard?.writeText(soc.joinCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<Role>('committee_member')
  const [logoFile, setLogoFile] = useState<File | undefined>()

  const [form, setForm] = useState(() => soc ? {
    name: soc.name, nameEn: soc.nameEn, city: soc.city, area: soc.area, address: soc.address,
    maintenanceAmount: String(soc.maintenanceAmount), dueDay: String(soc.dueDay),
    receiptPrefix: soc.receiptPrefix, supportPhone: soc.supportPhone ?? '',
    themeKey: soc.themeKey, logoDataUrl: soc.logoDataUrl, logoName: '',
    plan: soc.plan, flatsLimit: String(soc.flatsLimit), tenantAccess: soc.tenantAccess,
    ownerModules: { ...soc.modules.ownerEnabled },
  } : null)

  if (!soc || !form) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-navy-600">આ સોસાયટી મળી નહીં.</div>
          <Button variant="soft" className="mt-3" onClick={() => nav('/owner/societies')}><ArrowLeft size={16} /> સોસાયટીની યાદીમાં પાછા</Button>
        </Card>
      </div>
    )
  }

  const status = effectiveStatus(soc)
  const memberships = rawDb.memberships.filter(m => m.societyId === soc.id)
  const flatCount = rawDb.flats.filter(f => f.societyId === soc.id).length

  const onLogoFile = (f?: File) => {
    if (!f) return
    setForm({ ...form, logoName: f.name })
    setLogoFile(f)
    const reader = new FileReader()
    reader.onload = () => setForm(prev => prev ? { ...prev, logoDataUrl: typeof reader.result === 'string' ? reader.result : prev.logoDataUrl } : prev)
    reader.readAsDataURL(f)
  }

  const save = () => {
    updateSocietyById(soc.id, {
      name: form.name.trim(), nameEn: form.nameEn.trim(), city: form.city.trim(), area: form.area.trim(),
      address: form.address.trim(), maintenanceAmount: Number(form.maintenanceAmount) || soc.maintenanceAmount,
      dueDay: Number(form.dueDay) || soc.dueDay, receiptPrefix: form.receiptPrefix.trim().toUpperCase() || soc.receiptPrefix,
      supportPhone: form.supportPhone.trim() || undefined, themeKey: form.themeKey, logoDataUrl: form.logoDataUrl,
      plan: form.plan, flatsLimit: Number(form.flatsLimit) || soc.flatsLimit, tenantAccess: form.tenantAccess as TenantAccessMode,
      modules: { ownerEnabled: form.ownerModules, adminVisible: soc.modules.adminVisible },
    })
    if (session.isRealSession && logoFile) {
      uploadSocietyLogoAndSave(soc.id, logoFile).catch(() => { /* the rest of the save already went through either way */ })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const enterAsAdmin = () => { enterSociety(soc.id, 'society_admin'); nav('/admin') }
  const addMember = () => {
    if (!newMemberEmail.trim()) return
    addMembership({ societyId: soc.id, email: newMemberEmail.trim(), role: newMemberRole })
    setNewMemberEmail('')
  }

  return (
    <div>
      <button onClick={() => nav('/owner/societies')} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-navy-500 mb-4">
        <ArrowLeft size={15} /> સોસાયટીની યાદીમાં પાછા
      </button>

      <PageHeader title={soc.name} sub={soc.nameEn}
        actions={<Button variant="soft" onClick={enterAsAdmin}><ArrowLeftRight size={16} /> Read-only સપોર્ટ વ્યુ</Button>} />

      {/* subscription lifecycle */}
      <Card className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[13px] text-navy-400">સબ્સ્ક્રિપ્શન સ્થિતિ</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge tone={status === 'active' ? 'green' : status === 'grace' ? 'amber' : status === 'paused' ? 'red' : status === 'archived' ? 'gray' : 'blue'}>
                {statusOptions.find(o => o.value === status)?.label ?? status}
              </Badge>
              {status === 'grace' && <span className="text-[12.5px] text-navy-400">{graceDaysRemaining(soc)} દિવસ બાકી</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(o => (
              <Button key={o.value} variant={o.value === soc.subscriptionStatus ? 'primary' : 'soft'} onClick={() => setSubscriptionStatus(soc.id, o.value)}>
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-bold text-navy-800 mb-3">વિગત</h2>
          <div className="space-y-3">
            <Field label="નામ (ગુજરાતી)"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="નામ (English)"><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="શહેર"><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="વિસ્તાર"><Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></Field>
            </div>
            <Field label="સરનામું"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          </div>

          <h2 className="font-bold text-navy-800 mb-3 mt-5">બિલિંગ સેટઅપ</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="માસિક મેન્ટેનન્સ (₹)"><Input type="number" value={form.maintenanceAmount} onChange={e => setForm({ ...form, maintenanceAmount: e.target.value })} /></Field>
            <Field label="છેલ્લી તારીખ"><Input type="number" min={1} max={28} value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></Field>
            <Field label="રસીદ પ્રીફિક્સ"><Input value={form.receiptPrefix} onChange={e => setForm({ ...form, receiptPrefix: e.target.value.toUpperCase() })} maxLength={6} /></Field>
            <Field label="સપોર્ટ ફોન"><Input value={form.supportPhone} onChange={e => setForm({ ...form, supportPhone: e.target.value })} /></Field>
          </div>

          <h2 className="font-bold text-navy-800 mb-3 mt-5">પ્લાન અને ભાડૂત</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="પ્લાન">
              <Select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                <option value="trial">Trial</option><option value="pro">Pro</option>
              </Select>
            </Field>
            <Field label="ફ્લેટ લિમિટ"><Input type="number" value={form.flatsLimit} onChange={e => setForm({ ...form, flatsLimit: e.target.value })} /></Field>
            <Field label="ભાડૂત એક્સેસ">
              <Select value={form.tenantAccess} onChange={e => setForm({ ...form, tenantAccess: e.target.value as TenantAccessMode })}>
                <option value="disabled">બંધ</option><option value="limited">મર્યાદિત</option><option value="full">પૂરું</option>
              </Select>
            </Field>
            <div className="flex items-end text-[12.5px] text-navy-400">હાલમાં {flatCount} ફ્લેટ નોંધાયેલા</div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold text-navy-800 mb-3">બ્રાન્ડિંગ</h2>
            <div className="flex items-center gap-3 mb-3">
              <SocietyBadge society={{ ...soc, logoDataUrl: form.logoDataUrl, themeKey: form.themeKey, nameEn: form.nameEn }} size={48} />
              <label className="flex-1 min-h-[44px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13px] font-semibold text-navy-500 cursor-pointer px-3">
                <Upload size={15} /> {form.logoName || 'લોગો બદલો'}
                <input type="file" accept="image/*" className="hidden" onChange={e => onLogoFile(e.target.files?.[0])} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themePresets.map(p => (
                <button key={p.key} onClick={() => setForm({ ...form, themeKey: p.key })}
                  className={`text-left rounded-xl border-2 p-2.5 transition-colors ${form.themeKey === p.key ? 'border-saffron-500 bg-saffron-50/50' : 'border-cream-300 bg-white'}`}>
                  <div className="flex gap-1.5 mb-1.5">
                    <span className="h-5 w-5 rounded-md" style={{ background: p.navy['800'].hex }} />
                    <span className="h-5 w-5 rounded-md" style={{ background: p.saffron['500'].hex }} />
                  </div>
                  <div className="text-[12px] font-semibold text-navy-800 flex items-center gap-1">
                    {p.labelGu}
                    {form.themeKey === p.key && <Check size={12} className="text-saffron-600" />}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-bold text-navy-800 mb-1">સુવિધાઓ (ઓનર લેયર)</h2>
            <p className="text-[12px] text-navy-400 mb-3">આ સોસાયટીને શું વાપરવાની છૂટ છે. કમિટી પોતાના તરફથી બીજું લેયર સેટિંગ્સમાં સંભાળે છે.</p>
            <div className="space-y-1.5">
              {moduleInfo.map(m => (
                <label key={m.key} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-cream-100">
                  <m.icon size={16} className="text-navy-500 shrink-0" />
                  <span className="flex-1 text-[13.5px] text-navy-700">{m.label}</span>
                  <input type="checkbox" checked={form.ownerModules[m.key]}
                    onChange={e => setForm({ ...form, ownerModules: { ...form.ownerModules, [m.key]: e.target.checked } })}
                    className="accent-saffron-500" style={{ width: 18, height: 18 }} />
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <h2 className="font-bold text-navy-800 mb-1 inline-flex items-center gap-2"><KeyRound size={17} /> રહેવાસી જોડાવા કોડ</h2>
        <p className="text-[12.5px] text-navy-400 mb-3">આ કોડ WhatsApp ગ્રુપ કે નોટિસ બોર્ડ પર શેર કરો. રહેવાસી pranganone.com/join પર આ કોડ અને પોતાનો ફ્લેટ નંબર નાખીને જોડાઈ શકે છે.</p>
        <div className="flex items-center gap-3">
          <div className="font-mono font-bold text-[20px] text-navy-900 bg-cream-100 rounded-lg px-4 py-2 tracking-wide">{soc.joinCode}</div>
          <Button variant="soft" onClick={copyJoinCode}><Copy size={15} /> {copied ? 'કોપી થયું!' : 'કોપી કરો'}</Button>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold text-navy-800 mb-3">સભ્યો (memberships)</h2>
        <div className="space-y-2 mb-3">
          {memberships.map(m => (
            <div key={m.id} className="flex items-center justify-between text-[13.5px] border-b border-cream-100 pb-2 last:border-0">
              <div className="inline-flex items-center gap-2"><Mail size={14} className="text-navy-400" /> {m.email}</div>
              <Badge tone="gray">{roleLabel[m.role]}</Badge>
            </div>
          ))}
          {memberships.length === 0 && <p className="text-[13px] text-navy-400">હજુ કોઈ સભ્ય ઉમેરાયો નથી.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="ઈમેલ" className="flex-1 min-w-40" />
          <Select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as Role)} className="!w-auto">
            {memberRoles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </Select>
          <Button variant="soft" onClick={addMember}><UserPlus size={16} /> ઉમેરો</Button>
        </div>
      </Card>

      <div className="flex items-center gap-3 mt-4 sticky bottom-4">
        <Card className="flex-1 flex items-center justify-between !py-3">
          <span className="text-[12.5px] text-navy-400">ફેરફાર સાચવવાનું ભૂલશો નહીં</span>
          <div className="flex items-center gap-3">
            {saved && <span className="text-[13px] font-semibold text-paid inline-flex items-center gap-1"><CheckCircle2 size={15} /> સચવાઈ ગયું</span>}
            <Button variant="accent" onClick={save}>ફેરફાર સાચવો</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

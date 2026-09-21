import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Check, Clock3, Mail, MapPin, Phone, RefreshCw, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Card, Field, Modal, PageHeader, Textarea } from '../../components/ui'
import { useToast } from '../../components/Toast'

interface RequestRow {
  id: string
  business_name: string
  requester_email: string
  requester_name: string
  requester_phone: string | null
  city: string | null
  business_type: string | null
  status: 'pending' | 'approved' | 'rejected'
  decision_note: string | null
  business_id: string | null
  created_at: string
  decided_at: string | null
}

const tone: Record<RequestRow['status'], 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
}
const label: Record<RequestRow['status'], string> = {
  pending: 'મંજૂરી બાકી',
  approved: 'મંજૂર',
  rejected: 'નામંજૂર',
}

export default function OwnerBusinesses() {
  const toast = useToast()
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<RequestRow | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase
      .from('business_onboarding_requests')
      .select('id,business_name,requester_email,requester_name,requester_phone,city,business_type,status,decision_note,business_id,created_at,decided_at')
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setRows((data ?? []) as unknown as RequestRow[])
  }, [toast])

  useEffect(() => { void load() }, [load])

  const pending = useMemo(() => rows.filter(r => r.status === 'pending'), [rows])
  const history = useMemo(() => rows.filter(r => r.status !== 'pending'), [rows])

  const approve = async (row: RequestRow) => {
    if (!supabase) return
    setBusy(row.id)
    const { error } = await supabase.rpc('approve_business_onboarding', { target_request: row.id })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(row.business_name + ' મંજૂર થયું')
      await load()
    }
    setBusy(null)
  }

  const reject = async () => {
    if (!supabase || !rejecting) return
    setBusy(rejecting.id)
    const { error } = await supabase.rpc('reject_business_onboarding', {
      target_request: rejecting.id,
      target_note: rejectNote.trim() || null,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(rejecting.business_name + ' નામંજૂર થયું')
      setRejecting(null)
      setRejectNote('')
      await load()
    }
    setBusy(null)
  }

  return (
    <div>
      <PageHeader
        title="બિઝનેસ ઓનબોર્ડિંગ"
        sub="Business Money workspace શરૂ થાય તે પહેલાં દરેક નવી બિઝનેસ વિનંતી અહીં મંજૂર કરો."
        actions={<Button variant="soft" loading={loading} onClick={load}><RefreshCw size={15} /> રિફ્રેશ</Button>}
      />

      <div className="mb-4 rounded-xl bg-navy-50 border border-navy-100 px-3.5 py-3 text-[12.5px] text-navy-600">
        <strong>મંજૂરી પછી જ workspace બને છે.</strong> મંજૂરીથી પ્રથમ admin partner, Cash/UPI accounts અને ledger setup બનાવાય છે. Pending request ને business data access મળતું નથી.
      </div>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Clock3 size={17} className="text-pend" />
          <h2 className="font-bold text-navy-900">મંજૂરી બાકી ({pending.length})</h2>
        </div>
        {pending.length === 0 && <Card><p className="text-[13px] text-navy-400">હાલ કોઈ બિઝનેસ મંજૂરીની રાહમાં નથી.</p></Card>}
        <div className="space-y-3">
          {pending.map(row => (
            <RequestCard
              key={row.id}
              row={row}
              busy={busy === row.id}
              onApprove={() => approve(row)}
              onReject={() => { setRejecting(row); setRejectNote('') }}
            />
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-5">
          <h2 className="font-bold text-navy-900 mb-2">તાજેતરનો ઇતિહાસ</h2>
          <div className="space-y-2">
            {history.map(row => (
              <Card key={row.id} className="!p-3">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness size={16} className="text-navy-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-navy-800 truncate">{row.business_name}</div>
                    <div className="text-[10.5px] text-navy-400">{row.requester_name} · {new Date(row.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <Badge tone={tone[row.status]}>{label[row.status]}</Badge>
                </div>
                {row.decision_note && <p className="mt-2 text-[11.5px] text-navy-500 bg-cream-100 rounded-lg px-2.5 py-2">{row.decision_note}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal open={!!rejecting} onClose={() => { if (!busy) setRejecting(null) }} title="બિઝનેસ વિનંતી નામંજૂર કરો">
        {rejecting && (
          <p className="text-[13px] text-navy-500">
            <strong>{rejecting.business_name}</strong> માટે કારણ લખી શકો છો. આ requester ને ફરી અરજી કરતી વખતે દેખાશે.
          </p>
        )}
        <Field label="કારણ / નોંધ">
          <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} className="min-h-[90px]" placeholder="Optional reason" />
        </Field>
        <Button variant="danger" full loading={!!busy} onClick={reject}><X size={15} /> નામંજૂર કરો</Button>
      </Modal>
    </div>
  )
}

function RequestCard({ row, busy, onApprove, onReject }: {
  row: RequestRow
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-saffron-50 text-saffron-700 flex items-center justify-center shrink-0">
          <BriefcaseBusiness size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-navy-900">{row.business_name}</div>
          <div className="text-[12px] text-navy-400">{row.requester_name} · {new Date(row.created_at).toLocaleString('en-IN')}</div>
        </div>
        <Badge tone="amber">મંજૂરી બાકી</Badge>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-1.5 text-[12px] text-navy-600">
        <a href={'mailto:' + row.requester_email} className="min-h-[36px] rounded-lg bg-cream-100 px-2.5 flex items-center gap-1.5">
          <Mail size={13} /> <span className="truncate">{row.requester_email}</span>
        </a>
        {row.requester_phone && (
          <a href={'tel:' + row.requester_phone} className="min-h-[36px] rounded-lg bg-cream-100 px-2.5 flex items-center gap-1.5">
            <Phone size={13} /> {row.requester_phone}
          </a>
        )}
        {row.city && <div className="min-h-[36px] rounded-lg bg-cream-100 px-2.5 flex items-center gap-1.5"><MapPin size={13} /> {row.city}</div>}
        {row.business_type && <div className="min-h-[36px] rounded-lg bg-cream-100 px-2.5 flex items-center gap-1.5"><BriefcaseBusiness size={13} /> {row.business_type}</div>}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="accent" className="flex-1" loading={busy} onClick={onApprove}><Check size={15} /> મંજૂર કરો</Button>
        <Button variant="danger" className="flex-1" disabled={busy} onClick={onReject}><X size={15} /> નામંજૂર</Button>
      </div>
    </Card>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Phone, Mail, KeyRound, Loader2 } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { supabaseConfigured } from '../../lib/supabase'
import { fetchPublicLeads, updateLeadInSupabase } from '../../lib/leads'
import { Badge, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import type { PublicLead } from '../../lib/types'

const statusLabel: Record<PublicLead['status'], string> = { new: 'નવી', contacted: 'સંપર્ક થયો', converted: 'ક્લાયન્ટ બન્યા', closed: 'બંધ' }
const statusTone: Record<PublicLead['status'], 'saffron' | 'blue' | 'green' | 'gray'> = { new: 'saffron', contacted: 'blue', converted: 'green', closed: 'gray' }

export default function OwnerLeads() {
  const { rawDb, updateLeadStatus } = useData()
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [realLeads, setRealLeads] = useState<PublicLead[] | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    fetchPublicLeads().then(l => { if (!cancelled) { setRealLeads(l); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) }) // stays null on failure, falls back below rather than showing a broken page
    return () => { cancelled = true }
  }, [])

  const leads = supabaseConfigured
    ? [...(realLeads ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [...rawDb.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const setStatus = async (id: string, status: PublicLead['status'], internalNote?: string) => {
    if (supabaseConfigured) {
      setRealLeads(ls => (ls ?? []).map(l => l.id === id ? { ...l, status, ...(internalNote !== undefined && { internalNote }) } : l))
      try { await updateLeadInSupabase(id, { status, internalNote }) } catch { /* optimistic update already applied; nothing else to do without in-app error reporting yet */ }
    } else {
      updateLeadStatus(id, status, internalNote)
    }
  }

  // People who tried to log in with a real, verified email that matched
  // no membership anywhere - see AuthCallback.tsx/NoAccess.tsx. Grouped by
  // email with a count: someone trying more than once is a stronger
  // signal than a single attempt. Deliberately just the email, kept
  // separate from the lead inbox above - these people didn't agree to
  // being contacted about anything, they just tried to log in.
  const unmatchedByEmail = useMemo(() => {
    const groups = new Map<string, { email: string; count: number; latest: string }>()
    for (const a of rawDb.unmatchedLoginAttempts) {
      const g = groups.get(a.email)
      if (g) { g.count++; if (a.at > g.latest) g.latest = a.at }
      else groups.set(a.email, { email: a.email, count: 1, latest: a.at })
    }
    return [...groups.values()].sort((a, b) => b.latest.localeCompare(a.latest))
  }, [rawDb.unmatchedLoginAttempts])

  return (
    <div>
      <PageHeader title="લીડ ઈનબોક્સ" sub={`કુલ ${leads.length} લીડ, પબ્લિક વેબસાઈટના ફોર્મ પરથી`} />

      {loading ? (
        <Card><div className="flex items-center justify-center py-6"><Loader2 size={22} className="animate-spin text-navy-400" /></div></Card>
      ) : (
        <>
          {unmatchedByEmail.length > 0 && (
            <Card className="mb-4">
              <h2 className="font-bold text-navy-800 mb-1 inline-flex items-center gap-2"><KeyRound size={17} /> લોગિન પ્રયત્નો, કોઈ સોસાયટી મળી નહીં ({unmatchedByEmail.length})</h2>
              <p className="text-[12.5px] text-navy-400 mb-3">આ લોકોએ સાચો ઈમેલ વેરિફાય કરીને લોગિનનો પ્રયત્ન કર્યો, પણ કોઈ સોસાયટી સાથે જોડાયેલા નથી. કંઈ પણ સંપર્ક વિનંતી નથી, ફક્ત રસનું સંકેત છે.</p>
              <div className="space-y-1.5">
                {unmatchedByEmail.map(g => (
                  <div key={g.email} className="flex items-center justify-between text-[13.5px] border-b border-cream-100 pb-1.5 last:border-0">
                    <a href={`mailto:${g.email}`} className="hover:text-saffron-600">{g.email}</a>
                    <div className="flex items-center gap-3 text-navy-400 text-[12.5px]">
                      {g.count > 1 && <span className="font-semibold text-saffron-600">{g.count}x</span>}
                      <span>{fmtDate(g.latest)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {leads.length === 0 && <Card><p className="text-navy-400">હજુ કોઈ લીડ નથી.</p></Card>}
          <div className="space-y-3">
            {leads.map(l => (
              <Card key={l.id}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold text-navy-900">{l.name} · {l.societyName}</div>
                    <div className="text-[13px] text-navy-400">{l.city} · {l.flatCount} ફ્લેટ · {l.role}</div>
                  </div>
                  <Badge tone={statusTone[l.status]}>{statusLabel[l.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-[13.5px] text-navy-600">
                  <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 hover:text-saffron-600"><Phone size={14} /> {l.phone}</a>
                  <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 hover:text-saffron-600"><Mail size={14} /> {l.email}</a>
                  <span className="text-navy-400">{fmtDate(l.createdAt)}</span>
                </div>
                {l.message && <p className="text-[13.5px] text-navy-600 mt-2 bg-cream-100 border border-cream-200 rounded-lg px-3 py-2">{l.message}</p>}
                {l.internalNote && <p className="text-[12.5px] text-navy-500 mt-2">આંતરિક નોંધ: {l.internalNote}</p>}
                <div className="flex flex-wrap items-end gap-2 mt-3">
                  <Field label="સ્થિતિ બદલો">
                    <Select value={l.status} onChange={e => setStatus(l.id, e.target.value as PublicLead['status'])}>
                      <option value="new">નવી</option><option value="contacted">સંપર્ક થયો</option><option value="converted">ક્લાયન્ટ બન્યા</option><option value="closed">બંધ</option>
                    </Select>
                  </Field>
                  <Input value={noteDraft[l.id] ?? ''} onChange={e => setNoteDraft(s => ({ ...s, [l.id]: e.target.value }))} placeholder="નોંધ ઉમેરો..." className="flex-1 min-w-40" />
                  <button onClick={() => { if (noteDraft[l.id]?.trim()) { setStatus(l.id, l.status, noteDraft[l.id].trim()); setNoteDraft(s => ({ ...s, [l.id]: '' })) } }}
                    className="text-[13px] font-semibold text-saffron-600 h-[46px] px-1">સાચવો</button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

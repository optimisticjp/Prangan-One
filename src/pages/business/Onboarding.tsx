import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { BriefcaseBusiness, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import { PranganBrand } from '../../components/PranganBrand'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'

export default function BusinessOnboarding() {
  const { authenticated, loading, memberships, onboardingRequest, requestBusiness, refreshAccess } = useBusiness()
  const toast = useToast()
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (onboardingRequest?.status === 'rejected') {
      setName(onboardingRequest.businessName)
      setOwnerName(onboardingRequest.requesterName)
      setPhone(onboardingRequest.requesterPhone ?? '')
      setCity(onboardingRequest.city ?? '')
      setBusinessType(onboardingRequest.businessType ?? '')
    }
  }, [onboardingRequest])

  if (loading) return null
  if (!authenticated) return <Navigate to="/login" replace />
  if (memberships.length > 0) return <Navigate to="/business" replace />

  const submit = async () => {
    if (!name.trim() || !ownerName.trim()) return
    setSaving(true)
    try {
      await requestBusiness({ name, ownerName, phone, city, businessType })
      toast.success('Business request sent for owner approval')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send business request')
    } finally {
      setSaving(false)
    }
  }

  const checkStatus = async () => {
    setChecking(true)
    try {
      await refreshAccess()
      toast.info('Approval status refreshed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh status')
    } finally {
      setChecking(false)
    }
  }

  if (onboardingRequest?.status === 'pending') {
    return (
      <StatusScreen
        icon={Clock3}
        eyebrow="REQUEST RECEIVED"
        title={onboardingRequest.businessName + ' is waiting for approval'}
        body="Your Business Money workspace has not been created yet. The Prangan One owner must review and approve this onboarding request first."
      >
        <div className="rounded-xl bg-cream-100 border border-cream-200 px-3 py-2.5 text-left text-[12px] text-navy-600">
          <div><strong>Requested by:</strong> {onboardingRequest.requesterName}</div>
          {onboardingRequest.city && <div><strong>City:</strong> {onboardingRequest.city}</div>}
          {onboardingRequest.businessType && <div><strong>Business:</strong> {onboardingRequest.businessType}</div>}
        </div>
        <Button full variant="soft" loading={checking} onClick={checkStatus}>
          <RefreshCw size={15} /> Check approval status
        </Button>
        <p className="text-[11px] text-navy-400 text-center">
          After approval, refreshing this page will open the business workspace automatically.
        </p>
      </StatusScreen>
    )
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-4">
          <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-2" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-saffron-50 border border-saffron-100 text-saffron-700 px-2.5 py-1 text-[10.5px] font-bold">
            <BriefcaseBusiness size={13} /> BUSINESS MONEY
          </div>
          <h1 className="text-[22px] font-bold text-navy-900 mt-2">Request a business workspace</h1>
          <p className="text-[12.5px] text-navy-400 mt-1">
            First send the business details. Prangan One reviews the request before any ledger or financial workspace is activated.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
          <Step n="1" text="Request" active />
          <Step n="2" text="Owner approval" />
          <Step n="3" text="Start ledger" />
        </div>

        {onboardingRequest?.status === 'rejected' && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-over">
              <XCircle size={15} /> Previous request was not approved
            </div>
            <p className="text-[11.5px] text-navy-500 mt-1">
              {onboardingRequest.decisionNote || 'Please review the details and submit a new request.'}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3">
          <Field label="Business name">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. KLAIRE GLOBAL" autoFocus />
          </Field>
          <Field label="Your name">
            <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Primary contact / first admin" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mobile number">
              <Input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="City">
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Surat" />
            </Field>
          </div>
          <Field label="Business type">
            <Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="Trading, workshop, service, manufacturing…" />
          </Field>

          <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 flex items-start gap-2">
            <ShieldCheck size={16} className="text-navy-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-navy-600">
              No business data, accounts, partners or ledger access are created until the platform owner approves this request.
            </p>
          </div>

          <Button full loading={saving} disabled={!name.trim() || !ownerName.trim()} onClick={submit}>
            Send for owner approval
          </Button>
        </div>
      </div>
    </main>
  )
}

function Step({ n, text, active = false }: { n: string; text: string; active?: boolean }) {
  return (
    <div className={\`rounded-xl border px-1.5 py-2 \${active ? 'bg-saffron-50 border-saffron-200 text-saffron-800' : 'bg-white border-cream-200 text-navy-400'}\`}>
      <div className="text-[10px] font-bold">{n}</div>
      <div className="text-[10.5px] font-semibold leading-tight">{text}</div>
    </div>
  )
}

function StatusScreen({ icon: Icon, eyebrow, title, body, children }: {
  icon: typeof Clock3
  eyebrow: string
  title: string
  body: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 flex items-start justify-center">
      <div className="max-w-md w-full text-center">
        <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
        <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-50 text-pend flex items-center justify-center">
          <Icon size={26} />
        </div>
        <div className="text-[10.5px] font-bold tracking-wide text-navy-400 mt-3">{eyebrow}</div>
        <h1 className="text-[21px] font-bold text-navy-900 mt-1">{title}</h1>
        <p className="text-[12.5px] leading-relaxed text-navy-500 mt-2">{body}</p>
        <div className="mt-4 space-y-2.5">{children}</div>
      </div>
    </main>
  )
}

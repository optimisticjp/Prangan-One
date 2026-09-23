import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft, ArrowRightLeft, ArrowUpRight, ChevronDown, ChevronUp, HandCoins,
  Landmark, Mic, ReceiptText, Star, Upload, UserRound, WalletCards,
} from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'
import { useToast } from '../Toast'
import { useBusiness } from '../../lib/business/store'
import { businessTransactionHelp } from '../../lib/business/finance'
import {
  getBusinessEntryDefaults, getBusinessFavorites, saveBusinessEntryDefaults, saveBusinessFavorite,
} from '../../lib/business/preferences'
import { useBusinessLanguage } from '../../lib/business/i18n'
import type { SerializableTransactionInput } from '../../lib/business/preferences'
import type { BusinessPaidBy, BusinessPaymentStatus, BusinessTransactionKind } from '../../lib/business/types'

type ComposerKind = Exclude<BusinessTransactionKind, 'reversal' | 'personal_expense'>
type PrimaryChoice = 'income' | 'expense' | 'partner_paid' | 'transfer'

const extraKinds: Array<{ kind: ComposerKind; label: string; icon: typeof ReceiptText }> = [
  { kind: 'partner_capital', label: 'Partner capital', icon: Landmark },
  { kind: 'partner_advance', label: 'Partner loan to business', icon: HandCoins },
  { kind: 'reimbursement', label: 'Reimburse partner', icon: ReceiptText },
  { kind: 'withdrawal', label: 'Partner withdrawal', icon: ArrowUpRight },
  { kind: 'refund', label: 'Refund received', icon: WalletCards },
]

const expenseCategoryOrder = [
  'Ad Spend / Marketing',
  'Courier / Shipping',
  'Packaging Material',
  'Purchase / Inventory',
  'Salaries / Contractor',
  'Legal / Professional Fees',
  'Food / Staff Welfare',
  'Rent / Warehouse',
  'Utilities / Internet',
  'Software / Subscriptions',
  'Repairs / Maintenance',
  'Travel / Conveyance',
  'Printing / Stationery',
  'Payment Gateway / Bank Charges',
  'Other / Miscellaneous',
] as const

const expenseCategoryRank = new Map<string, number>(
  expenseCategoryOrder.map((name, index) => [name, index]),
)

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechCtor = new () => SpeechRecognitionLike

export function QuickTransactionSheet({
  open,
  initialKind,
  initialPreset,
  onClose,
}: {
  open: boolean
  initialKind: ComposerKind
  initialPreset?: SerializableTransactionInput | null
  onClose: () => void
}) {
  const { data, canWrite, postTransaction, attachProof } = useBusiness()
  const toast = useToast()
  const { language, t } = useBusinessLanguage()
  const businessId = data.business?.id ?? ''

  const [kind, setKind] = useState<ComposerKind>(initialKind)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [note, setNote] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<Exclude<BusinessPaymentStatus, 'partial'>>('paid')
  const [paidBy, setPaidBy] = useState<BusinessPaidBy>('business')
  const [dueDate, setDueDate] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [showExtraKinds, setShowExtraKinds] = useState(false)
  const [saving, setSaving] = useState(false)
  const [listening, setListening] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedInput, setSavedInput] = useState<SerializableTransactionInput | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [favoriteLabel, setFavoriteLabel] = useState('')
  const [favorites, setFavorites] = useState(() => businessId ? getBusinessFavorites(businessId) : [])

  const activeAccounts = data.accounts.filter(a => a.active)
  const activePartners = data.partners.filter(p => p.active)

  const applyPreset = (preset: SerializableTransactionInput) => {
    setKind(preset.kind as ComposerKind)
    setAmount(preset.amount ? String(preset.amount) : '')
    setAccountId(preset.accountId ?? activeAccounts[0]?.id ?? '')
    setToAccountId(preset.toAccountId ?? activeAccounts[1]?.id ?? '')
    setPartnerId(preset.partnerId ?? activePartners[0]?.id ?? '')
    setCategoryId(preset.categoryId ?? '')
    setCounterparty(preset.counterparty ?? '')
    setNote(preset.note ?? '')
    setPaymentStatus(preset.paymentStatus === 'unpaid' ? 'unpaid' : 'paid')
    setPaidBy(preset.paidBy ?? 'business')
    setDueDate(preset.dueDate ?? '')
  }

  useEffect(() => {
    if (!open || !businessId) return
    const defaults = getBusinessEntryDefaults(businessId)
    const baseAccount = defaults.accountId && activeAccounts.some(a => a.id === defaults.accountId)
      ? defaults.accountId
      : activeAccounts[0]?.id ?? ''
    const basePartner = defaults.partnerId && activePartners.some(p => p.id === defaults.partnerId)
      ? defaults.partnerId
      : activePartners[0]?.id ?? ''

    setSavedId(null)
    setSavedInput(null)
    setFavoriteLabel('')
    setShowMore(false)
    setShowExtraKinds(false)
    setKind(initialKind)
    setAmount('')
    setAccountId(baseAccount ?? '')
    setToAccountId(activeAccounts.find(a => a.id !== baseAccount)?.id ?? '')
    setPartnerId(basePartner ?? '')
    setCategoryId(defaults.categoryId ?? '')
    setCounterparty('')
    setNote('')
    setPaymentStatus(defaults.paymentStatus ?? 'paid')
    setPaidBy(defaults.paidBy ?? 'business')
    setDueDate('')
    setFavorites(getBusinessFavorites(businessId))

    if (initialPreset) applyPreset(initialPreset)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialKind, initialPreset, businessId])

  useEffect(() => {
    const sync = () => { if (businessId) setFavorites(getBusinessFavorites(businessId)) }
    window.addEventListener('prangan-business-favorites', sync)
    return () => window.removeEventListener('prangan-business-favorites', sync)
  }, [businessId])

  const isExpense = kind === 'expense'
  const isIncome = kind === 'income'
  const isOpenItem = isExpense || isIncome
  const needsAccount = isExpense
    ? paymentStatus === 'paid' && paidBy === 'business'
    : isIncome
      ? paymentStatus === 'paid'
      : true
  const needsPartner = isExpense
    ? paymentStatus === 'paid' && paidBy === 'partner'
    : ['partner_capital','partner_advance','reimbursement','withdrawal'].includes(kind)
  const showCategory = ['income','expense','refund'].includes(kind)

  const relevantCategories = useMemo(() => {
    const filtered = data.categories.filter(c =>
      c.active && (kind === 'income' || kind === 'refund' ? c.kind !== 'expense' : c.kind !== 'income'),
    )
    if (kind !== 'expense') return filtered
    return [...filtered].sort((a, b) =>
      (expenseCategoryRank.get(a.name) ?? 999) - (expenseCategoryRank.get(b.name) ?? 999)
      || a.name.localeCompare(b.name),
    )
  }, [data.categories, kind])

  const valid = canWrite
    && Number(amount) > 0
    && (!needsAccount || !!accountId)
    && (!needsPartner || !!partnerId)
    && (kind !== 'transfer' || (!!toAccountId && toAccountId !== accountId))

  const choosePrimary = (choice: PrimaryChoice) => {
    if (choice === 'partner_paid') {
      setKind('expense')
      setPaymentStatus('paid')
      setPaidBy('partner')
      return
    }
    setKind(choice)
    if (choice === 'expense') {
      setPaymentStatus('paid')
      setPaidBy('business')
    }
    if (choice === 'income') {
      setPaymentStatus('paid')
      setPaidBy('business')
    }
  }

  const primaryActive = (choice: PrimaryChoice) =>
    choice === 'partner_paid'
      ? kind === 'expense' && paymentStatus === 'paid' && paidBy === 'partner'
      : kind === choice && !(choice === 'expense' && paidBy === 'partner' && paymentStatus === 'paid')

  const submit = async () => {
    if (!valid || !businessId) return
    setSaving(true)
    const input: SerializableTransactionInput = {
      kind,
      amount: Number(amount),
      accountId: needsAccount ? accountId : null,
      toAccountId: kind === 'transfer' ? toAccountId : null,
      partnerId: needsPartner ? partnerId : null,
      categoryId: showCategory ? (categoryId || null) : null,
      counterparty,
      note,
      paymentStatus: isOpenItem ? paymentStatus : undefined,
      paidBy: isExpense && paymentStatus === 'paid' ? paidBy : undefined,
      dueDate: isOpenItem && paymentStatus === 'unpaid' ? (dueDate || null) : null,
    }

    try {
      const id = await postTransaction(input)
      saveBusinessEntryDefaults(businessId, {
        accountId: input.accountId,
        partnerId: input.partnerId,
        categoryId: input.categoryId,
        paymentStatus: input.paymentStatus,
        paidBy: input.paidBy,
      })
      setSavedId(id)
      setSavedInput(input)
      setFavoriteLabel(counterparty || data.categories.find(c => c.id === categoryId)?.name || businessTransactionHelp[kind].tag)
      toast.success(id.startsWith('offline:') ? 'Saved on this device. It will sync when online.' : 'Saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save transaction')
    } finally {
      setSaving(false)
    }
  }

  const addProof = async (file: File | null) => {
    if (!file || !savedId || savedId.startsWith('offline:')) return
    setProofUploading(true)
    try {
      await attachProof(savedId, file)
      toast.success('Proof attached')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not attach proof')
    } finally {
      setProofUploading(false)
    }
  }

  const saveFavorite = () => {
    if (!businessId || !savedInput) return
    saveBusinessFavorite(businessId, favoriteLabel || 'Favourite', savedInput)
    setFavorites(getBusinessFavorites(businessId))
    toast.success('Saved as favourite')
  }

  const addAnother = () => {
    setSavedId(null)
    setSavedInput(null)
    setFavoriteLabel('')
    setAmount('')
    setCounterparty('')
    setNote('')
    setDueDate('')
    setShowMore(false)
  }

  const startVoice = () => {
    const host = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
    const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition
    if (!Ctor) {
      toast.error('Voice entry is not supported in this browser.')
      return
    }

    const recognition = new Ctor()
    recognition.lang = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      applyVoice(transcript)
      setListening(false)
    }
    recognition.onerror = () => {
      setListening(false)
      toast.error('Could not understand the voice entry.')
    }
    recognition.onend = () => setListening(false)
    setListening(true)
    recognition.start()
  }

  const applyVoice = (text: string) => {
    const lower = text.toLowerCase()
    const amountMatch = lower.replace(/,/g, '').match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d{1,2})?)/i)
    if (amountMatch) setAmount(amountMatch[1])

    if (/received|income|money in|મળ્યા|આવ્યા|आया|मिला/.test(lower)) setKind('income')
    else setKind('expense')

    if (/later|unpaid|pending|બાકી|પછી|बाकी|बाद में/.test(lower)) setPaymentStatus('unpaid')
    else setPaymentStatus('paid')

    const partner = activePartners.find(p => lower.includes(p.name.toLowerCase()))
    if (partner) {
      setPartnerId(partner.id)
      if (/personally|partner paid|ખુદ|પોતે|पार्टनर|खुद/.test(lower)) setPaidBy('partner')
    }

    const account = activeAccounts.find(a => lower.includes(a.name.toLowerCase()))
    if (account) setAccountId(account.id)

    const category = relevantCategories.find(c => {
      const pieces = c.name.toLowerCase().split(/\s|\//).filter(x => x.length > 3)
      return pieces.some(piece => lower.includes(piece))
    })
    if (category) setCategoryId(category.id)

    const cleaned = text.trim()
    if (cleaned) setNote(cleaned)
    toast.info('Voice entry filled. Check it and save.')
  }

  if (savedId) {
    const offline = savedId.startsWith('offline:')
    return (
      <Modal open={open} onClose={onClose} title="Saved">
        <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-4 text-center">
          <div className="text-[18px] font-bold text-navy-900">{offline ? 'Saved on this device' : 'Transaction saved ✓'}</div>
          <div className="text-[12px] text-navy-500 mt-1">
            {offline ? 'It will sync automatically when internet is back.' : businessTransactionHelp[kind].help}
          </div>
        </div>

        {!offline && ['expense','refund'].includes(kind) && (
          <label className="min-h-[52px] rounded-xl border border-dashed border-saffron-300 bg-saffron-50 px-3 flex items-center justify-center gap-2 cursor-pointer text-[12.5px] font-bold text-saffron-800">
            <Upload size={17} />
            {proofUploading ? 'Uploading…' : 'Take photo / attach bill'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              className="sr-only"
              disabled={proofUploading}
              onChange={e => void addProof(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        <div className="rounded-xl border border-cream-200 bg-white p-3">
          <div className="text-[10px] font-bold tracking-wide text-navy-400">SAVE AS FAVOURITE</div>
          <div className="flex gap-2 mt-1.5">
            <Input value={favoriteLabel} onChange={e => setFavoriteLabel(e.target.value)} placeholder="e.g. Petrol / Courier" />
            <Button variant="soft" className="!px-3" onClick={saveFavorite}><Star size={14} /></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={addAnother}>Add another</Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose() }} title={t('quickAdd')} wide>
      {!canWrite && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-navy-700">Your role is view-only.</div>}

      {favorites.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-navy-400 mb-1">FAVOURITES</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {favorites.map(item => (
              <button key={item.id} type="button" onClick={() => applyPreset(item.input)} className="shrink-0 min-h-[34px] rounded-full bg-saffron-50 border border-saffron-200 px-3 text-[11px] font-semibold text-saffron-800">
                ★ {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] font-bold text-navy-300">₹</div>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          aria-label="Amount"
          autoFocus
          className="!h-[60px] !pl-9 !pr-12 !text-[27px] !font-bold num"
        />
        <button type="button" onClick={startVoice} aria-label="Voice entry" className={'absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center ' + (listening ? 'bg-red-50 text-over' : 'bg-navy-50 text-navy-600')}>
          <Mic size={18} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Primary icon={ArrowDownLeft} title={t('moneyIn')} active={primaryActive('income')} onClick={() => choosePrimary('income')} />
        <Primary icon={ArrowUpRight} title={t('expense')} active={primaryActive('expense')} onClick={() => choosePrimary('expense')} />
        <Primary icon={UserRound} title={t('partnerPaid')} active={primaryActive('partner_paid')} onClick={() => choosePrimary('partner_paid')} />
        <Primary icon={ArrowRightLeft} title={t('transfer')} active={primaryActive('transfer')} onClick={() => choosePrimary('transfer')} />
      </div>

      <button type="button" onClick={() => setShowExtraKinds(v => !v)} className="w-full min-h-[34px] flex items-center justify-center gap-1 text-[11px] font-semibold text-navy-500">
        {showExtraKinds ? <ChevronUp size={14} /> : <ChevronDown size={14} />} More money actions
      </button>

      {showExtraKinds && (
        <div className="grid grid-cols-2 gap-1.5">
          {extraKinds.map(item => (
            <button
              key={item.kind}
              type="button"
              onClick={() => setKind(item.kind)}
              className={'min-h-[48px] rounded-xl border px-2.5 flex items-center gap-2 text-left ' + (kind === item.kind ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-700 border-cream-300')}
            >
              <item.icon size={16} />
              <span><span className="block text-[9px] font-bold text-saffron-500">{businessTransactionHelp[item.kind].tag}</span><span className="text-[11px] font-semibold">{item.label}</span></span>
            </button>
          ))}
        </div>
      )}

      {isOpenItem && (
        <div className="grid grid-cols-2 gap-2">
          <Choice
            active={paymentStatus === 'paid'}
            title={isIncome ? 'Received now' : t('paid')}
            text={isIncome ? 'Money has arrived' : 'Money has moved'}
            onClick={() => setPaymentStatus('paid')}
          />
          <Choice
            active={paymentStatus === 'unpaid'}
            title={isIncome ? 'Collect later' : t('payLater')}
            text={isIncome ? 'Customer still owes us' : 'Record bill only'}
            onClick={() => setPaymentStatus('unpaid')}
          />
        </div>
      )}

      {isExpense && paymentStatus === 'paid' && (
        <div className="grid grid-cols-2 gap-2">
          <Choice active={paidBy === 'business'} title={t('businessFunds')} text="Cash / Bank" onClick={() => setPaidBy('business')} />
          <Choice active={paidBy === 'partner'} title={t('partner')} text="Business owes them" onClick={() => setPaidBy('partner')} />
        </div>
      )}

      {needsAccount && (
        <Field label={kind === 'transfer' ? 'From' : isIncome ? 'Received into' : ['refund','partner_capital','partner_advance'].includes(kind) ? 'Money goes to' : 'Paid from'}>
          <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
            {activeAccounts.map(a => {
              const holder = a.custodian_partner_id ? data.partners.find(p => p.id === a.custodian_partner_id)?.name : null
              return <option key={a.id} value={a.id}>{a.name}{holder ? ' · with ' + holder : ''}</option>
            })}
          </Select>
        </Field>
      )}

      {kind === 'transfer' && (
        <Field label="To account">
          <Select value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            {activeAccounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      )}

      {needsPartner && (
        <Field label={isExpense ? 'Partner who paid' : 'Partner'}>
          <Select value={partnerId} onChange={e => setPartnerId(e.target.value)}>
            {activePartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      )}

      {showCategory && (
        <Field label={t('category')}>
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}

      {isOpenItem && paymentStatus === 'unpaid' && (
        <Field label={isIncome ? 'Customer / party' : 'Vendor / party'} hint={isIncome ? 'Who should pay the business?' : 'Who does the business need to pay?'}>
          <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder={isIncome ? 'Customer name' : 'Vendor name'} />
        </Field>
      )}

      <button type="button" onClick={() => setShowMore(v => !v)} className="w-full min-h-[38px] rounded-xl bg-cream-100 text-[11.5px] font-semibold text-navy-600 flex items-center justify-center gap-1">
        {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {t('moreDetails')}
      </button>

      {showMore && (
        <div className="space-y-3">
          {isOpenItem && paymentStatus === 'unpaid' && (
            <Field label={isIncome ? 'Expected by' : 'Due date'}><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
          )}
          {!(isOpenItem && paymentStatus === 'unpaid') && !['transfer','partner_capital','partner_advance','reimbursement','withdrawal'].includes(kind) && (
            <Field label={isIncome ? 'Customer / party' : t('vendor')}><Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Optional" /></Field>
          )}
          <Field label={t('note')}><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional details" className="min-h-[64px]" /></Field>
        </div>
      )}

      <Button full loading={saving} disabled={!valid || (isIncome && paymentStatus === 'unpaid' && !counterparty.trim())} onClick={submit}>
        {isIncome && paymentStatus === 'unpaid'
          ? 'Save to collect'
          : isExpense && paymentStatus === 'unpaid'
            ? 'Save to pay'
            : t('save') + ' ' + businessTransactionHelp[kind].tag.toLowerCase()}
      </Button>
    </Modal>
  )
}

function Primary({ icon: Icon, title, active, onClick }: { icon: typeof ArrowDownLeft; title: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={'min-h-[62px] rounded-xl border flex flex-col items-center justify-center gap-1 px-1 text-center ' + (active ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-700 border-cream-300')}>
      <Icon size={18} />
      <span className="text-[10.5px] font-semibold leading-tight">{title}</span>
    </button>
  )
}

function Choice({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={'min-h-[48px] rounded-xl border px-2.5 py-2 text-left ' + (active ? 'border-navy-800 bg-navy-50' : 'border-cream-300 bg-white')}>
      <span className="block text-[10px] font-bold text-navy-800">{title}</span>
      <span className="block text-[10.5px] text-navy-400 mt-0.5">{text}</span>
    </button>
  )
}

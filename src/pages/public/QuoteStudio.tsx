import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Copy, FileText, Printer, Sparkles } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePageMeta } from './usePageMeta'
import { usePublicLang } from './usePublicLang'
import { buildQuoteText, emptyQuote, validateQuote, type QuoteInput } from '../../lib/quoteStudio'
import { requestQuotePolish, sendQuoteMagicLink } from '../../lib/aiQuote'

const copy = {
  en: {
    title: 'Quotation Studio (beta)',
    desc: 'Create a free, editable quotation draft for your small business. Browser-only template builder; optional Claude assistance is not yet enabled.',
    badge: 'FREE BETA · NO ACCOUNT NEEDED FOR BASIC DRAFTS',
    h1: 'Make your next quotation clearer.',
    sub: 'Enter the job details and create an editable quotation. Review pricing, taxes and scope before sharing. Nothing is automatically sent to customers.',
    business: 'Your business name', customer: 'Customer name', service: 'Service / job',
    details: 'Work details (optional)', amount: 'Your quoted total (INR)', validity: 'Validity (days)',
    language: 'Quotation language', create: 'Create draft', preview: 'Editable draft',
    placeholder: 'Your quotation will appear here after you create it.',
    copy: 'Copy draft', copied: 'Copied', print: 'Print / Save PDF',
    caution: 'This is a draft, not a tax invoice. Enter only details you are comfortable working with. The basic template stays in this browser tab and is not saved to Prangan.',
    aiLabel: 'Optional Claude assistance', aiButton: 'Improve wording with Claude',
    aiNote: 'When enabled, AI drafting requires a verified sign-in and sends the entered details to Claude for wording suggestions. Your price and validity never change automatically.',
    email: 'Email for AI sign-in', send: 'Email sign-in link', sent: 'Check your email for a sign-in link, then return to this page.',
    aiNotConfigured: 'Claude drafting is not yet enabled. The free quotation builder works without it.',
    back: 'Back to planned tools',
  },
  gu: {
    title: 'ક્વોટેશન સ્ટુડિયો (બેટા)',
    desc: 'નાના વ્યવસાય માટે મફતમાં સુધારી શકાય તેવું ક્વોટેશન ડ્રાફ્ટ બનાવો. મૂળ ટૂલ બ્રાઉઝરમાં જ કામ કરે છે. Claude હજી ચાલુ નથી.',
    badge: 'મફત બેટા · સામાન્ય ડ્રાફ્ટ માટે એકાઉન્ટ જરૂરી નથી',
    h1: 'તમારું આગામી ક્વોટેશન સરળ બનાવો.',
    sub: 'કામની વિગતો નાખો અને સુધારી શકાય તેવું ક્વોટેશન બનાવો. મોકલતાં પહેલાં કિંમત, ટેક્સ અને કામ તપાસો. ગ્રાહકને આપમેળે કંઈ મોકલાતું નથી.',
    business: 'આપના વ્યવસાયનું નામ', customer: 'ગ્રાહકનું નામ', service: 'સેવા / કામ',
    details: 'કામની વિગતો (વૈકલ્પિક)', amount: 'કુલ કિંમત (INR)', validity: 'માન્યતા (દિવસ)',
    language: 'ક્વોટેશનની ભાષા', create: 'ડ્રાફ્ટ બનાવો', preview: 'સુધારી શકાય તેવો ડ્રાફ્ટ',
    placeholder: 'વિગતો ભરીને ડ્રાફ્ટ બનાવશો ત્યારે અહીં દેખાશે.',
    copy: 'ડ્રાફ્ટ કૉપી કરો', copied: 'કૉપી થયું', print: 'પ્રિન્ટ / PDF સેવ કરો',
    caution: 'આ ડ્રાફ્ટ છે, ટેક્સ ઇન્વૉઇસ નથી. જરૂરી વિગતો જ નાખો. સામાન્ય ડ્રાફ્ટ આ બ્રાઉઝર ટેબમાં જ રહે છે; Prangan તેને સેવ કરતું નથી.',
    aiLabel: 'Claude ની વૈકલ્પિક મદદ', aiButton: 'Claude થી ભાષા સુધારો',
    aiNote: 'ચાલુ થાય ત્યારે AI માટે વેરિફાઇડ લોગિન જરૂરી રહેશે અને વિગતો Claude સુધી જશે. કિંમત અને માન્યતા આપમેળે નહીં બદલાય.',
    email: 'AI લોગિન માટે ઈમેલ', send: 'લોગિન લિંક ઈમેલ કરો', sent: 'લોગિન લિંક માટે ઈમેલ જુઓ અને આ પેજ પર પાછા આવો.',
    aiNotConfigured: 'Claude હાલમાં ચાલુ નથી. મફત ક્વોટેશન ટૂલ તેના વગર ચાલે છે.',
    back: 'આગામી ટૂલ્સ પર પાછા',
  },
}

const inputClass = 'w-full rounded-xl border border-cream-300 bg-white min-h-[46px] px-3.5 py-2.5 text-[14.5px] text-navy-900 focus:outline-none focus:ring-2 focus:ring-saffron-400/60'
const AI_ENABLED = import.meta.env.VITE_AI_QUOTE_ENABLED === 'true'

export default function QuoteStudio() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)
  const [form, setForm] = useState<QuoteInput>(emptyQuote)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSent, setLoginSent] = useState(false)

  const set = (key: keyof QuoteInput, value: string) => {
    setForm(old => ({ ...old, [key]: value }))
    setError('')
    setCopied(false)
  }
  const create = () => {
    const issue = validateQuote(form)
    if (issue) { setError(issue); return }
    setDraft(buildQuoteText(form))
    setError('')
    setCopied(false)
  }
  const enhance = async () => {
    const issue = validateQuote(form)
    if (issue) { setError(issue); return }
    setWorking(true); setError('')
    try {
      const polish = await requestQuotePolish(form)
      setDraft(buildQuoteText(form, polish))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI assistance is temporarily unavailable.')
    } finally {
      setWorking(false)
    }
  }
  const signIn = async () => {
    setWorking(true); setError('')
    try {
      await sendQuoteMagicLink(loginEmail.trim())
      setLoginSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link.')
    } finally {
      setWorking(false)
    }
  }
  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draft); setCopied(true) }
    catch { setError('Clipboard access is blocked. Select and copy the draft manually.') }
  }

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <div className="max-w-6xl mx-auto px-5 pt-10 pb-16">
        <div className="print:hidden">
          <Link to="/features" className="inline-flex gap-2 items-center text-[13px] text-navy-500 hover:text-saffron-700"><ArrowLeft size={15}/>{t.back}</Link>
          <div className="mt-6"><p className="text-[11px] font-bold text-saffron-700 tracking-wide">{t.badge}</p><h1 className="mt-2 text-[32px] sm:text-[42px] leading-tight font-bold">{t.h1}</h1><p className="mt-3 max-w-3xl text-[15px] text-navy-600 leading-relaxed">{t.sub}</p></div>
        </div>
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <section aria-label="Quotation details" className="print:hidden rounded-2xl border border-cream-200 bg-white p-5 sm:p-6">
            <form onSubmit={event => { event.preventDefault(); create() }} className="space-y-4">
              {([
                ['business', t.business], ['customer', t.customer], ['service', t.service],
              ] as const).map(([field,label]) => <label key={field} className="block text-[13px] font-semibold">{label}<input className={inputClass + ' mt-1.5'} maxLength={120} required value={form[field]} onChange={e => set(field,e.target.value)}/></label>)}
              <label className="block text-[13px] font-semibold">{t.details}
                <textarea className={inputClass + ' mt-1.5 min-h-[100px]'} maxLength={1500} value={form.details} onChange={e => set('details',e.target.value)}/>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[13px] font-semibold">{t.amount}<input className={inputClass + ' mt-1.5'} type="number" min="0.01" step="0.01" max="1000000000" required value={form.amount} onChange={e => set('amount',e.target.value)}/></label>
                <label className="block text-[13px] font-semibold">{t.validity}<input className={inputClass + ' mt-1.5'} type="number" min="1" max="90" step="1" required value={form.validity} onChange={e => set('validity',e.target.value)}/></label>
              </div>
              <label className="block text-[13px] font-semibold">{t.language}
                <select className={inputClass + ' mt-1.5'} value={form.language} onChange={e => set('language',e.target.value)}>
                  <option value="en">English</option><option value="gu">ગુજરાતી</option><option value="hi">हिन्दी</option>
                </select>
              </label>
              {error && <p role="alert" className="text-[13px] text-red-700">{error}</p>}
              <button type="submit" className="w-full rounded-xl bg-navy-900 py-3.5 text-cream-50 font-bold hover:bg-navy-800 inline-flex justify-center items-center gap-2"><FileText size={17}/>{t.create}</button>
            </form>
            <div className="mt-7 pt-6 border-t border-cream-200">
              <h2 className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-saffron-600"/>{t.aiLabel}</h2>
              <p className="mt-2 text-[12.5px] text-navy-500 leading-relaxed">{t.aiNote}</p>
              {AI_ENABLED ? (
                <div className="mt-4 space-y-3">
                  <button onClick={enhance} disabled={working} className="w-full rounded-xl border border-saffron-400 text-navy-800 font-semibold px-4 py-3 hover:bg-saffron-500/10 disabled:opacity-50">{working ? 'Working…' : t.aiButton}</button>
                  <form onSubmit={e => { e.preventDefault(); signIn() }} className="flex flex-wrap gap-2">
                    <input type="email" aria-label={t.email} placeholder={t.email} className={inputClass + ' flex-1 min-w-0'} value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required/>
                    <button type="submit" disabled={working} className="px-3 py-2 bg-cream-200 rounded-xl text-[13px] font-semibold">{t.send}</button>
                  </form>
                  {loginSent && <p role="status" className="text-[12px] text-green-800">{t.sent}</p>}
                </div>
              ) : <p className="mt-3 text-[12.5px] text-navy-500">{t.aiNotConfigured}</p>}
            </div>
          </section>
          <section aria-label={t.preview} className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6 print:border-0 print:p-0">
            <h2 className="font-bold text-[18px] mb-4 print:hidden">{t.preview}</h2>
            <label htmlFor="quote-preview" className="sr-only">{t.preview}</label>
            <textarea id="quote-preview" data-testid="quote-preview" className="w-full min-h-[500px] rounded-xl bg-cream-50 border border-cream-200 p-5 font-mono text-[13px] leading-relaxed resize-y text-navy-900 print:hidden"
              placeholder={t.placeholder} value={draft} onChange={e => { setDraft(e.target.value); setCopied(false) }} />
            <div className="hidden print:block whitespace-pre-wrap font-mono text-[12pt] leading-relaxed">{draft}</div>
            <div className="mt-3 flex flex-wrap gap-3 print:hidden">
              <button onClick={copyDraft} disabled={!draft} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-cream-50 font-semibold text-[13px] disabled:opacity-40">{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? t.copied : t.copy}</button>
              <button onClick={() => window.print()} disabled={!draft} className="inline-flex items-center gap-2 rounded-xl border border-cream-300 px-4 py-3 font-semibold text-[13px] disabled:opacity-40"><Printer size={16}/>{t.print}</button>
            </div>
            <p className="mt-5 text-[12px] text-navy-500 leading-relaxed print:hidden">{t.caution}</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  )
}

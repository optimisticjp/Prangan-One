import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, FileJson, Search, Trash2 } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'
import {
  makeEnquiry, readEnquiries, writeEnquiries, dueEnquiry, exportEnquiryBackup,
  parseEnquiries, type Enquiry, type EnquiryInput, type EnquiryStatus,
} from '../../lib/enquiryTracker'

const empty: EnquiryInput = { customer: '', contact: '', service: '', details: '', followUp: '' }
const styles = 'w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 min-h-[44px] text-[14px] focus:outline-none focus:ring-2 focus:ring-saffron-400/60'
const statusLabels: Record<'en'|'gu', Record<EnquiryStatus,string>> = {
  en: { new: 'New', quoted: 'Quoted', follow_up: 'Follow up', closed: 'Closed' },
  gu: { new: 'નવી', quoted: 'ક્વોટેશન આપ્યું', follow_up: 'ફોલોઅપ', closed: 'બંધ' },
}
const copy = {
  en: {
    title: 'Customer Enquiry Tracker beta', desc: 'Track customer requests and follow-ups locally in your browser. No account or cloud syncing.',
    heading: 'Keep your customer enquiries organized.', badge: 'FREE BETA · SAVED IN THIS BROWSER ONLY',
    intro: 'Capture requests, track what needs a reply and prepare a quote. No account or automatic messages. This beta is designed for low-sensitivity test data.',
    privacy: 'Privacy notice: Saving is optional. If you choose to save, customer names and contact details remain unencrypted in this browser’s local storage. Anyone using this browser profile can see them. There is no sync or recovery if browser data is cleared. Avoid shared devices and sensitive data.',
    consent: 'I understand and choose to save enquiries on this device.',
    customer: 'Customer name', contact: 'Phone or email (optional)', service: 'Service requested',
    details: 'Job details (optional)', followUp: 'Follow-up date (optional)', add: 'Save enquiry',
    search: 'Search customers and jobs', all: 'All', due: 'Due follow-ups', empty: 'No matching enquiries yet.',
    quote: 'Create quotation', deleted: 'Delete', export: 'Export backup (JSON)', restore: 'Restore backup',
    clear: 'Delete all saved enquiries', status: 'Status', dueText: 'Follow-up due', saved: 'Enquiry saved on this device.',
    removeConfirm: 'Delete this enquiry from this browser?', clearConfirm: 'Permanently delete every saved enquiry from this browser?',
    importConfirm: 'Replace your current local list with this backup? This cannot be undone without another backup.',
    restored: 'Backup restored locally.', storeError: 'Could not save to this browser. Check available storage.',
    back: 'Back to tools',
  },
  gu: {
    title: 'ગ્રાહક પૂછપરછ ટ્રેકર બેટા', desc: 'ગ્રાહકની પૂછપરછ અને ફોલોઅપ આ બ્રાઉઝરમાં જ સાચવો. એકાઉન્ટ કે ક્લાઉડ સિંક નથી.',
    heading: 'ગ્રાહકની પૂછપરછ એક જગ્યાએ ગોઠવો.', badge: 'મફત બેટા · ફક્ત આ બ્રાઉઝરમાં સેવ',
    intro: 'ગ્રાહકની વિનંતી નોંધો, ફોલોઅપ ગોઠવો અને ક્વોટેશન બનાવો. એકાઉન્ટ કે આપમેળે મેસેજ નથી. આ બેટામાં સંવેદનશીલ માહિતી ન નાખો.',
    privacy: 'ગોપનીયતા: સેવ કરવું વૈકલ્પિક છે. સેવ કરશો તો ગ્રાહકના નામ અને સંપર્ક આ બ્રાઉઝરના લોકલ સ્ટોરેજમાં એન્ક્રિપ્શન વગર રહેશે. આ બ્રાઉઝર વાપરનાર બીજા લોકો પણ જોઈ શકે. ક્લાઉડ સિંક કે ડેટા ડિલીટ થયા પછી રિકવરી નથી. શેર કરેલા ડિવાઇસ કે સંવેદનશીલ માહિતી માટે તેનો ઉપયોગ ન કરો.',
    consent: 'મને સમજાયું છે અને આ ડિવાઇસ પર વિગતો સેવ કરવા સંમત છું.',
    customer: 'ગ્રાહકનું નામ', contact: 'ફોન અથવા ઈમેલ (વૈકલ્પિક)', service: 'કઈ સેવા જોઈએ',
    details: 'કામની વિગતો (વૈકલ્પિક)', followUp: 'ફોલોઅપ તારીખ (વૈકલ્પિક)', add: 'પૂછપરછ સેવ કરો',
    search: 'ગ્રાહક અથવા કામ શોધો', all: 'બધી', due: 'ફોલોઅપ બાકી', empty: 'આવી કોઈ પૂછપરછ નથી.',
    quote: 'ક્વોટેશન બનાવો', deleted: 'ડિલીટ કરો', export: 'બેકઅપ લો (JSON)', restore: 'બેકઅપ પાછો લાવો',
    clear: 'સાચવેલી બધી પૂછપરછ ડિલીટ કરો', status: 'સ્થિતિ', dueText: 'ફોલોઅપ બાકી', saved: 'આ ડિવાઇસ પર પૂછપરછ સેવ થઈ.',
    removeConfirm: 'આ બ્રાઉઝરમાંથી પૂછપરછ ડિલીટ કરવી?', clearConfirm: 'આ બ્રાઉઝરમાંથી બધી પૂછપરછ કાયમ માટે ડિલીટ કરવી?',
    importConfirm: 'હાલની યાદીને આ બેકઅપથી બદલવી? બીજો બેકઅપ ન હોય તો પાછું નહીં મળે.',
    restored: 'બેકઅપ આ બ્રાઉઝરમાં પાછો લાવ્યું.', storeError: 'આ બ્રાઉઝરમાં સેવ ન થયું. સ્ટોરેજ તપાસો.',
    back: 'ટૂલ્સ પર પાછા',
  },
}

function today() {
  const date = new Date()
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-')
}
function downloadBackup(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'prangan-enquiries-backup.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Enquiries() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)
  const navigate = useNavigate()
  const importRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Enquiry[]>(() => readEnquiries())
  const [form, setForm] = useState<EnquiryInput>(empty)
  const [consent, setConsent] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyDue, setOnlyDue] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const save = (next: Enquiry[], feedback = '') => {
    try {
      writeEnquiries(next)
      setItems(next)
      setMessage(feedback)
      setError('')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.storeError)
      return false
    }
  }
  const add = (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!consent) { setError(t.consent); return }
    try {
      const record = makeEnquiry(form, crypto.randomUUID(), new Date().toISOString())
      if (save([record, ...items], t.saved)) setForm(empty)
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.storeError) }
  }
  const patch = (item: Enquiry, status: EnquiryStatus) => {
    save(items.map(entry => entry.id === item.id ? { ...entry, status, updatedAt: new Date().toISOString() } : entry))
  }
  const remove = (item: Enquiry) => {
    if (window.confirm(t.removeConfirm)) save(items.filter(entry => entry.id !== item.id))
  }
  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 300_000) throw new Error('Backup is too large.')
      const imported = parseEnquiries(await file.text())
      if (!window.confirm(t.importConfirm)) return
      save(imported, t.restored)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not restore this backup.') }
    finally { if (importRef.current) importRef.current.value = '' }
  }
  const filtered = items.filter(item => {
    const matches = (item.customer + ' ' + item.contact + ' ' + item.service + ' ' + item.details).toLocaleLowerCase().includes(query.toLocaleLowerCase())
    return matches && (!onlyDue || dueEnquiry(item, today()))
  })
  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-20">
        <Link to="/features" className="inline-flex gap-1 items-center text-[13px] text-navy-500 hover:underline">← {t.back}</Link>
        <p className="mt-6 text-[12px] font-bold tracking-wide text-saffron-700">{t.badge}</p>
        <h1 className="mt-2 text-[32px] sm:text-[40px] font-bold max-w-3xl">{t.heading}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-navy-600">{t.intro}</p>
        <div className="mt-6 border border-amber-200 bg-amber-50 rounded-xl p-4 text-[13px] text-amber-950 leading-relaxed">{t.privacy}</div>
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 mt-8">
          <section className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold mb-4">{lang === 'en' ? 'New enquiry' : 'નવી પૂછપરછ'}</h2>
            <form className="space-y-4" onSubmit={add}>
              {([['customer',t.customer],['contact',t.contact],['service',t.service]] as const).map(([field,label]) =>
                <label key={field} className="block text-[13px] font-semibold">{label}
                  <input className={styles+' mt-1'} value={form[field]} maxLength={field === 'contact' ? 160 : 120}
                    required={field !== 'contact'} onChange={event=>setForm(s=>({...s,[field]:event.target.value}))}/>
                </label>
              )}
              <label className="block text-[13px] font-semibold">{t.details}
                <textarea className={styles+' mt-1 min-h-[98px]'} maxLength={1500} value={form.details} onChange={event=>setForm(s=>({...s,details:event.target.value}))}/>
              </label>
              <label className="block text-[13px] font-semibold">{t.followUp}
                <input type="date" className={styles+' mt-1'} value={form.followUp} onChange={event=>setForm(s=>({...s,followUp:event.target.value}))}/>
              </label>
              <label className="flex items-start gap-2 text-[13px] text-navy-600 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={consent} onChange={event=>setConsent(event.target.checked)}/>{t.consent}
              </label>
              <button type="submit" className="w-full rounded-xl bg-navy-900 text-white py-3 font-semibold hover:bg-navy-800">{t.add}</button>
            </form>
          </section>
          <section className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div><h2 className="text-xl font-bold">{lang === 'en' ? 'Your enquiries' : 'આપની પૂછપરછ'}</h2><p className="text-[12px] text-navy-500 mt-1">{items.length} / 100</p></div>
              <div className="flex gap-2 flex-wrap">
                <button disabled={items.length===0} onClick={() => downloadBackup(exportEnquiryBackup(items))}
                  className="rounded-lg border border-cream-300 px-3 py-2 text-[12px] font-semibold inline-flex items-center gap-1 disabled:opacity-40"><Download size={14}/>{t.export}</button>
                <button onClick={() => importRef.current?.click()} className="rounded-lg border border-cream-300 px-3 py-2 text-[12px] font-semibold inline-flex items-center gap-1"><FileJson size={14}/>{t.restore}</button>
                <input ref={importRef} type="file" accept=".json,application/json" className="sr-only" aria-label={t.restore} onChange={event=>void importBackup(event.target.files?.[0])}/>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <label className="relative flex-1 min-w-[180px]"><span className="sr-only">{t.search}</span>
                <Search size={16} aria-hidden="true" className="absolute left-3 top-3.5 text-navy-400"/>
                <input className={styles+' pl-9'} placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/>
              </label>
              <button onClick={()=>setOnlyDue(s=>!s)} aria-pressed={onlyDue} className={'rounded-xl border px-3 py-2 text-[12px] font-semibold '+(onlyDue?'bg-navy-900 text-white':'border-cream-300 text-navy-600')}>{onlyDue?t.all:t.due}</button>
            </div>
            {error && <p role="alert" className="mt-4 text-[13px] text-red-700">{error}</p>}
            {message && <p role="status" className="mt-4 text-[13px] text-green-800">{message}</p>}
            {filtered.length===0 && <p className="mt-8 py-7 text-center text-navy-500 text-[14px]">{t.empty}</p>}
            <div className="mt-4 space-y-3">
              {filtered.map(item=><article key={item.id} className="rounded-xl border border-cream-200 bg-cream-50 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="min-w-0"><h3 className="font-bold break-words">{item.customer}</h3><p className="text-[13px] text-navy-600 break-words">{item.service}</p></div>
                  <label className="text-[12px] text-navy-500">{t.status}
                    <select aria-label={t.status+' '+item.customer} className={styles+' mt-1 min-h-0 text-[12px]'} value={item.status} onChange={e=>patch(item,e.target.value as EnquiryStatus)}>
                      {(['new','quoted','follow_up','closed'] as const).map(s=><option key={s} value={s}>{statusLabels[lang][s]}</option>)}
                    </select>
                  </label>
                </div>
                {item.contact && <p className="text-[12px] text-navy-500 mt-2 break-all">{item.contact}</p>}
                {item.details && <p className="text-[13px] text-navy-600 mt-2 whitespace-pre-wrap break-words">{item.details}</p>}
                {item.followUp && <p className={'text-[12px] mt-2 '+(dueEnquiry(item,today())?'font-bold text-amber-800':'text-navy-500')}>{t.dueText}: {item.followUp}</p>}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button onClick={()=>navigate('/tools/quote',{state:{enquiryQuote:{customer:item.customer,service:item.service,details:item.details}}})}
                    className="rounded-lg bg-navy-900 text-white px-3 py-2 text-[12px] font-semibold inline-flex gap-1 items-center">{t.quote}<ArrowRight size={13}/></button>
                  <button onClick={()=>remove(item)} className="rounded-lg border border-cream-300 px-3 py-2 text-[12px] inline-flex gap-1 items-center text-navy-500 hover:text-red-700"><Trash2 size={13}/>{t.deleted}</button>
                </div>
              </article>)}
            </div>
            {items.length>0 && <button onClick={()=>{if(window.confirm(t.clearConfirm))save([])}} className="mt-6 text-[12px] text-red-700 underline">{t.clear}</button>}
          </section>
        </div>
      </section>
    </PublicLayout>
  )
}

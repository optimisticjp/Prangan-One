import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, FileText, Languages, MessageSquareText, CalendarClock, LockKeyhole, Sparkles } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Planned AI tools',
    desc: 'Explore the small-business workflows Prangan One is developing: enquiries, quotation drafts, customer replies and follow-up tracking.',
    eyebrow: 'PRODUCT ROADMAP · IN DEVELOPMENT',
    heading: 'Useful business tools, built around a real workflow.',
    sub: 'The free Enquiry Tracker and Quotation Studio betas are ready to try in your browser. Multilingual AI assistance and connected customer workflows are still in development.',
    reviewTitle: 'You stay in control',
    review: 'AI will help draft, organize and translate. You will review details and choose what to send. We are not launching autonomous payments, automated tax advice or unsupervised customer messaging.',
    trackerCta: 'Open free Enquiry Tracker beta',
    toolCta: 'Open the free Quotation Studio beta',
    cta: 'Join early access', ctaSupport: 'Tell us which everyday task would make your business easier.',
  },
  gu: {
    title: 'આગામી AI ટૂલ્સ',
    desc: 'પ્રાંગણવન નાના વ્યવસાય માટે ગ્રાહક પૂછપરછ, ક્વોટેશન ડ્રાફ્ટ, જવાબ અને ફોલોઅપના ટૂલ્સ બનાવી રહ્યું છે.',
    eyebrow: 'પ્રોડક્ટ યોજના · વિકાસ ચાલુ છે',
    heading: 'વાસ્તવિક કામ માટે ઉપયોગી ટૂલ્સ.',
    sub: 'મફત પૂછપરછ ટ્રેકર અને ક્વોટેશન સ્ટુડિયો બેટા હવે બ્રાઉઝરમાં અજમાવી શકો છો. ભાષા પ્રમાણે AI મદદ અને જોડાયેલા ગ્રાહક ટૂલ્સ હજી વિકાસમાં છે.',
    reviewTitle: 'અંતિમ નિર્ણય આપનો',
    review: 'AI ડ્રાફ્ટ, ગોઠવણી અને ભાષાંતરમાં મદદ કરશે. વિગતો ચકાસીને શું મોકલવું તે આપ નક્કી કરશો. આપમેળે ચુકવણી, ટેક્સ સલાહ કે મંજૂરી વગર ગ્રાહકને મેસેજ મોકલવાના ટૂલ્સ હજી નથી.',
    trackerCta: 'મફત પૂછપરછ ટ્રેકર બેટા ખોલો',
    toolCta: 'મફત ક્વોટેશન સ્ટુડિયો બેટા ખોલો',
    cta: 'અર્લી એક્સેસ માટે સંપર્ક કરો', ctaSupport: 'આપના વ્યવસાયનું કયું રોજનું કામ સરળ કરવું છે, અમને જણાવો.',
  },
}

const items = [
  { icon: MessageSquareText, en: ['01 · Customer enquiries (beta live)', 'Save requests and follow-up dates on your device. No cloud syncing yet.'], gu: ['૦૧ · ગ્રાહકની પૂછપરછ (બેટા ચાલુ)', 'વિનંતી અને ફોલોઅપ તારીખ આ ડિવાઇસ પર સાચવો. ક્લાઉડ સિંક હજી નથી.'] },
  { icon: FileText, en: ['02 · Quotation drafts (beta live)', 'Prepare editable quotes and download a PDF. AI rewriting is not yet active.'], gu: ['૦૨ · ક્વોટેશન ડ્રાફ્ટ (બેટા ચાલુ)', 'ડ્રાફ્ટમાં ફેરફાર કરીને PDF ડાઉનલોડ કરો. AI હજી ચાલુ નથી.'] },
  { icon: Languages, en: ['03 · Language-ready messages', 'Draft customer replies in Gujarati, Hindi or English, with human review.'], gu: ['૦૩ · ગ્રાહકની ભાષામાં જવાબ', 'ગુજરાતી, હિન્દી કે અંગ્રેજીમાં સંદેશનો ડ્રાફ્ટ, ચકાસણી સાથે.'] },
  { icon: CalendarClock, en: ['04 · Follow-up planning', 'Remember open enquiries and the next step without digging through chats.'], gu: ['૦૪ · ફોલોઅપનું આયોજન', 'બાકી પૂછપરછ અને આગળનું કામ યાદ રાખો.'] },
  { icon: ClipboardList, en: ['Later · Lightweight customer records', 'Keep the history of conversations and approved quotes in context.'], gu: ['પછી · ગ્રાહકની વિગતો', 'ગ્રાહકના સંદેશ અને મંજૂર ક્વોટેશન એક સાથે રાખો.'] },
  { icon: Sparkles, en: ['Later · Document assistance', 'Summarize routine business documents with clear source context.'], gu: ['પછી · દસ્તાવેજમાં મદદ', 'દસ્તાવેજનો સ્ત્રોત જોઈને સારાંશ તૈયાર કરો.'] },
]

export default function Features() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)
  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-10">
        <p className="text-[12px] font-bold text-saffron-700 tracking-wide">{t.eyebrow}</p>
        <h1 className="mt-3 text-[32px] sm:text-[42px] font-bold leading-tight max-w-3xl">{t.heading}</h1>
        <p className="mt-4 max-w-2xl text-[16px] text-navy-500 leading-relaxed">{t.sub}</p>
      </section>
      <section className="px-5 max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => { const [title, body] = lang === 'en' ? item.en : item.gu; return (
          <article key={title} className="rounded-2xl border border-cream-200 bg-white p-6">
            <div className="w-11 h-11 bg-navy-50 text-saffron-600 rounded-xl flex items-center justify-center"><item.icon size={22}/></div>
            <h2 className="mt-5 text-[17px] font-bold">{title}</h2>
            <p className="mt-2 text-[14px] text-navy-500 leading-relaxed">{body}</p>
          </article>
        ) })}
      </section>
      <section className="max-w-5xl mx-auto px-5 pt-10 pb-16">
        <div className="rounded-2xl bg-navy-900 p-6 sm:p-8 text-cream-50 flex gap-4 items-start">
          <LockKeyhole size={24} className="shrink-0 text-saffron-400"/>
          <div><h2 className="text-[20px] font-bold">{t.reviewTitle}</h2><p className="mt-2 text-[14px] leading-relaxed text-cream-100/80">{t.review}</p></div>
        </div>
        <div className="text-center mt-10 flex flex-wrap justify-center gap-3"><Link to="/tools/enquiries" className="mb-6 inline-flex items-center gap-2 rounded-xl bg-saffron-500 text-navy-900 px-5 py-3 font-semibold hover:bg-saffron-400">{t.trackerCta}<ArrowRight size={16}/></Link><Link to="/tools/quote" className="mb-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 text-cream-50 px-5 py-3 font-semibold hover:bg-navy-800">{t.toolCta}<ArrowRight size={16}/></Link></div>
        <div className="text-center mt-2">
          <p className="text-[14px] text-navy-500 mb-4">{t.ctaSupport}</p>
          <Link to="/contact" className="inline-flex gap-2 items-center rounded-xl bg-saffron-500 px-5 py-3 font-bold hover:bg-saffron-400">{t.cta}<ArrowRight size={16}/></Link>
        </div>
      </section>
    </PublicLayout>
  )
}

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
    sub: 'Our first release will focus on the work between a new enquiry and the next customer conversation. This is the plan, not a list of features already available.',
    reviewTitle: 'You stay in control',
    review: 'AI will help draft, organize and translate. You will review details and choose what to send. We are not launching autonomous payments, automated tax advice or unsupervised customer messaging.',
    cta: 'Join early access', ctaSupport: 'Tell us which everyday task would make your business easier.',
  },
  gu: {
    title: 'આગામી AI ટૂલ્સ',
    desc: 'પ્રાંગણવન નાના વ્યવસાય માટે ગ્રાહક પૂછપરછ, ક્વોટેશન ડ્રાફ્ટ, જવાબ અને ફોલોઅપના ટૂલ્સ બનાવી રહ્યું છે.',
    eyebrow: 'પ્રોડક્ટ યોજના · વિકાસ ચાલુ છે',
    heading: 'વાસ્તવિક કામ માટે ઉપયોગી ટૂલ્સ.',
    sub: 'અમારું પહેલું વર્ઝન નવી પૂછપરછથી આગળના ગ્રાહક સંદેશ સુધીની પ્રક્રિયા પર રહેશે. આ યોજના છે, હજી તૈયાર થયેલી સુવિધાઓ નથી.',
    reviewTitle: 'અંતિમ નિર્ણય આપનો',
    review: 'AI ડ્રાફ્ટ, ગોઠવણી અને ભાષાંતરમાં મદદ કરશે. વિગતો ચકાસીને શું મોકલવું તે આપ નક્કી કરશો. આપમેળે ચુકવણી, ટેક્સ સલાહ કે મંજૂરી વગર ગ્રાહકને મેસેજ મોકલવાના ટૂલ્સ હજી નથી.',
    cta: 'અર્લી એક્સેસ માટે સંપર્ક કરો', ctaSupport: 'આપના વ્યવસાયનું કયું રોજનું કામ સરળ કરવું છે, અમને જણાવો.',
  },
}

const items = [
  { icon: MessageSquareText, en: ['01 · Customer enquiries', 'Record what the customer asked for and capture missing details.'], gu: ['૦૧ · ગ્રાહકની પૂછપરછ', 'ગ્રાહકની જરૂરિયાત અને બાકી વિગતો નોંધો.'] },
  { icon: FileText, en: ['02 · Quotation drafts', 'Prepare an editable quotation using approved service details and prices.'], gu: ['૦૨ · ક્વોટેશન ડ્રાફ્ટ', 'કામની વિગતો અને સાચી કિંમતથી સુધારી શકાય તેવું ક્વોટેશન બનાવો.'] },
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
        <div className="text-center mt-10">
          <p className="text-[14px] text-navy-500 mb-4">{t.ctaSupport}</p>
          <Link to="/contact" className="inline-flex gap-2 items-center rounded-xl bg-saffron-500 px-5 py-3 font-bold hover:bg-saffron-400">{t.cta}<ArrowRight size={16}/></Link>
        </div>
      </section>
    </PublicLayout>
  )
}

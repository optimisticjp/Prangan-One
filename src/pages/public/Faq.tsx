import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'FAQ',
    desc: 'Answers about Prangan One early access, planned small-business AI tools, languages, pricing and the existing society product.',
    heading: 'Frequently asked questions',
    items: [
      ['What is Prangan One building?', 'An AI-assisted workspace for everyday small-business tasks, beginning with customer enquiries, editable quotation drafts, multilingual replies and follow-up planning.'],
      ['Can I use the new AI tools today?', 'Not yet. The business-workspace tools shown on this site are a development roadmap, not a live service.'],
      ['Who is it for?', 'We are starting with small service businesses such as repair services, contractors, agencies and consultants.'],
      ['Which languages are planned?', 'We are designing workflows for Gujarati, Hindi and English. The public website currently offers Gujarati and English.'],
      ['Will AI automatically contact my customers?', 'No. Our planned first release requires you to review and approve any draft before sending.'],
      ['Can I join early access?', 'Yes. Share your business details and the tasks you want to simplify on our contact page. We will reach out when an appropriate pilot is ready.'],
      ['How much will it cost?', 'Pricing for the new business tools has not been announced. Submitting an enquiry is not a purchase.'],
      ['Is Prangan One the same as the society management app?', 'Prangan One started as a housing-society management project. That existing application remains separate while we develop the new small-business tools.'],
    ],
    contact: 'Have another question?', cta: 'Contact us',
  },
  gu: {
    title: 'વારંવાર પૂછાતા પ્રશ્નો',
    desc: 'પ્રાંગણવનના નવા AI ટૂલ્સ, અર્લી એક્સેસ, ભાષા, કિંમત અને જૂની સોસાયટી એપ વિશે જવાબો.',
    heading: 'વારંવાર પૂછાતા પ્રશ્નો',
    items: [
      ['પ્રાંગણવન શું બનાવી રહ્યું છે?', 'નાના વ્યવસાય માટે AIની મદદથી ગ્રાહક પૂછપરછ, ક્વોટેશન ડ્રાફ્ટ, ભાષા પ્રમાણે જવાબ અને ફોલોઅપનું આયોજન કરવાના ટૂલ્સ.'],
      ['નવા AI ટૂલ્સ હમણાં વાપરી શકાય?', 'હજી નહીં. આ વેબસાઇટ પર બતાવેલી વ્યવસાય માટેની સુવિધાઓ વિકાસની યોજના છે, લાઇવ સેવા નથી.'],
      ['આ કોના માટે છે?', 'અમે રિપેર સર્વિસ, કોન્ટ્રાક્ટર, એજન્સી અને કન્સલ્ટન્ટ જેવા નાના સર્વિસ વ્યવસાયથી શરૂઆત કરીએ છીએ.'],
      ['કઈ ભાષાઓ માટે યોજના છે?', 'ગુજરાતી, હિન્દી અને અંગ્રેજીમાં કામકાજ માટે. જાહેર વેબસાઇટ હાલમાં ગુજરાતી અને અંગ્રેજીમાં છે.'],
      ['AI ગ્રાહકને આપમેળે મેસેજ કરશે?', 'ના. પહેલા વર્ઝનની યોજનામાં કોઈ ડ્રાફ્ટ મોકલતાં પહેલાં આપની ચકાસણી અને મંજૂરી જરૂરી છે.'],
      ['અર્લી એક્સેસમાં રસ જણાવી શકું?', 'હા. સંપર્ક પેજ પર આપના વ્યવસાયની માહિતી અને કયું કામ સરળ કરવું છે તે જણાવો. યોગ્ય પાઇલટ તૈયાર થશે ત્યારે સંપર્ક કરીશું.'],
      ['કિંમત કેટલી હશે?', 'નવા વ્યવસાય ટૂલ્સની કિંમત હજી જાહેર કરી નથી. પૂછપરછ મોકલવી એટલે ખરીદી કરવી નહીં.'],
      ['જૂની સોસાયટી એપનું શું?', 'પ્રાંગણવનની શરૂઆત સોસાયટી મેનેજમેન્ટ પ્રોજેક્ટથી થઈ હતી. નવી વ્યવસાય સુવિધાઓ બનતી રહે ત્યાં સુધી તે અલગ છે.'],
    ],
    contact: 'બીજો સવાલ છે?', cta: 'અમારો સંપર્ક કરો',
  },
}

export default function Faq() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.items.map(([q,a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [t])
  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-16 pb-16 max-w-3xl mx-auto">
        <h1 className="text-[32px] sm:text-[40px] font-bold text-center mb-9">{t.heading}</h1>
        <div className="space-y-3">
          {t.items.map(([q,a]) => <div key={q} className="rounded-2xl border border-cream-200 bg-white p-5"><h2 className="font-bold text-[16px]">{q}</h2><p className="mt-2 text-[14px] text-navy-500 leading-relaxed">{a}</p></div>)}
        </div>
        <div className="text-center mt-10"><p className="text-navy-600">{t.contact}</p><Link to="/contact" className="inline-block mt-2 font-bold text-saffron-700 hover:underline">{t.cta} →</Link></div>
      </section>
    </PublicLayout>
  )
}

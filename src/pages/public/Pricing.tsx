import { Link } from 'react-router-dom'
import { ArrowRight, CircleHelp } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Pricing and early access',
    desc: 'Prangan One small-business AI tools are in development. Pricing is not yet available. Contact us to discuss early access.',
    heading: 'Pricing is not announced yet.',
    eyebrow: 'PRE-LAUNCH · NO PAID AI PLAN AVAILABLE',
    sub: 'We are testing the first small-business workflows before choosing plans and prices. There is no paid subscription to the new AI workspace today.',
    question: 'Interested in trying the first version?',
    detail: 'Tell us about your business and the task you would most like us to simplify. We will contact interested businesses when a relevant pilot is ready. Contacting us does not enroll you in a paid plan.',
    cta: 'Get in touch',
    legacy: 'Already using the society-management application? Its existing arrangements are separate from the upcoming business tools. Please contact us with any questions.',
  },
  gu: {
    title: 'કિંમત અને અર્લી એક્સેસ',
    desc: 'પ્રાંગણવનના નાના વ્યવસાય માટેના AI ટૂલ્સ વિકાસમાં છે. કિંમત હજી નક્કી નથી. અર્લી એક્સેસ માટે સંપર્ક કરો.',
    heading: 'કિંમત હજી જાહેર કરી નથી.',
    eyebrow: 'લોન્ચ પહેલાં · AI માટે કોઈ પેઇડ પ્લાન હજી નથી',
    sub: 'પ્લાન અને કિંમત નક્કી કરતાં પહેલાં અમે નાના વ્યવસાય માટેના ટૂલ્સ ચકાસી રહ્યા છીએ. નવા AI વર્કસ્પેસની પેઇડ સભ્યતા હાલમાં ઉપલબ્ધ નથી.',
    question: 'પહેલું વર્ઝન અજમાવવા માંગો છો?',
    detail: 'આપના વ્યવસાય અને કયું કામ સરળ જોઈએ તે જણાવો. યોગ્ય પાઇલટ તૈયાર થશે ત્યારે અમે સંપર્ક કરીશું. માત્ર સંપર્ક કરવાથી કોઈ પેઇડ પ્લાન શરૂ થતો નથી.',
    cta: 'અમારો સંપર્ક કરો',
    legacy: 'સોસાયટી મેનેજમેન્ટ એપ પહેલેથી વાપરો છો? તેની હાલની વ્યવસ્થા નવા વ્યવસાય ટૂલ્સથી અલગ છે. સવાલ હોય તો અમને લખો.',
  },
}

export default function Pricing() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)
  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-16 pb-20 max-w-3xl mx-auto text-center">
        <p className="text-[12px] tracking-wide font-bold text-saffron-700">{t.eyebrow}</p>
        <h1 className="mt-4 text-[32px] sm:text-[42px] font-bold">{t.heading}</h1>
        <p className="mt-4 text-[16px] text-navy-500 leading-relaxed">{t.sub}</p>
        <div className="mt-9 text-left rounded-3xl bg-white border border-cream-200 p-7 sm:p-9">
          <h2 className="text-[22px] font-bold">{t.question}</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-navy-500">{t.detail}</p>
          <Link to="/contact" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-900 text-cream-50 font-bold hover:bg-navy-800">{t.cta}<ArrowRight size={17}/></Link>
        </div>
        <div className="flex text-left gap-3 mt-7 p-4 rounded-xl border border-cream-200 bg-cream-100">
          <CircleHelp size={21} className="text-navy-500 shrink-0"/>
          <p className="text-[13.5px] text-navy-600">{t.legacy}</p>
        </div>
      </section>
    </PublicLayout>
  )
}

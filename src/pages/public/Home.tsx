import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Receipt, ShieldCheck, Users, RefreshCw, Wrench, Bell, Vote,
  PartyPopper, Car, FolderOpen, BarChart3, IndianRupee,
} from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    metaTitle: 'The Society OS', metaDesc: 'One platform for every society workflow. Built for committees. Simple for residents.',
    badge: 'Built for Gujarati housing societies',
    h1a: 'One platform for every', h1b: 'society workflow.',
    sub: 'Built for committees. Simple for residents.',
    ctaPrimary: 'Request Society Setup', ctaSecondary: 'See How It Works',
    committeeTitle: 'Runs fully on the committee side alone',
    committeeBody: 'No resident needs to log in for your society to get value from day one. Generate bills, record payments, issue receipts, track complaints, all from one dashboard the treasurer actually lives in.',
    residentTitle: 'Simple enough for every resident',
    residentBody: 'When residents are ready, they get their own view: dues, receipts, notices, complaints, all in the language they actually speak, not a translated afterthought.',
    transparencyTitle: 'Radical transparency, the real reason committees switch',
    transparencyBody: 'Every resident can see total collected, total spent, category by category, anytime, including festival funds. That ends the WhatsApp arguments about where the money went, for good.',
    handoverTitle: 'Committees change. Your records should not disappear when they do.',
    handoverBody: 'Transfer admin access in one click. Export everything, anytime. Nothing gets lost across a committee change, ever again.',
    modulesTitle: 'Everything a society actually needs',
    pricingTeaser: 'Less than one chai per flat, per month.',
    pricingCta: 'See pricing',
    faqTeaser: 'Have questions?', faqCta: 'Read the FAQ',
    contactCta: 'Talk to us',
  },
  gu: {
    metaTitle: 'The Society OS', metaDesc: 'સોસાયટીના દરેક કામ માટે એક જ પ્લેટફોર્મ. કમિટી માટે બનેલું. રહેવાસી માટે સરળ.',
    badge: 'ગુજરાતી હાઉસિંગ સોસાયટીઓ માટે બનેલું',
    h1a: 'સોસાયટીના દરેક કામ માટે', h1b: 'એક જ પ્લેટફોર્મ.',
    sub: 'કમિટી માટે બનેલું. રહેવાસી માટે સરળ.',
    ctaPrimary: 'સોસાયટી સેટઅપની વિનંતી કરો', ctaSecondary: 'કેવી રીતે ચાલે છે તે જુઓ',
    committeeTitle: 'ફક્ત કમિટીથી જ પૂરું ચાલે',
    committeeBody: 'એક પણ રહેવાસી લોગિન ના કરે તોય તમારી સોસાયટીને પહેલા દિવસથી ફાયદો મળે. બિલ બનાવો, ચુકવણી નોંધો, રસીદ આપો, ફરિયાદ ટ્રેક કરો, બધું એક જ ડેશબોર્ડ પરથી.',
    residentTitle: 'દરેક રહેવાસી માટે એટલું સરળ',
    residentBody: 'રહેવાસી તૈયાર હોય ત્યારે એમને પોતાનું વ્યૂ મળે: બાકી રકમ, રસીદ, નોટિસ, ફરિયાદ, બધું એમની પોતાની ભાષામાં.',
    transparencyTitle: 'સંપૂર્ણ પારદર્શકતા, કમિટી બદલવાનું સાચું કારણ',
    transparencyBody: 'દરેક રહેવાસી કુલ જમા, કુલ ખર્ચ, કેટેગરી પ્રમાણે, ગમે ત્યારે જોઈ શકે, તહેવારના ફંડ સહિત. "પૈસા ક્યાં ગયા" ના WhatsApp ઝઘડા કાયમ માટે બંધ.',
    handoverTitle: 'કમિટી બદલાય છે. તમારો રેકોર્ડ ખોવાવો ના જોઈએ.',
    handoverBody: 'એક ટેપમાં એડમિન એક્સેસ ટ્રાન્સફર કરો. ગમે ત્યારે બધું એક્સપોર્ટ કરો. કમિટી બદલાય તોય કંઈ ખોવાય નહીં.',
    modulesTitle: 'સોસાયટીને જે જોઈએ એ બધું',
    pricingTeaser: 'એક ચા કરતાં ઓછું, ફ્લેટ દીઠ, મહિને.',
    pricingCta: 'કિંમત જુઓ',
    faqTeaser: 'કોઈ પ્રશ્ન છે?', faqCta: 'FAQ વાંચો',
    contactCta: 'અમારો સંપર્ક કરો',
  },
}

const modules = [
  { icon: Receipt, en: 'Billing & Receipts', gu: 'બિલિંગ અને રસીદ' },
  { icon: Wrench, en: 'Complaints', gu: 'ફરિયાદ' },
  { icon: Bell, en: 'Notices', gu: 'નોટિસ' },
  { icon: FolderOpen, en: 'Documents', gu: 'દસ્તાવેજો' },
  { icon: Vote, en: 'Polls', gu: 'મતદાન' },
  { icon: PartyPopper, en: 'Events & Funds', gu: 'ઇવેન્ટ / ફાળો' },
  { icon: Car, en: 'Parking', gu: 'પાર્કિંગ' },
  { icon: BarChart3, en: 'Reports', gu: 'રિપોર્ટ' },
]

export default function Home() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.metaTitle, t.metaDesc)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Prangan One',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Gujarati-first society management platform for housing society committees and residents.',
      offers: { '@type': 'Offer', price: '10', priceCurrency: 'INR', description: 'Per flat, per month' },
    })
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-16 pb-14 text-center relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="max-w-3xl mx-auto relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 border border-navy-100 px-3.5 py-1.5 text-[12.5px] font-semibold text-navy-600">
            {t.badge}
          </span>
          <h1 className="mt-5 text-[34px] sm:text-[46px] font-bold leading-[1.15]">
            {t.h1a}<br /><span className="text-saffron-600">{t.h1b}</span>
          </h1>
          <p className="mt-4 text-[17px] text-navy-500">{t.sub}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 text-cream-50 px-5 py-3 text-[15px] font-bold hover:bg-navy-800">
              {t.ctaPrimary} <ArrowRight size={16} />
            </Link>
            <Link to="/features" className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-5 py-3 text-[15px] font-semibold text-navy-700 hover:bg-navy-50">
              {t.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 max-w-5xl mx-auto grid sm:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-cream-200 bg-white p-6">
          <ShieldCheck size={26} className="text-saffron-500 mb-3" />
          <h2 className="font-bold text-[18px] mb-1.5">{t.committeeTitle}</h2>
          <p className="text-[14.5px] text-navy-500 leading-relaxed">{t.committeeBody}</p>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-white p-6">
          <Users size={26} className="text-saffron-500 mb-3" />
          <h2 className="font-bold text-[18px] mb-1.5">{t.residentTitle}</h2>
          <p className="text-[14.5px] text-navy-500 leading-relaxed">{t.residentBody}</p>
        </div>
      </section>

      <section className="px-5 py-10 bg-navy-900 text-cream-50">
        <div className="max-w-3xl mx-auto text-center">
          <IndianRupee size={26} className="text-saffron-400 mx-auto mb-3" />
          <h2 className="font-bold text-[22px]">{t.transparencyTitle}</h2>
          <p className="text-[15px] text-cream-100/80 mt-2 leading-relaxed">{t.transparencyBody}</p>
        </div>
      </section>

      <section className="px-5 py-10 max-w-3xl mx-auto text-center">
        <RefreshCw size={26} className="text-saffron-500 mx-auto mb-3" />
        <h2 className="font-bold text-[22px]">{t.handoverTitle}</h2>
        <p className="text-[15px] text-navy-500 mt-2 leading-relaxed">{t.handoverBody}</p>
      </section>

      <section className="px-5 py-10 max-w-5xl mx-auto">
        <h2 className="font-bold text-[22px] text-center mb-6">{t.modulesTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modules.map(m => (
            <div key={m.en} className="rounded-xl border border-cream-200 bg-white px-3 py-4 text-center">
              <m.icon size={20} className="mx-auto text-saffron-500 mb-1.5" />
              <div className="text-[12.5px] font-semibold text-navy-700">{lang === 'en' ? m.en : m.gu}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-10 max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 text-center">
        <Link to="/pricing" className="rounded-2xl border border-cream-200 bg-white p-5 hover:border-saffron-300">
          <div className="font-bold text-navy-800">{t.pricingTeaser}</div>
          <div className="text-[13px] text-saffron-600 font-semibold mt-1">{t.pricingCta} →</div>
        </Link>
        <Link to="/faq" className="rounded-2xl border border-cream-200 bg-white p-5 hover:border-saffron-300">
          <div className="font-bold text-navy-800">{t.faqTeaser}</div>
          <div className="text-[13px] text-saffron-600 font-semibold mt-1">{t.faqCta} →</div>
        </Link>
        <Link to="/contact" className="rounded-2xl bg-saffron-500 text-navy-900 p-5 hover:bg-saffron-400">
          <div className="font-bold">{t.contactCta}</div>
          <div className="text-[13px] font-semibold mt-1">→</div>
        </Link>
      </section>
    </PublicLayout>
  )
}

import { Link } from 'react-router-dom'
import { Check, IndianRupee } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Pricing', desc: 'Society maintenance software pricing: 90 days free, no card needed. After that, ₹10 per flat per month, ₹499 minimum per society. No online payment gateway needed to start.',
    h1: 'Simple pricing', sub: '90 days free. No card required to start.',
    perFlat: 'per flat / month, after your free trial',
    minimumNote: '₹499 minimum per society, per month, whichever is higher.',
    dailyNote: 'After the trial, societies with 50 or more flats pay ₹10 per flat per month, which is less than ₹1 per flat per day. ₹499 minimum per society per month.',
    features: ['Available modules included', 'Residents and committee members can use their assigned access', 'Billing, receipts, and one-tap WhatsApp reminder sharing', 'Complaints, notices, polls, and events', 'Use available exports when you need records', 'Setup handled personally, no self-serve signup form'],
    note: 'Setup is manual and personal: we onboard your society directly, no card and no online payment gateway required to get started. Your 90-day trial begins once your society is actually set up and ready to use, not the day you fill out this form.',
    cta: 'Request Society Setup',
    examplesTitle: 'What that actually costs, after the trial',
    examples: [['30-flat society', '\u20b9499 / month (minimum applies)'], ['100-flat society', '\u20b91,000 / month']],
  },
  gu: {
    title: 'કિંમત', desc: 'સોસાયટી મેન્ટેનન્સ સોફ્ટવેરની કિંમત: 90 દિવસ મફત, કોઈ કાર્ડની જરૂર નથી. પછી ફ્લેટ દીઠ મહિને ₹10, સોસાયટી દીઠ ઓછામાં ઓછું ₹499. શરૂ કરવા ઓનલાઈન ચુકવણી ગેટવે જરૂરી નથી.',
    h1: 'સાદી કિંમત', sub: '90 દિવસ મફત. શરૂ કરવા કાર્ડની જરૂર નથી.',
    perFlat: 'ફ્લેટ દીઠ / મહિનો, ટ્રાયલ પછી',
    minimumNote: 'સોસાયટી દીઠ ઓછામાં ઓછું ₹499 મહિને, બેમાંથી જે વધારે હોય તે.',
    dailyNote: 'ટ્રાયલ પછી, 50 કે તેથી વધુ ફ્લેટની સોસાયટી માટે ફ્લેટ દીઠ મહિને ₹10, એટલે પ્રતિ ફ્લેટ રોજના ₹1 કરતાં પણ ઓછું. સોસાયટી દીઠ ન્યૂનતમ ₹499 મહિને.',
    features: ['ઉપલબ્ધ મોડ્યુલ સામેલ', 'રહેવાસી અને કમિટી સભ્યો માટે આપેલી એક્સેસ મુજબ ઉપયોગ', 'બિલિંગ, રસીદ અને WhatsApp પર રિમાઇન્ડર શેર', 'ફરિયાદ, નોટિસ, મતદાન, ઇવેન્ટ', 'જરૂર પડે ત્યારે ઉપલબ્ધ એક્સપોર્ટ વાપરો', 'સેટઅપ અમે સીધું કરીએ, સેલ્ફ-સર્વ ફોર્મ નહીં'],
    note: 'સેટઅપ મેન્યુઅલી અને સીધું થાય છે: અમે આપની સોસાયટીને સીધા ઓનબોર્ડ કરીએ છીએ, શરૂ કરવા માટે કાર્ડ કે ઓનલાઈન ચુકવણી ગેટવેની જરૂર નથી. આપનો 90-દિવસનો ટ્રાયલ ત્યારે શરૂ થાય છે જ્યારે આપની સોસાયટી ખરેખર સેટ થઈને વાપરવા તૈયાર થાય, આ ફોર્મ ભરો એ દિવસે નહીં.',
    cta: 'સોસાયટી સેટઅપની વિનંતી કરો',
    examplesTitle: 'ટ્રાયલ પછી ખરેખર કેટલો ખર્ચ થાય',
    examples: [['30 ફ્લેટની સોસાયટી', '₹499 / મહિનો (ન્યૂનતમ કિંમત લાગુ)'], ['100 ફ્લેટની સોસાયટી', '₹1,000 / મહિનો']],
  },
}

export default function Pricing() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-14 pb-16 text-center">
        <h1 className="text-[30px] font-bold">{t.h1}</h1>
        <p className="text-[15px] text-navy-500 mt-2">{t.sub}</p>

        <div className="max-w-sm mx-auto mt-8 rounded-3xl border-2 border-saffron-300 bg-white p-7 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-saffron-500/10" aria-hidden />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-paid/10 text-paid text-[12.5px] font-bold px-3 py-1 relative">
            {lang === 'en' ? '90 days free, no card needed' : '90 દિવસ મફત, કાર્ડની જરૂર નથી'}
          </div>
          <div className="flex items-end justify-center gap-1 relative mt-4">
            <IndianRupee size={26} className="mb-2" />
            <span className="text-[54px] font-bold leading-none">10</span>
          </div>
          <div className="text-[13.5px] text-navy-400 relative">{t.perFlat}</div>
          <div className="text-[12px] text-navy-400 relative mt-1">{t.minimumNote}</div>
          <p className="text-[12.5px] text-navy-600 bg-cream-100 border border-cream-200 rounded-xl px-3.5 py-2.5 mt-3 relative leading-relaxed text-left">{t.dailyNote}</p>
          <ul className="mt-5 space-y-2.5 text-left text-[14px] relative">
            {t.features.map(f => (
              <li key={f} className="flex items-start gap-2"><Check size={16} className="text-paid shrink-0 mt-0.5" /> {f}</li>
            ))}
          </ul>
          <Link to="/contact" className="mt-6 block w-full rounded-xl bg-navy-900 text-cream-50 py-3 text-[15px] font-bold hover:bg-navy-800 relative">
            {t.cta}
          </Link>
        </div>
        <p className="max-w-md mx-auto text-[13px] text-navy-400 mt-6">{t.note}</p>

        <div className="max-w-sm mx-auto mt-8">
          <div className="text-[12.5px] font-bold tracking-wide text-navy-400 uppercase mb-3">{t.examplesTitle}</div>
          <div className="grid grid-cols-2 gap-3">
            {t.examples.map(([label, price]) => (
              <div key={label} className="rounded-xl border border-cream-200 bg-white px-4 py-3.5 text-left">
                <div className="text-[12.5px] text-navy-400">{label}</div>
                <div className="text-[15px] font-bold text-navy-900 mt-0.5">{price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

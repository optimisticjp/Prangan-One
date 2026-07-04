import { Link } from 'react-router-dom'
import { Check, IndianRupee } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Pricing', desc: 'Flat ₹10 per flat per month. No online payment gateway needed, no hidden setup fee.',
    h1: 'Simple pricing', sub: 'Less than one chai per flat, per month.',
    perFlat: 'per flat / month',
    features: ['Every module included', 'Unlimited residents and committee members', 'Billing, receipts, and one-tap WhatsApp reminder sharing', 'Complaints, notices, polls, and events', 'Export your data anytime, no lock-in', 'Setup handled personally, no self-serve signup form'],
    note: 'Setup is manual and personal: we onboard your society directly, no online payment gateway required to get started.',
    cta: 'Request Society Setup',
    examplesTitle: 'What that actually costs',
    examples: [['24-flat society', '\u20b9240 / month'], ['100-flat society', '\u20b91,000 / month']],
  },
  gu: {
    title: 'કિંમત', desc: 'ફ્લેટ દીઠ મહિને ₹10, સાદી કિંમત. કોઈ ઓનલાઈન પેમેન્ટ ગેટવે જરૂરી નથી, કોઈ છુપો સેટઅપ ચાર્જ નથી.',
    h1: 'સાદી કિંમત', sub: 'એક ચા કરતાં ઓછું, ફ્લેટ દીઠ, મહિને.',
    perFlat: 'ફ્લેટ દીઠ / મહિનો',
    features: ['દરેક સુવિધા સામેલ', 'રહેવાસી અને કમિટી સભ્યની કોઈ લિમિટ નહીં', 'બિલિંગ, રસીદ, અને એક-ટેપ WhatsApp રિમાઇન્ડર શેર', 'ફરિયાદ, નોટિસ, મતદાન, ઇવેન્ટ', 'ગમે ત્યારે તમારો ડેટા એક્સપોર્ટ કરો', 'સેટઅપ સીધું અમે કરીએ, કોઈ સેલ્ફ-સર્વ ફોર્મ નહીં'],
    note: 'સેટઅપ મેન્યુઅલી અને સીધું થાય છે: અમે તમારી સોસાયટીને સીધા ઓનબોર્ડ કરીએ છીએ, શરૂ કરવા માટે ઓનલાઈન પેમેન્ટ ગેટવેની જરૂર નથી.',
    cta: 'સોસાયટી સેટઅપની વિનંતી કરો',
    examplesTitle: 'ખરેખર કેટલો ખર્ચ થાય',
    examples: [['24 ફ્લેટની સોસાયટી', '₹240 / મહિનો'], ['100 ફ્લેટની સોસાયટી', '₹1,000 / મહિનો']],
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
          <div className="flex items-end justify-center gap-1 relative">
            <IndianRupee size={26} className="mb-2" />
            <span className="text-[54px] font-bold leading-none">10</span>
          </div>
          <div className="text-[13.5px] text-navy-400 relative">{t.perFlat}</div>
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
                <div className="text-[17px] font-bold text-navy-900 mt-0.5">{price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

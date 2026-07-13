import { Link } from 'react-router-dom'
import { Receipt, Wrench, Bell, FolderOpen, Vote, PartyPopper, Car, BarChart3, Store, Wallet, Users, ArrowRight } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Features', desc: 'Core tools for housing society committees and residents, in one place.',
    h1: 'Built around what runs a society', sub: 'Deep where it matters most: billing, payments, receipts, complaints, and notices. Clean and correct everywhere else.',
    cta: 'Request Society Setup',
    ctaSupport: 'Tell us about your society; we set it up with you, directly.',
  },
  gu: {
    title: 'સુવિધાઓ', desc: 'સોસાયટીની કમિટી અને રહેવાસીઓ માટે મુખ્ય સાધનો, એક જ જગ્યાએ.',
    h1: 'સોસાયટી ચલાવવા માટે જ બનેલું', sub: 'સૌથી વધુ વપરાતું ઊંડાણથી: બિલિંગ, ચુકવણી, રસીદ, ફરિયાદ, નોટિસ. બાકી બધું સાફ અને સાચું.',
    cta: 'સેટઅપ વિનંતી કરો',
    ctaSupport: 'આપની સોસાયટી વિશે જણાવો; અમે સીધા આપની સાથે સેટઅપ કરી આપીશું.',
  },
}

const features = [
  { icon: Receipt, en: ['Billing & Receipts', 'Generate monthly bills in one click, record cash/UPI/cheque payments, get an atomic, sequential receipt number every time, shareable on WhatsApp instantly.'], gu: ['બિલિંગ અને રસીદ', 'એક ક્લિકમાં માસિક બિલ બનાવો, રોકડ/UPI/ચેક ચુકવણી નોંધો, દરેક વખતે ક્રમબદ્ધ રસીદ નંબર મળે, WhatsApp પર તરત શેર કરી શકાય.'] },
  { icon: Wrench, en: ['Complaints', 'Full lifecycle tracking from new to closed, with a visible timeline residents can follow and internal notes only the committee sees.'], gu: ['ફરિયાદ', 'નવીથી બંધ સુધીની આખી પ્રક્રિયા, રહેવાસી માટે દેખાતી ટાઈમલાઈન અને ફક્ત કમિટી માટેની આંતરિક નોંધ સાથે.'] },
  { icon: Bell, en: ['Notices', 'Publish notices for society members and pin important ones so they stay easy to find.'], gu: ['નોટિસ', 'સોસાયટી સભ્યો માટે નોટિસ પ્રકાશિત કરો અને મહત્વની નોટિસ પિન કરો જેથી સહેલાઈથી મળે.'] },
  { icon: FolderOpen, en: ['Documents', 'Society records can use permission levels such as public, committee-only, accountant-only, or admin-only.'], gu: ['દસ્તાવેજો', 'સોસાયટીના રેકોર્ડ માટે જાહેર, કમિટી-માત્ર, એકાઉન્ટન્ટ-માત્ર અથવા એડમિન-માત્ર જેવી પરવાનગી રાખી શકાય.'] },
  { icon: Vote, en: ['Polls', 'One vote per flat is enforced for resident voting. Results can be visible during the poll or shown after it closes.'], gu: ['મતદાન', 'રહેવાસી મતદાનમાં એક ફ્લેટ દીઠ એક મત લાગુ થાય છે. પરિણામ મતદાન દરમિયાન દેખાડવું કે બંધ થયા પછી, તે પસંદ કરી શકાય.'] },
  { icon: PartyPopper, en: ['Events & Festival Funds', 'Track contributions and expenses for Navratri, Ganesh, Uttarayan, and every festival collection, just as transparently as maintenance.'], gu: ['ઇવેન્ટ અને તહેવાર ફંડ', 'નવરાત્રી, ગણેશ, ઉત્તરાયણ, દરેક તહેવારના ફાળા અને ખર્ચ, મેન્ટેનન્સ જેટલી જ પારદર્શકતાથી.'] },
  { icon: Car, en: ['Parking', 'Track vehicles and parking slots, with clear slot details for committee review.'], gu: ['પાર્કિંગ', 'વાહન અને પાર્કિંગ સ્લોટની નોંધ રાખો, કમિટી સમીક્ષા માટે સ્પષ્ટ સ્લોટ વિગતો સાથે.'] },
  { icon: Store, en: ['Vendors & AMC', 'Track vendor and AMC dates so upcoming renewals are easier for the committee to review.'], gu: ['વેન્ડર અને AMC', 'વેન્ડર અને AMC તારીખો નોંધો, જેથી આવનારા રિન્યુઅલ કમિટી સરળતાથી જોઈ શકે.'] },
  { icon: Wallet, en: ['Expenses & Reports', 'Income, expenses, and reports stay categorized and available for review/export where the module supports it.'], gu: ['ખર્ચ અને રિપોર્ટ', 'આવક, ખર્ચ અને રિપોર્ટ કેટેગરી પ્રમાણે રહે છે અને જ્યાં મોડ્યુલ સપોર્ટ કરે ત્યાં સમીક્ષા/એક્સપોર્ટ માટે ઉપલબ્ધ રહે છે.'] },
  { icon: Users, en: ['Members & Import', 'Add flats one at a time or import a spreadsheet list with duplicate checks before saving.'], gu: ['સભ્યો અને આયાત', 'એક પછી એક ફ્લેટ ઉમેરો અથવા સ્પ્રેડશીટ યાદી આયાત કરો; સેવ કરતાં પહેલા ડુપ્લિકેટ ચકાસણી થાય છે.'] },
]

export default function Features() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-14 pb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-[30px] font-bold">{t.h1}</h1>
        <p className="text-[15px] text-navy-500 mt-2">{t.sub}</p>
      </section>
      <section className="px-5 pb-14 max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
        {features.map(f => {
          const [title, body] = lang === 'en' ? f.en : f.gu
          return (
            <div key={title} className="rounded-2xl border border-cream-200 bg-white p-5">
              <f.icon size={22} className="text-saffron-500 mb-2.5" />
              <h2 className="font-bold text-[15.5px] mb-1">{title}</h2>
              <p className="text-[13.5px] text-navy-500 leading-relaxed">{body}</p>
            </div>
          )
        })}
      </section>
      <section className="px-5 pb-16 text-center">
        <p className="text-[13.5px] text-navy-500 max-w-md mx-auto mb-4">{t.ctaSupport}</p>
        <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 text-cream-50 px-5 py-3 text-[15px] font-bold hover:bg-navy-800">
          {t.cta} <ArrowRight size={16} />
        </Link>
      </section>
    </PublicLayout>
  )
}

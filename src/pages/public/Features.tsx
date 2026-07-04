import { Link } from 'react-router-dom'
import { Receipt, Wrench, Bell, FolderOpen, Vote, PartyPopper, Car, BarChart3, Store, Wallet, Users, ArrowRight } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Features', desc: 'Everything a housing society committee and its residents actually need, in one place.',
    h1: 'Built around what runs a society', sub: 'Deep where it matters most: billing, payments, receipts, complaints, and notices. Clean and correct everywhere else.',
    cta: 'Request Society Setup',
  },
  gu: {
    title: 'સુવિધાઓ', desc: 'સોસાયટીની કમિટી અને રહેવાસીઓને જે ખરેખર જોઈએ, બધું એક જ જગ્યાએ.',
    h1: 'સોસાયટી ચલાવવા માટે જ બનેલું', sub: 'સૌથી વધુ વપરાતું ઊંડાણથી: બિલિંગ, ચુકવણી, રસીદ, ફરિયાદ, નોટિસ. બાકી બધું સાફ અને સાચું.',
    cta: 'સોસાયટી સેટઅપની વિનંતી કરો',
  },
}

const features = [
  { icon: Receipt, en: ['Billing & Receipts', 'Generate monthly bills in one click, record cash/UPI/cheque payments, get an atomic, sequential receipt number every time, shareable on WhatsApp instantly.'], gu: ['બિલિંગ અને રસીદ', 'એક ક્લિકમાં માસિક બિલ બનાવો, રોકડ/UPI/ચેક ચુકવણી નોંધો, દરેક વખતે ક્રમબદ્ધ રસીદ નંબર મળે, WhatsApp પર તરત શેર કરી શકાય.'] },
  { icon: Wrench, en: ['Complaints', 'Full lifecycle tracking from new to closed, with a visible timeline residents can follow and internal notes only the committee sees.'], gu: ['ફરિયાદ', 'નવીથી બંધ સુધીની આખી પ્રક્રિયા, રહેવાસી માટે દેખાતી ટાઈમલાઈન અને ફક્ત કમિટી માટેની આંતરિક નોંધ સાથે.'] },
  { icon: Bell, en: ['Notices', 'Publish once, everyone sees it. Pin the important ones so they never get buried.'], gu: ['નોટિસ', 'એક વાર પ્રકાશિત કરો, બધા જોઈ શકે. મહત્વની નોટિસ પિન કરો જેથી ખોવાય નહીં.'] },
  { icon: FolderOpen, en: ['Documents', 'Society records with real permission levels, public, committee-only, or accountant-only.'], gu: ['દસ્તાવેજો', 'સોસાયટીના રેકોર્ડ ખરેખરી પરવાનગી સાથે, જાહેર, કમિટી-માત્ર, કે એકાઉન્ટન્ટ-માત્ર.'] },
  { icon: Vote, en: ['Polls', 'One vote per flat, enforced, not just trusted. Results visible or hidden until the poll closes, your choice.'], gu: ['મતદાન', 'એક ફ્લેટ, એક મત, ખરેખર લાગુ થાય છે. પરિણામ મતદાન ચાલુ હોય ત્યારે બતાવવું કે છુપાવવું, તમારી પસંદગી.'] },
  { icon: PartyPopper, en: ['Events & Festival Funds', 'Track contributions and expenses for Navratri, Ganesh, Uttarayan, and every festival collection, just as transparently as maintenance.'], gu: ['ઇવેન્ટ અને તહેવાર ફંડ', 'નવરાત્રી, ગણેશ, ઉત્તરાયણ, દરેક તહેવારના ફાળા અને ખર્ચ, મેન્ટેનન્સ જેટલી જ પારદર્શકતાથી.'] },
  { icon: Car, en: ['Parking', 'Track vehicles and slots, with duplicate-assignment warnings so two flats never end up fighting over one spot.'], gu: ['પાર્કિંગ', 'વાહન અને સ્લોટની નોંધ, ડુપ્લિકેટ સ્લોટ માટે ચેતવણી સાથે.'] },
  { icon: Store, en: ['Vendors & AMC', 'Track every vendor contract with renewal warnings before an AMC quietly expires.'], gu: ['વેન્ડર અને AMC', 'દરેક વેન્ડર કોન્ટ્રાક્ટ ટ્રેક કરો, AMC પૂરું થાય એ પહેલાં ચેતવણી મળે.'] },
  { icon: Wallet, en: ['Expenses & Reports', 'Every rupee categorized, exportable, and auditable, anytime, by anyone who needs to check.'], gu: ['ખર્ચ અને રિપોર્ટ', 'દરેક રૂપિયો કેટેગરી પ્રમાણે, એક્સપોર્ટ કરી શકાય, ગમે ત્યારે ચકાસી શકાય.'] },
  { icon: Users, en: ['Members & Import', 'Add flats one at a time or import a whole list from a spreadsheet, with row-by-row validation before anything is saved.'], gu: ['સભ્યો અને આયાત', 'એક પછી એક ફ્લેટ ઉમેરો, અથવા આખી યાદી એક્સેલમાંથી આયાત કરો, દરેક હરોળ ચકાસાય પછી જ સચવાય.'] },
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
        <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 text-cream-50 px-5 py-3 text-[15px] font-bold hover:bg-navy-800">
          {t.cta} <ArrowRight size={16} />
        </Link>
      </section>
    </PublicLayout>
  )
}

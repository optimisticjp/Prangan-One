import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Receipt, ShieldCheck, Users, Wrench, Bell, Vote,
  PartyPopper, Car, FolderOpen, BarChart3, Building2,
  ClipboardCheck, Lock, Database, UploadCloud,
} from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'
import { isDemoModeEnabled } from '../../lib/demoMode'

const copy = {
  en: {
    metaTitle: 'The Society OS', metaDesc: 'Prangan One, Gujarati-first society management software for housing societies in Surat and Gujarat: billing, receipts, complaints, and notices.',
    badge: 'Gujarati-first society management',
    h1: 'Run your housing society from one clear committee dashboard.',
    sub: 'Prangan One helps committees manage bills, receipts, complaints, notices, documents, polls, events, parking, and reports, with a simple resident view when members are ready.',
    ctaDemo: 'Open the demo', ctaContact: 'Request a demo', ctaSecondary: 'Log in',
    previewEyebrow: 'Product preview', previewTitle: 'Committee control, resident clarity', previewBody: 'A practical workspace for daily society work, plus a resident home that keeps dues, notices, and complaints easy to understand.',
    adminLabel: 'Committee dashboard', residentLabel: 'Resident view', dueThisMonth: 'Due this month', collected: 'Collected', complaints: 'Open complaints', notice: 'Water tank cleaning notice', receipt: 'Receipt RT-2026-0042', residentDue: 'Maintenance due', residentComplaint: 'Complaint status: In progress',
    howTitle: 'How it works', howSub: 'The journey stays small enough for a real committee to adopt.',
    trustTitle: 'Built for real society expectations',
    modulesTitle: 'Everything a society actually uses',
    pricingTeaser: '₹10 per flat a month, ₹499 minimum per society.', pricingCta: 'See pricing', faqTeaser: 'Need details?', faqCta: 'Read FAQ', contactCta: 'Request setup',
  },
  gu: {
    metaTitle: 'The Society OS', metaDesc: 'પ્રાંગણવન, સુરત અને ગુજરાતની હાઉસિંગ સોસાયટી માટે ગુજરાતી-પ્રથમ સોસાયટી મેનેજમેન્ટ: બિલિંગ, રસીદ, ફરિયાદ, નોટિસ.',
    badge: 'ગુજરાતી-પ્રથમ સોસાયટી મેનેજમેન્ટ',
    h1: 'આપની હાઉસિંગ સોસાયટી એક સ્પષ્ટ કમિટી ડેશબોર્ડથી સંભાળો.',
    sub: 'પ્રાંગણવન કમિટીને બિલ, રસીદ, ફરિયાદ, નોટિસ, દસ્તાવેજ, મતદાન, ઇવેન્ટ, પાર્કિંગ અને રિપોર્ટ સંભાળવામાં મદદ કરે છે. રહેવાસીઓ માટે સરળ વ્યૂ પણ આપે છે.',
    ctaDemo: 'ડેમો ખોલો', ctaContact: 'ડેમો માટે સંપર્ક કરો', ctaSecondary: 'લોગિન',
    previewEyebrow: 'પ્રોડક્ટ પ્રિવ્યુ', previewTitle: 'કમિટી માટે કંટ્રોલ, રહેવાસી માટે સ્પષ્ટતા', previewBody: 'રોજિંદા સોસાયટી કામ માટે વ્યવહારુ વર્કસ્પેસ, સાથે રહેવાસીને બાકી રકમ, નોટિસ અને ફરિયાદ સ્પષ્ટ દેખાય એવો હોમ.',
    adminLabel: 'કમિટી ડેશબોર્ડ', residentLabel: 'રહેવાસી વ્યૂ', dueThisMonth: 'આ મહિને બાકી', collected: 'જમા થયું', complaints: 'ખુલ્લી ફરિયાદ', notice: 'પાણીની ટાંકી સાફ કરવાની નોટિસ', receipt: 'રસીદ RT-2026-0042', residentDue: 'મેન્ટેનન્સ બાકી', residentComplaint: 'ફરિયાદ સ્થિતિ: ચાલુ',
    howTitle: 'કેવી રીતે ચાલે છે', howSub: 'વાસ્તવિક કમિટી સરળતાથી અપનાવી શકે એવી પ્રક્રિયા.',
    trustTitle: 'સોસાયટીની વાસ્તવિક અપેક્ષા માટે બનાવેલું',
    modulesTitle: 'સોસાયટીને રોજ ઉપયોગી થતી સુવિધાઓ',
    pricingTeaser: 'ફ્લેટ દીઠ મહિને ₹10, સોસાયટી દીઠ ઓછામાં ઓછું ₹499.', pricingCta: 'કિંમત જુઓ', faqTeaser: 'વિગત જોઈએ?', faqCta: 'FAQ વાંચો', contactCta: 'સેટઅપની વિનંતી',
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

const steps = [
  { icon: Building2, en: ['Set up the society', 'Create the society, choose modules, and start from one committee workspace.'], gu: ['સોસાયટી સેટ કરો', 'સોસાયટી બનાવો, જરૂરી સુવિધાઓ પસંદ કરો, અને એક કમિટી વર્કસ્પેસથી શરૂ કરો.'] },
  { icon: Users, en: ['Add flats and members', 'Add flats one by one or import members with validation before saving.'], gu: ['ફ્લેટ અને સભ્યો ઉમેરો', 'એક પછી એક ફ્લેટ ઉમેરો અથવા ચકાસણી સાથે સભ્યો આયાત કરો.'] },
  { icon: ClipboardCheck, en: ['Run daily work', 'Manage bills, payments, complaints, notices, documents, polls, events, parking, and reports.'], gu: ['રોજિંદું કામ ચલાવો', 'બિલ, ચુકવણી, ફરિયાદ, નોટિસ, દસ્તાવેજ, મતદાન, ઇવેન્ટ, પાર્કિંગ અને રિપોર્ટ સંભાળો.'] },
  { icon: Users, en: ['Residents use their view', 'Residents can check dues, receipts, notices, complaints, events, polls, parking, and profile details.'], gu: ['રહેવાસી પોતાનું વ્યૂ વાપરે', 'રહેવાસી બાકી રકમ, રસીદ, નોટિસ, ફરિયાદ, ઇવેન્ટ, મતદાન, પાર્કિંગ અને પ્રોફાઇલ જોઈ શકે.'] },
]

const trust = [
  { icon: ShieldCheck, en: 'Gujarati-first resident experience, not an English page translated later.', gu: 'રહેવાસી માટે ગુજરાતી-પ્રથમ અનુભવ; પછીથી કરેલો અનુવાદ નહીં.' },
  { icon: Database, en: 'Each society’s information stays separate and secure. People only see or change what their responsibility allows.', gu: 'દરેક સોસાયટીની માહિતી અલગ અને સુરક્ષિત રહે છે. અધિકૃત વ્યક્તિ પોતાની જવાબદારી મુજબ જ માહિતી જુએ કે બદલે.' },
  { icon: Lock, en: 'Private storage is used for supported uploads and permissioned documents.', gu: 'સપોર્ટેડ અપલોડ અને પરવાનગીવાળા દસ્તાવેજ માટે નિયંત્રિત સ્ટોરેજ વપરાય છે.' },
]

const demoTrust = {
  enabled: {
    icon: UploadCloud,
    en: 'The public demo is a separate fictional environment, so visitors can explore safely.',
    gu: 'પબ્લિક ડેમો અલગ કલ્પિત વાતાવરણ છે, એટલે નિરાંતે જોઈ શકાય.',
  },
  disabled: {
    icon: UploadCloud,
    en: 'Demo data is kept separate from real society sessions and records.',
    gu: 'ડેમો ડેટા વાસ્તવિક સોસાયટીના સેશન અને રેકોર્ડથી અલગ રાખવામાં આવે છે.',
  },
}

export default function Home() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  const demoEnabled = isDemoModeEnabled()
  const primaryCta = demoEnabled ? { to: '/demo', label: t.ctaDemo } : { to: '/contact', label: t.ctaContact }
  usePageMeta(t.metaTitle, t.metaDesc)

  useEffect(() => {
    const appScript = document.createElement('script')
    appScript.type = 'application/ld+json'
    appScript.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Prangan One', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Gujarati-first society management platform for housing society committees and residents.', offers: { '@type': 'Offer', price: '10', priceCurrency: 'INR', description: 'Per flat, per month' } })
    document.head.appendChild(appScript)
    const orgScript = document.createElement('script')
    orgScript.type = 'application/ld+json'
    orgScript.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Prangan One', url: 'https://pranganone.com', email: 'care@pranganone.com', sameAs: ['https://www.facebook.com/pranganone/', 'https://www.instagram.com/pranganone/', 'https://www.youtube.com/@PranganOne'] })
    document.head.appendChild(orgScript)
    return () => { document.head.removeChild(appScript); document.head.removeChild(orgScript) }
  }, [])

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-12 pb-12 sm:pt-16 sm:pb-14 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center relative">
          <div className="text-center lg:text-left">
            <span className="inline-flex rounded-full bg-navy-50 border border-navy-100 px-3.5 py-1.5 text-[12.5px] font-semibold text-navy-600">{t.badge}</span>
            <h1 className="mt-5 text-[34px] sm:text-[48px] font-bold leading-[1.12] text-balance">{t.h1}</h1>
            <p className="mt-4 text-[16px] sm:text-[17px] text-navy-500 leading-relaxed max-w-2xl mx-auto lg:mx-0">{t.sub}</p>
            <div className="mt-7 flex flex-col min-[380px]:flex-row justify-center lg:justify-start gap-3">
              <Link to={primaryCta.to} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 text-cream-50 px-5 py-3 text-[15px] font-bold hover:bg-navy-800">{primaryCta.label} <ArrowRight size={16} /></Link>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200 px-5 py-3 text-[15px] font-semibold text-navy-700 hover:bg-navy-50">{t.ctaSecondary}</Link>
            </div>
          </div>

          <div aria-label={t.previewTitle} className="rounded-3xl border border-cream-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-cream-200 pb-3 mb-4"><div><div className="text-[11px] uppercase tracking-wide text-saffron-600 font-bold">{t.previewEyebrow}</div><h2 className="text-[18px] font-bold">{t.previewTitle}</h2></div><span className="h-3 w-3 rounded-full bg-paid" /></div>
            <div className="grid sm:grid-cols-[1.15fr_0.85fr] gap-3">
              <div className="rounded-2xl bg-cream-50 border border-cream-200 p-4"><div className="text-[12px] font-bold text-navy-400 mb-3">{t.adminLabel}</div><div className="grid grid-cols-2 gap-2"><PreviewStat label={t.dueThisMonth} value="₹72,400" /><PreviewStat label={t.collected} value="82%" /></div><PreviewRow icon={Receipt} text={t.receipt} /><PreviewRow icon={Wrench} text={`${t.complaints}: 3`} /><PreviewRow icon={Bell} text={t.notice} /></div>
              <div className="rounded-2xl bg-navy-900 text-cream-50 p-4"><div className="text-[12px] font-bold text-cream-100/70 mb-3">{t.residentLabel}</div><div className="rounded-xl bg-cream-50 text-navy-900 p-3 mb-2"><div className="text-[11px] text-navy-400">{t.residentDue}</div><div className="text-[22px] font-bold num">₹1,200</div></div><div className="rounded-xl border border-cream-50/15 p-3 text-[12.5px]">{t.residentComplaint}</div></div>
            </div>
            <p className="text-[13px] text-navy-500 leading-relaxed mt-4">{t.previewBody}</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-6"><h2 className="font-bold text-[24px]">{t.howTitle}</h2><p className="text-[14.5px] text-navy-500 mt-2">{t.howSub}</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{steps.map((s, i) => { const [title, body] = lang === 'en' ? s.en : s.gu; return <div key={title} className="rounded-2xl border border-cream-200 bg-white p-5"><div className="flex items-center gap-3 mb-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron-500/15 text-saffron-700 font-bold text-[13px]">{i + 1}</span><s.icon size={20} className="text-saffron-500" /></div><h3 className="font-bold text-[15.5px]">{title}</h3><p className="text-[13.5px] text-navy-500 leading-relaxed mt-1.5">{body}</p></div> })}</div>
      </section>

      <section className="px-5 py-10 bg-navy-900 text-cream-50"><div className="max-w-5xl mx-auto"><h2 className="font-bold text-[24px] text-center mb-6">{t.trustTitle}</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{[...trust, demoEnabled ? demoTrust.enabled : demoTrust.disabled].map(item => <div key={item.en} className="rounded-2xl border border-cream-50/10 bg-cream-50/5 p-4"><item.icon size={20} className="text-saffron-400 mb-2" /><p className="text-[13.5px] leading-relaxed text-cream-100/85">{lang === 'en' ? item.en : item.gu}</p></div>)}</div></div></section>

      <section className="px-5 py-10 max-w-5xl mx-auto"><h2 className="font-bold text-[22px] text-center mb-6">{t.modulesTitle}</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{modules.map(m => <div key={m.en} className="rounded-xl border border-cream-200 bg-white px-3 py-4 text-center"><m.icon size={20} className="mx-auto text-saffron-500 mb-1.5" /><div className="text-[12.5px] font-semibold text-navy-700">{lang === 'en' ? m.en : m.gu}</div></div>)}</div></section>

      <section className="px-5 py-10 max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 text-center">
        {/* Informational pricing copy is a plain, non-interactive caption; only
            the "See pricing" CTA below it is a link, so screen readers and
            keyboard users get one real action, not a whole tappable sentence. */}
        <article className="rounded-2xl border border-cream-200 bg-white p-5">
          <p className="font-bold text-navy-800">{t.pricingTeaser}</p>
          <Link to="/pricing" className="inline-block text-[13px] text-saffron-600 font-semibold mt-1 hover:text-saffron-700 hover:underline">{t.pricingCta} →</Link>
        </article>
        <Link to="/faq" className="rounded-2xl border border-cream-200 bg-white p-5 hover:border-saffron-300"><div className="font-bold text-navy-800">{t.faqTeaser}</div><div className="text-[13px] text-saffron-600 font-semibold mt-1">{t.faqCta} →</div></Link>
        <Link to="/contact" className="rounded-2xl bg-saffron-500 text-navy-900 p-5 hover:bg-saffron-400"><div className="font-bold">{t.contactCta}</div><div className="text-[13px] font-semibold mt-1">→</div></Link>
      </section>
    </PublicLayout>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white border border-cream-200 p-3"><div className="text-[11px] text-navy-400">{label}</div><div className="text-[18px] font-bold num">{value}</div></div>
}

function PreviewRow({ icon: Icon, text }: { icon: typeof Receipt; text: string }) {
  return <div className="mt-2 flex items-center gap-2 rounded-xl bg-white border border-cream-200 px-3 py-2 text-[12.5px] font-semibold text-navy-700"><Icon size={15} className="text-saffron-500 shrink-0" /> <span>{text}</span></div>
}

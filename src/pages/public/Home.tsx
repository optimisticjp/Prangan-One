import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileText, Languages, MessageSquareText, ShieldCheck, Sparkles, ClipboardList, Clock3 } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'AI tools for small businesses',
    desc: 'Prangan One is building multilingual AI business tools for Indian service businesses: customer enquiries, quotation drafts and follow-ups. Join early access.',
    badge: 'Building in public · Early access',
    heading: 'Less busywork. More business.',
    intro: 'One simple workspace for the work that happens between a customer enquiry and a completed job. We are starting with AI-assisted quotations, replies and follow-ups for small service businesses.',
    primary: 'Join early access', secondary: 'Explore the roadmap',
    language: 'Designed for English, Hindi and Gujarati workflows',
    previewLabel: 'WORKFLOW CONCEPT · NOT A LIVE PRODUCT',
    previewTitle: 'From first message to ready-to-send quote.',
    previewSub: 'A preview of the workflow we are building, not a functioning AI demo.',
    enquiry: 'Customer enquiry', enquiryText: '“Can you quote for servicing three AC units this week?”',
    draft: 'AI-assisted draft', draftText: 'Service details, pricing and terms ready for your review.',
    followup: 'Follow-up', followupText: 'A clear, friendly message in your customer’s language.',
    tryQuote: 'Try Quotation Studio (free beta)',
    tryEnquiries: 'Try Enquiry Tracker (free beta)',
    stages: 'Our first planned tools',
    stageSub: 'Focused on connected work, not a directory of disconnected prompts.',
    principles: 'Built for the way small businesses actually work',
    principlesSub: 'Simple enough for a phone, careful with customer data, and designed to keep people in control.',
    stepTitle: 'Start with one real business workflow',
    stepSub: 'We are interviewing business owners and developing the first release. Tell us which task takes the most time in your day.',
    cta: 'Tell us what you need', faq: 'Questions? Read the FAQ',
  },
  gu: {
    title: 'નાના વ્યવસાય માટે AI ટૂલ્સ',
    desc: 'પ્રાંગણવન નાના ભારતીય વ્યવસાયો માટે ગ્રાહક પૂછપરછ, ક્વોટેશન ડ્રાફ્ટ અને ફોલોઅપના ગુજરાતી, હિન્દી અને અંગ્રેજી AI ટૂલ્સ બનાવી રહ્યું છે.',
    badge: 'વિકાસ ચાલુ છે · અર્લી એક્સેસ',
    heading: 'ઓછું કાગળકામ. વધુ વ્યવસાય.',
    intro: 'ગ્રાહકની પૂછપરછથી કામ પૂરું થાય ત્યાં સુધીની રોજની કામગીરી માટે એક સરળ જગ્યા. અમે નાના સર્વિસ વ્યવસાયો માટે AIની મદદથી ક્વોટેશન, જવાબ અને ફોલોઅપથી શરૂઆત કરી રહ્યા છીએ.',
    primary: 'અર્લી એક્સેસ માટે સંપર્ક કરો', secondary: 'આગામી ટૂલ્સ જુઓ',
    language: 'ગુજરાતી, હિન્દી અને અંગ્રેજીમાં કામકાજને ધ્યાનમાં રાખીને',
    previewLabel: 'વર્કફ્લો વિચાર · લાઇવ પ્રોડક્ટ નથી',
    previewTitle: 'ગ્રાહકના મેસેજથી તૈયાર ક્વોટેશન સુધી.',
    previewSub: 'અમે બનાવી રહ્યા છીએ તે પ્રક્રિયાનું ઉદાહરણ છે, ચાલતો AI ડેમો નથી.',
    enquiry: 'ગ્રાહકની પૂછપરછ', enquiryText: '“આ અઠવાડિયે ત્રણ AC સર્વિસ કરવાના કેટલા રૂપિયા?”',
    draft: 'AIની મદદથી ડ્રાફ્ટ', draftText: 'સર્વિસ, કિંમત અને શરતોનો ડ્રાફ્ટ. મોકલતાં પહેલાં આપ ચકાસો.',
    followup: 'ફોલોઅપ', followupText: 'ગ્રાહકની ભાષામાં સ્પષ્ટ અને મૈત્રીપૂર્ણ સંદેશ.',
    tryQuote: 'ક્વોટેશન સ્ટુડિયો અજમાવો (મફત બેટા)',
    tryEnquiries: 'ગ્રાહક પૂછપરછ ટ્રેકર અજમાવો (મફત બેટા)',
    stages: 'સૌપ્રથમ બનાવવાના ટૂલ્સ',
    stageSub: 'અલગ અલગ પ્રોમ્પ્ટ નહીં, પણ જોડાયેલાં રોજિંદાં કામ.',
    principles: 'નાના વ્યવસાયની રોજની જરૂરિયાત માટે',
    principlesSub: 'ફોન પર સરળ, ગ્રાહકના ડેટા માટે સાવચેત અને અંતિમ નિર્ણય આપના હાથમાં.',
    stepTitle: 'એક ઉપયોગી કામથી શરૂઆત',
    stepSub: 'અમે વ્યવસાય માલિકો સાથે વાતચીત કરીને પહેલું વર્ઝન બનાવી રહ્યા છીએ. આપના દિવસમાં સૌથી વધુ સમય કયા કામમાં જાય છે?',
    cta: 'આપની જરૂરિયાત જણાવો', faq: 'પ્રશ્નો છે? FAQ જુઓ',
  },
}

const tools = [
  { icon: MessageSquareText, en: ['Enquiry capture', 'Collect the details you need before preparing a quote.'], gu: ['ગ્રાહકની પૂછપરછ', 'ક્વોટેશન પહેલાં જરૂરી માહિતી ગોઠવો.'] },
  { icon: FileText, en: ['Quotation drafts', 'Turn job details into a quotation draft you can edit.'], gu: ['ક્વોટેશન ડ્રાફ્ટ', 'કામની વિગતોમાંથી ચકાસી શકાય તેવો ડ્રાફ્ટ.'] },
  { icon: Languages, en: ['Multilingual replies', 'Prepare customer-friendly messages in your preferred language.'], gu: ['ભાષા પ્રમાણે જવાબ', 'ગ્રાહકને સમજાય એવી ભાષામાં સંદેશનો ડ્રાફ્ટ.'] },
  { icon: Clock3, en: ['Follow-up reminders', 'Keep track of who needs a reply and what happens next.'], gu: ['ફોલોઅપ યાદી', 'કોને જવાબ આપવો બાકી છે તે યાદ રાખો.'] },
]

const values = [
  { icon: ShieldCheck, en: 'People review every quote and customer message before sending.', gu: 'ક્વોટેશન અને સંદેશ મોકલતાં પહેલાં માણસની ચકાસણી.' },
  { icon: ClipboardList, en: 'Real job details matter more than another generic chatbot.', gu: 'સામાન્ય ચેટબોટ કરતાં સાચા કામની વિગતો વધુ જરૂરી.' },
  { icon: CheckCircle2, en: 'Start small, test with real businesses, then expand what works.', gu: 'નાનાથી શરૂ કરી, વ્યવસાય સાથે ચકાસીને આગળ વધવું.' },
]

export default function Home() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'Prangan One', url: 'https://pranganone.com/',
      email: 'care@pranganone.com',
      description: 'Early-stage software project developing AI tools for small business workflows in India.',
    })
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="relative overflow-hidden px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-saffron-500/10" aria-hidden="true" />
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-10 relative">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-saffron-200 bg-saffron-500/10 px-3.5 py-1.5 text-[12px] font-semibold text-navy-700"><Sparkles size={15} /> {t.badge}</span>
            <h1 className="mt-6 max-w-2xl text-[36px] sm:text-[54px] font-bold leading-[1.1] tracking-tight text-navy-900 text-balance">{t.heading}</h1>
            <p className="mt-5 max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-navy-600">{t.intro}</p>
            <div className="mt-7 flex flex-col min-[400px]:flex-row gap-3">
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3.5 text-cream-50 font-bold hover:bg-navy-800">{t.primary}<ArrowRight size={17}/></Link>
              <Link to="/features" className="inline-flex items-center justify-center rounded-xl border border-navy-200 px-5 py-3.5 font-semibold text-navy-700 hover:bg-white">{t.secondary}</Link>
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-[13px] text-navy-500"><Languages size={17} aria-hidden="true"/>{t.language}</p>
          </div>
          <div className="rounded-3xl border border-cream-200 bg-white shadow-lg shadow-navy-900/5 p-5 sm:p-6" aria-label={t.previewTitle}>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-saffron-700">{t.previewLabel}</p>
            <h2 className="mt-2 text-[23px] leading-tight font-bold">{t.previewTitle}</h2>
            <p className="mt-2 text-[12.5px] text-navy-500">{t.previewSub}</p>
            <div className="mt-5 space-y-3">
              {[
                { title: t.enquiry, body: t.enquiryText, icon: MessageSquareText, n: '01' },
                { title: t.draft, body: t.draftText, icon: FileText, n: '02' },
                { title: t.followup, body: t.followupText, icon: Clock3, n: '03' },
              ].map(item => (
                <div key={item.n} className="flex gap-3 rounded-2xl bg-cream-50 border border-cream-200 p-3.5">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-navy-900 text-cream-50 flex items-center justify-center"><item.icon size={19}/></div>
                  <div><div className="flex items-center gap-2 text-[12px] text-saffron-700 font-bold">{item.n}<span className="text-[14px] text-navy-900">{item.title}</span></div><p className="mt-1 text-[12.5px] text-navy-500 leading-relaxed">{item.body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white border-y border-cream-200 px-5 py-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[26px] font-bold">{t.stages}</h2>
          <p className="mt-2 text-navy-500 max-w-2xl">{t.stageSub}</p>
          <div className="mt-4 flex flex-wrap gap-3"><Link to="/tools/enquiries" className="inline-flex items-center gap-2 rounded-xl bg-saffron-500 px-4 py-3 text-[13px] font-semibold text-navy-900 hover:bg-saffron-400">{t.tryEnquiries}<ArrowRight size={16}/></Link><Link to="/tools/quote" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 text-cream-50 px-4 py-3 text-[13px] font-semibold hover:bg-navy-800">{t.tryQuote}<ArrowRight size={16}/></Link></div>
          <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map(item => { const [title, body] = lang === 'en' ? item.en : item.gu; return (
              <article key={title} className="rounded-2xl border border-cream-200 bg-cream-50 p-5">
                <item.icon className="text-saffron-600" size={23}/>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-[13.5px] text-navy-500 leading-relaxed">{body}</p>
              </article>
            ) })}
          </div>
        </div>
      </section>
      <section className="px-5 py-14 max-w-5xl mx-auto">
        <h2 className="text-[26px] font-bold">{t.principles}</h2>
        <p className="mt-2 text-navy-500">{t.principlesSub}</p>
        <div className="mt-7 grid md:grid-cols-3 gap-4">
          {values.map(item => <div key={item.en} className="flex gap-3 rounded-2xl border border-cream-200 p-5"><item.icon size={21} className="shrink-0 text-saffron-600"/><p className="text-[14px] text-navy-700">{lang === 'en' ? item.en : item.gu}</p></div>)}
        </div>
      </section>
      <section className="px-5 pb-10">
        <div className="max-w-5xl mx-auto rounded-3xl bg-navy-900 p-7 sm:p-10 text-cream-50">
          <h2 className="text-[26px] font-bold">{t.stepTitle}</h2>
          <p className="mt-3 max-w-2xl text-cream-100/80 leading-relaxed">{t.stepSub}</p>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Link to="/contact" className="inline-flex gap-2 items-center bg-saffron-500 hover:bg-saffron-400 text-navy-900 rounded-xl px-5 py-3 font-bold">{t.cta}<ArrowRight size={17}/></Link>
            <Link to="/faq" className="text-[14px] text-cream-100 hover:underline">{t.faq} →</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

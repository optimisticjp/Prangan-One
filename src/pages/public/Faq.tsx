import { useEffect } from 'react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'FAQ', desc: 'Real answers to the questions a committee actually has before switching.',
    h1: 'Frequently asked questions',
    items: [
      ['Do residents need to be tech-savvy to use this?', 'No. The resident view is four buttons: bill, complaints, notices, and more. If someone can use WhatsApp, they can use this.'],
      ['Can tenants use it, not just flat owners?', 'Yes. Each society sets tenant access to disabled, limited, or full, so you decide exactly how much a tenant can see.'],
      ['Can we start without an online payment gateway?', 'Yes, and that\u2019s the default. Payments are recorded manually by the committee, UPI, cash, or cheque, the same way most societies already work.'],
      ['Can we export our reports and data?', 'Anytime, in full. Nothing is locked in. Export is a button, not a support ticket.'],
      ['Can we disable features we don\u2019t need?', 'Yes. Every module can be turned off, some societies start with just billing and complaints and add the rest later.'],
      ['Who controls member access?', 'Your committee does. You decide who gets added, what role they hold, and when access is removed.'],
      ['What happens if we\u2019re late paying you?', 'You get a quiet heads-up first (grace period), never a public embarrassment in front of your residents. Only after that does the app pause, and history stays visible even then.'],
      ['Is our data private from other societies?', 'Not yet in a shared sense, there\u2019s no live backend connected today, everything runs in your own browser. Before any real society\u2019s data goes live, it moves to a database where every society\u2019s access rules are enforced at the database level, not just hidden in the interface.'],
      ['Can we use Gujarati?', 'The whole app is Gujarati-first, written the way people actually speak, not translated from English.'],
      ['Can older residents use this comfortably?', 'That was a design priority from day one: large text, simple navigation, no jargon.'],
      ['What happens when our committee changes?', 'Admin access transfers in one click. Nothing is lost, no data, no history, across a committee handover.'],
    ],
  },
  gu: {
    title: 'FAQ', desc: 'સોસાયટી બદલતા પહેલા જે સવાલ થાય, એના સાચા જવાબ.',
    h1: 'વારંવાર પુછાતા પ્રશ્નો',
    items: [
      ['રહેવાસીઓને ટેક્નિકલ જ્ઞાન જોઈએ?', 'ના. રહેવાસી માટે ચાર બટન છે: બિલ, ફરિયાદ, નોટિસ, વધુ. WhatsApp વાપરી શકે એ આ પણ વાપરી શકે.'],
      ['ભાડૂત વાપરી શકે, ફક્ત માલિક નહીં?', 'હા. દરેક સોસાયટી ભાડૂત એક્સેસ બંધ, મર્યાદિત કે પૂરું સેટ કરી શકે.'],
      ['ઓનલાઈન પેમેન્ટ ગેટવે વગર શરૂ કરી શકાય?', 'હા, અને એ જ ડિફોલ્ટ છે. ચુકવણી કમિટી મેન્યુઅલી નોંધે છે, UPI, રોકડ કે ચેકથી.'],
      ['રિપોર્ટ અને ડેટા એક્સપોર્ટ કરી શકાય?', 'ગમે ત્યારે, પૂરેપૂરું. કંઈ લોક નથી.'],
      ['જે સુવિધા ના જોઈએ એ બંધ કરી શકાય?', 'હા. દરેક મોડ્યુલ બંધ કરી શકાય.'],
      ['સભ્યની એક્સેસ કોણ નિયંત્રિત કરે?', 'તમારી કમિટી. કોણ ઉમેરાય, શું રોલ મળે, એ તમે નક્કી કરો.'],
      ['ચુકવણી મોડી થાય તો શું?', 'પહેલા શાંતિથી યાદ અપાવીશું (ગ્રેસ પિરિયડ), રહેવાસીઓ સામે શરમ નહીં. પછી જ એપ થોભે, અને ઇતિહાસ તોય દેખાતો રહે.'],
      ['અમારો ડેટા બીજી સોસાયટીથી અલગ છે?', 'હાલમાં હજુ કોઈ શેર થયેલું બેકએન્ડ નથી, બધું તમારા બ્રાઉઝરમાં જ ચાલે છે. કોઈ સોસાયટીનો સાચો ડેટા લાઈવ થાય એ પહેલાં, એ ડેટાબેઝમાં જશે જ્યાં દરેક સોસાયટીના એક્સેસ નિયમો ડેટાબેઝ લેવલે જ લાગુ થશે, ફક્ત ઈન્ટરફેસમાં છુપાવેલા નહીં.'],
      ['ગુજરાતીમાં વાપરી શકાય?', 'આખી એપ ગુજરાતી-ફર્સ્ટ છે, બોલાતી ભાષામાં લખાયેલી.'],
      ['વૃદ્ધ સભ્યો સહેલાઈથી વાપરી શકે?', 'આ શરૂઆતથી જ ડિઝાઈનનું ધ્યાન હતું: મોટા અક્ષર, સાદું નેવિગેશન.'],
      ['કમિટી બદલાય તો શું થાય?', 'એડમિન એક્સેસ એક ટેપમાં ટ્રાન્સફર થાય. કંઈ ખોવાય નહીં.'],
    ],
  },
}

export default function Faq() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.items.map(([q, a]) => ({
        '@type': 'Question', name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [t])

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-14 pb-16 max-w-2xl mx-auto">
        <h1 className="text-[30px] font-bold text-center mb-8">{t.h1}</h1>
        <div className="space-y-4">
          {t.items.map(([q, a]) => (
            <div key={q} className="rounded-xl border border-cream-200 bg-white p-4">
              <div className="font-bold text-[15px] text-navy-800">{q}</div>
              <p className="text-[13.5px] text-navy-500 mt-1.5 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

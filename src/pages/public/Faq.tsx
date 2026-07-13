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
      ['Can we export our reports and data?', 'Use the available exports for supported records when you need them. Export scope depends on the module.'],
      ['Can we disable features we don\u2019t need?', 'Yes. Available modules can be turned off; some societies start with billing and complaints and add the rest later.'],
      ['Who controls member access?', 'Your committee does. The society decides who gets added, what role they hold, and when access is removed.'],
      ['What happens if we\u2019re late paying you?', 'You get a quiet heads-up first (grace period), never a public embarrassment in front of your residents. Only after that does the app pause, and history stays visible even then.'],
      ['How long is the free trial, and do we need a card?', '90 days with available modules. No card is needed to start. The 90 days begins once your society is actually set up and ready to use, not the day you first reach out.'],
      ['Is our data private from other societies?', 'Yes, and it stays that way. Every society only ever sees its own flats, bills, payments, complaints, notices, documents, and everything else, and a resident only ever sees their own flat\u2019s bills, never a neighbor\u2019s. This is built into how the app works, not just hidden on screen.'],
      ['Can we use Gujarati?', 'The whole app is Gujarati-first, written the way people actually speak, not translated from English.'],
      ['Can older residents use this comfortably?', 'That was a design priority from day one: large text, simple navigation, no jargon.'],
      ['What happens when our committee changes?', 'Records are kept securely online, not on any one committee member\u2019s phone or laptop, so nothing from before is lost. The new admin gets real access, granted by your committee.'],
    ],
  },
  gu: {
    title: 'FAQ', desc: 'સોસાયટી બદલતા પહેલા જે સવાલ થાય, એના સાચા જવાબ.',
    h1: 'વારંવાર પુછાતા પ્રશ્નો',
    items: [
      ['રહેવાસીઓને ટેક્નિકલ જ્ઞાન જોઈએ?', 'ના. રહેવાસી માટે ચાર બટન છે: બિલ, ફરિયાદ, નોટિસ, વધુ. WhatsApp વાપરી શકે એ આ પણ વાપરી શકે.'],
      ['ભાડૂત વાપરી શકે, ફક્ત માલિક નહીં?', 'હા. દરેક સોસાયટી ભાડૂત એક્સેસ બંધ, મર્યાદિત કે પૂરું સેટ કરી શકે.'],
      ['ઓનલાઈન પેમેન્ટ ગેટવે વગર શરૂ કરી શકાય?', 'હા, અને એ જ ડિફોલ્ટ છે. ચુકવણી કમિટી મેન્યુઅલી નોંધે છે, UPI, રોકડ કે ચેકથી.'],
      ['રિપોર્ટ અને ડેટા એક્સપોર્ટ કરી શકાય?', 'જરૂર પડે ત્યારે સપોર્ટેડ રેકોર્ડ માટે ઉપલબ્ધ એક્સપોર્ટ વાપરી શકાય. એક્સપોર્ટનો વ્યાપ મોડ્યુલ પ્રમાણે રહે છે.'],
      ['જે સુવિધા ના જોઈએ એ બંધ કરી શકાય?', 'હા. ઉપલબ્ધ મોડ્યુલ બંધ કરી શકાય.'],
      ['સભ્યની એક્સેસ કોણ નિયંત્રિત કરે?', 'આપની કમિટી. કોણ ઉમેરાય, શું રોલ મળે અને ક્યારે એક્સેસ દૂર થાય તે સોસાયટી નક્કી કરે છે.'],
      ['ચુકવણી મોડી થાય તો શું?', 'પહેલા શાંતિથી યાદ અપાવીશું (ગ્રેસ પિરિયડ), રહેવાસીઓ સામે શરમ નહીં. પછી જ એપ થોભે, અને ઇતિહાસ તોય દેખાતો રહે.'],
      ['ફ્રી ટ્રાયલ કેટલા દિવસનો છે, કાર્ડ જોઈએ?', '90 દિવસ, ઉપલબ્ધ મોડ્યુલ સાથે. શરૂ કરવા કાર્ડની જરૂર નથી. 90 દિવસ ત્યારે શરૂ થાય જ્યારે આપની સોસાયટી ખરેખર સેટ થઈને વાપરવા તૈયાર થાય, પહેલો સંપર્ક કરો એ દિવસે નહીં.'],
      ['અમારો ડેટા બીજી સોસાયટીથી અલગ છે?', 'હા. દરેક સોસાયટીની માહિતી અલગ અને સુરક્ષિત રહે છે; આ ફક્ત સ્ક્રીન પર છુપાવવાની વાત નથી, સિસ્ટમ સ્તરે જ લાગુ છે. દરેક સોસાયટી ફક્ત પોતાના ફ્લેટ, બિલ, ચુકવણી, ફરિયાદ, નોટિસ, દસ્તાવેજો અને બાકી બધું જુએ, અને રહેવાસી ફક્ત પોતાના ફ્લેટનું બિલ જુએ, પડોશીનું ક્યારેય નહીં.'],
      ['ગુજરાતીમાં વાપરી શકાય?', 'આખી એપ ગુજરાતી-પ્રથમ છે, બોલાતી ભાષામાં લખાયેલી.'],
      ['વૃદ્ધ સભ્યો સહેલાઈથી વાપરી શકે?', 'આ શરૂઆતથી જ ડિઝાઈનનું ધ્યાન હતું: મોટા અક્ષર, સાદું નેવિગેશન.'],
      ['કમિટી બદલાય તો શું થાય?', 'રેકોર્ડ સુરક્ષિત રીતે ઓનલાઈન સચવાય છે, કોઈ એક કમિટી મેમ્બરના ફોન કે લેપટોપ પર નહીં, એટલે પહેલાનું કંઈ ખોવાય નહીં. નવા એડમિનને આપની કમિટી તરફથી યોગ્ય એક્સેસ મળે.'],
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

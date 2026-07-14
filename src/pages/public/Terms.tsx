import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Terms of Service', desc: 'The plain-language terms for using Prangan One.',
    h1: 'Terms of Service',
    updated: 'Last updated: July 2026',
    sections: [
      ['The service', 'Prangan One is software for running a housing society\u2019s billing, complaints, notices, and related operations. Setup is done personally by us, not through a self-serve signup form.'],
      ['Trial and pricing', 'New societies get 90 days free, starting the day your society is actually set up and ready to use, not the day you first contact us. No card is required to start the trial. After the trial, pricing is \u20b910 per flat per month, with a \u20b9499 minimum per society per month, whichever is higher. There is no online payment gateway for resident maintenance dues; payments are recorded manually by your committee.'],
      ['What happens if payment lapses', 'If your subscription lapses, you get a 14-day grace period with full access and a clear notice, not an immediate cutoff. After grace, the account becomes read-only: your committee can still log in, view historical records, and use available exports, but cannot create new bills, payments, or other records until the subscription is renewed. Non-payment does not automatically delete society records; deletion and retention are handled under the Privacy Policy and applicable obligations.'],
      ['Your society’s records', 'Your society controls the records it puts into Prangan One. You can use available exports for bills, payments, and member records. If you stop using the service, see our Privacy Policy for how export, deletion, and retention requests are handled after you leave.'],
      ['What you agree to', 'You will not use Prangan One to store or share anything unlawful, will not attempt to access another society\u2019s data or bypass the platform\u2019s access controls, and are responsible for who your own society grants committee or finance access to.'],
      ['What we are still building', 'Prangan One is an evolving product, not a finished, static system. Some capabilities described in our marketing (like fully server-enforced audit logs, or a fully independent finance role) are being built out incrementally, not all live on day one for every account. We will not claim a capability is complete until it genuinely is.'],
      ['Limits on our liability', 'Prangan One is provided as a tool to help run your society\u2019s operations more easily; it is not a substitute for your society\u2019s own legal, financial, or statutory compliance obligations under applicable housing society law. We are not liable for decisions your committee makes using data from the app, or for losses arising from your own account\u2019s misuse by someone you granted access to.'],
      ['Changes to these terms', 'If we materially change these terms, we will update this page. Where appropriate and operationally available, we may also notify the society admin through an available contact channel.'],
      ['Contact', 'Questions about these terms: care@pranganone.com.'],
    ],
  },
  gu: {
    title: 'સેવાની શરતો', desc: 'પ્રાંગણવન વાપરવા માટેની સાદી ભાષામાં શરતો.',
    h1: 'સેવાની શરતો',
    updated: 'છેલ્લે અપડેટ: જુલાઈ 2026',
    sections: [
      ['સેવા', 'પ્રાંગણવન હાઉસિંગ સોસાયટીનું બિલિંગ, ફરિયાદ, નોટિસ અને સંબંધિત કામકાજ ચલાવવા માટેનું સોફ્ટવેર છે. સેટઅપ અમે સીધું અને વ્યક્તિગત રીતે કરીએ છીએ; આ સેલ્ફ-સર્વ સાઇનઅપ ફોર્મથી શરૂ થતી સેવા નથી.'],
      ['ટ્રાયલ અને કિંમત', 'નવી સોસાયટીને 90 દિવસ મફત મળે છે. આ સમયગાળો આપની સોસાયટી ખરેખર સેટ થઈને વાપરવા તૈયાર થાય ત્યારથી શરૂ થાય છે, પ્રથમ સંપર્કના દિવસથી નહીં. ટ્રાયલ શરૂ કરવા કાર્ડની જરૂર નથી. ટ્રાયલ પછી કિંમત ફ્લેટ દીઠ મહિને ₹10 છે, સોસાયટી દીઠ ઓછામાં ઓછું ₹499 મહિને, બેમાંથી જે વધારે હોય તે. રહેવાસીની મેન્ટેનન્સ ચુકવણી માટે ઓનલાઈન ચુકવણી ગેટવે નથી; ચુકવણીઓ આપની કમિટી મેન્યુઅલી નોંધે છે.'],
      ['ચુકવણી ચૂકી જાય તો શું', 'સબ્સ્ક્રિપ્શન ચૂકી જાય તો 14 દિવસનો ગ્રેસ પિરિયડ મળે છે, સંપૂર્ણ એક્સેસ અને સ્પષ્ટ સૂચના સાથે; તરત કાપી નાખવામાં આવતું નથી. ગ્રેસ પછી એકાઉન્ટ ફક્ત જોવા માટે રહે છે: કમિટી લોગિન કરી શકે, જૂના રેકોર્ડ જોઈ શકે અને ઉપલબ્ધ એક્સપોર્ટ વાપરી શકે, પરંતુ સબ્સ્ક્રિપ્શન રિન્યુ થાય ત્યાં સુધી નવું બિલ, ચુકવણી અથવા અન્ય રેકોર્ડ બનાવી શકતી નથી. ચૂકવણી બાકી હોવાથી સોસાયટી રેકોર્ડ આપમેળે ડિલીટ થતા નથી; ડિલીટ અને રિટેન્શન પ્રાઇવસી પોલિસી અને લાગુ જવાબદારીઓ મુજબ સંભાળવામાં આવે છે.'],
      ['આપની સોસાયટીનો ડેટા', 'પ્રાંગણવનમાં દાખલ કરેલા રેકોર્ડ પર આપની સોસાયટીનું નિયંત્રણ છે. આપ ઉપલબ્ધ બિલ, ચુકવણી અને સભ્ય રેકોર્ડ માટેના એક્સપોર્ટ વાપરી શકો છો. સેવા બંધ કર્યા પછી એક્સપોર્ટ, ડિલીટ અને રિટેન્શન વિનંતી કેવી રીતે સંભાળાય તે માટે પ્રાઇવસી પોલિસી જુઓ.'],
      ['આપ શું સંમત થાઓ છો', 'આપ પ્રાંગણવનમાં ગેરકાયદેસર વસ્તુ સ્ટોર કે શેર નહીં કરો, બીજી સોસાયટીના ડેટાની એક્સેસ મેળવવાનો અથવા પ્લેટફોર્મના ઍક્સેસ કંટ્રોલને બાયપાસ કરવાનો પ્રયત્ન નહીં કરો, અને આપની સોસાયટી કોને કમિટી અથવા ફાઇનાન્સ એક્સેસ આપે છે તેની જવાબદારી આપની સોસાયટીની રહેશે.'],
      ['અમે હજુ શું બનાવી રહ્યા છીએ', 'પ્રાંગણવન વિકસતું પ્રોડક્ટ છે, પૂર્ણ અને સ્થિર સિસ્ટમ નહીં. માર્કેટિંગમાં વર્ણવાયેલી કેટલીક ક્ષમતાઓ, જેમ કે વધુ સંપૂર્ણ સર્વર-એનફોર્સ્ડ ઓડિટ લોગ અથવા સંપૂર્ણ સ્વતંત્ર ફાઇનાન્સ ભૂમિકા, તબક્કાવાર બને છે અને દરેક એકાઉન્ટ પર પહેલે દિવસે લાઈવ હોય જ એવું નથી. કોઈ ક્ષમતા ખરેખર પૂર્ણ થાય ત્યાર પછી જ અમે તેને પૂર્ણ ગણાવીશું.'],
      ['અમારી જવાબદારીની મર્યાદા', 'પ્રાંગણવન આપની સોસાયટીનું કામકાજ સરળ બનાવવાનું સાધન છે; લાગુ હાઉસિંગ સોસાયટી કાયદા હેઠળ આપની સોસાયટીની પોતાની કાનૂની, નાણાકીય અથવા વૈધાનિક પાલન જવાબદારીઓનો વિકલ્પ નથી. એપના ડેટા પરથી કમિટી લેતા નિર્ણયો અથવા આપની સોસાયટીએ આપેલી એક્સેસના દુરુપયોગથી થનારા નુકસાન માટે અમે જવાબદાર નથી.'],
      ['શરતોમાં ફેરફાર', 'આ શરતોમાં મહત્વનો ફેરફાર થશે તો અમે આ પેજ અપડેટ કરીશું. યોગ્ય અને વ્યવહારિક રીતે શક્ય હોય ત્યારે ઉપલબ્ધ સંપર્ક માધ્યમથી સોસાયટીના એડમિનને પણ જાણ કરી શકીએ છીએ.'],
      ['સંપર્ક', 'આ શરતો વિશે સવાલ હોય તો care@pranganone.com પર લખો.'],
    ],
  },
}

export default function Terms() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-14 pb-16 max-w-2xl mx-auto">
        <h1 className="text-[30px] font-bold text-center">{t.h1}</h1>
        <p className="text-[12.5px] text-navy-400 text-center mt-1.5">{t.updated}</p>
        <div className="space-y-4 mt-8">
          {t.sections.map(([h, body]) => (
            <div key={h} className="rounded-xl border border-cream-200 bg-white p-4">
              <div className="font-bold text-[15px] text-navy-800">{h}</div>
              <p className="text-[13.5px] text-navy-500 mt-1.5 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

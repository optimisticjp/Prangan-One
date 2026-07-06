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
      ['What happens if payment lapses', 'If your subscription lapses, you get a 14-day grace period with full access and a clear notice, not an immediate cutoff. After grace, the account becomes read-only: your committee can still log in, view historical records, and export your data, but cannot create new bills, payments, or other records until the subscription is renewed. We do not delete or hide your society\u2019s data for non-payment.'],
      ['Your data is yours', 'Your society owns the data you put into Prangan One. You can export your bills, payments, and member records at any time. If you stop using the service, we do not hold your data hostage; see our Privacy Policy for how deletion works after you leave.'],
      ['What you agree to', 'You will not use Prangan One to store or share anything unlawful, will not attempt to access another society\u2019s data or bypass the platform\u2019s access controls, and are responsible for who your own society grants committee or finance access to.'],
      ['What we are still building', 'Prangan One is an evolving product, not a finished, static system. Some capabilities described in our marketing (like fully server-enforced audit logs, or a fully independent finance role) are being built out incrementally, not all live on day one for every account. We will not claim a capability is complete until it genuinely is.'],
      ['Limits on our liability', 'Prangan One is provided as a tool to help run your society\u2019s operations more easily; it is not a substitute for your society\u2019s own legal, financial, or statutory compliance obligations under applicable housing society law. We are not liable for decisions your committee makes using data from the app, or for losses arising from your own account\u2019s misuse by someone you granted access to.'],
      ['Changes to these terms', 'If we materially change these terms, we will update this page and, where the change is significant, tell your society\u2019s admin directly rather than let it pass silently.'],
      ['Contact', 'Questions about these terms: care@pranganone.com.'],
    ],
  },
  gu: {
    title: 'સેવાની શરતો', desc: 'Prangan One વાપરવા માટેની સાદી ભાષામાં શરતો.',
    h1: 'સેવાની શરતો',
    updated: 'છેલ્લે અપડેટ: જુલાઈ 2026',
    sections: [
      ['સેવા', 'Prangan One હાઉસિંગ સોસાયટીનું બિલિંગ, ફરિયાદ, નોટિસ, અને સંબંધિત કામકાજ ચલાવવા માટેનું સોફ્ટવેર છે. સેટઅપ અમે સીધું જાતે કરીએ છીએ, સેલ્ફ-સર્વ ફોર્મથી નહીં.'],
      ['ટ્રાયલ અને કિંમત', 'નવી સોસાયટીને 90 દિવસ મફત મળે છે, જે દિવસે તમારી સોસાયટી ખરેખર સેટ થઈને વાપરવા તૈયાર થાય ત્યારથી શરૂ થાય, પહેલો સંપર્ક કરો એ દિવસથી નહીં. ટ્રાયલ શરૂ કરવા કાર્ડની જરૂર નથી. ટ્રાયલ પછી, કિંમત ફ્લેટ દીઠ મહિને ₹10, સોસાયટી દીઠ ઓછામાં ઓછું ₹499 મહિને, બેમાંથી જે વધારે હોય તે.'],
      ['ચુકવણી ચૂકી જાય તો શું', 'સબ્સ્ક્રિપ્શન ચૂકી જાય તો, 14 દિવસનો ગ્રેસ પિરિયડ મળે છે, પૂરો એક્સેસ અને સ્પષ્ટ સૂચના સાથે, તરત બંધ નહીં. ગ્રેસ પછી, એકાઉન્ટ ફક્ત જોવા માટે થાય છે: તમારી કમિટી લોગિન કરી શકે, જૂનો રેકોર્ડ જોઈ શકે, ડેટા એક્સપોર્ટ કરી શકે, પણ નવું બિલ કે ચુકવણી બનાવી ના શકે.'],
      ['તમારો ડેટા તમારો છે', 'તમારી સોસાયટી પોતાનો ડેટા ધરાવે છે. તમે ગમે ત્યારે બિલ, ચુકવણી, અને સભ્ય રેકોર્ડ એક્સપોર્ટ કરી શકો છો.'],
      ['તમે શું સંમત થાઓ છો', 'તમે Prangan One પર ગેરકાયદેસર કંઈ સ્ટોર કે શેર નહીં કરો, બીજી સોસાયટીના ડેટાની એક્સેસ મેળવવાનો પ્રયત્ન નહીં કરો.'],
      ['અમે હજુ શું બનાવી રહ્યા છીએ', 'Prangan One વિકસતું પ્રોડક્ટ છે, પૂરું થયેલું નહીં. કેટલીક સુવિધાઓ ધીમે ધીમે બની રહી છે, દરેક એકાઉન્ટ પર પહેલા દિવસથી બધું લાઈવ નથી.'],
      ['અમારી જવાબદારીની મર્યાદા', 'Prangan One તમારી સોસાયટીનું કામકાજ સહેલું બનાવવાનું સાધન છે; તમારી સોસાયટીની કાનૂની કે નાણાકીય જવાબદારીનો વિકલ્પ નથી.'],
      ['શરતોમાં ફેરફાર', 'મોટો ફેરફાર થાય તો, અમે તમારી સોસાયટીના એડમિનને સીધું જણાવીશું.'],
      ['સંપર્ક', 'આ શરતો વિશે સવાલ: care@pranganone.com.'],
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

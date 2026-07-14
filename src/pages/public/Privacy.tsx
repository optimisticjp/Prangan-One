import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'

const copy = {
  en: {
    title: 'Privacy Policy', desc: 'What data Prangan One collects, how it is protected, and what control you have over it.',
    h1: 'Privacy Policy',
    updated: 'Last updated: July 2026',
    sections: [
      ['What we collect', 'To run your society, we hold: resident and committee contact details (name, phone, email), flat and ownership records, maintenance bills and payment history, complaints and their internal notes, notices, and documents you upload. For committee and finance roles, we also log account activity relevant to those actions (like a receipt cancellation and its stated reason).'],
      ['How we use it', 'We use society data to provide, maintain, secure, support, and communicate about Prangan One for the society.'],
      ['Who can actually see what', 'This is enforced by the database itself, not just hidden in the screen you happen to be looking at. A resident sees their own flat\u2019s bills and payments, never a neighbor\u2019s. A personal complaint is visible only to the person who filed it and your committee; a community complaint (a broken lift, say) is visible to every resident. Committee and finance roles see what their role needs to do the job. This protection covers flats, bills, payments, complaints, notices, documents, and adjustments directly at the database level.'],
      ['Platform owner access, stated plainly', 'Prangan One\u2019s own operator currently has standing read access to every society\u2019s data on the platform, the same way any small software team maintaining a live product typically does at this stage. Entering a society for support is genuinely logged, who, when, and why, not just shown on screen, and while that support session is active, even the operator\u2019s own account is refused from writing anything to your society\u2019s data, enforced by the database itself, not only hidden in the interface. Standing read access itself is still real; we are working toward narrowing that further and will update this page when that changes. Until then, treat this the way you would any vendor with administrative access to a system holding your records.'],
      ['Where your data lives', 'Prangan One uses Supabase with Postgres for the live application. A separate demo mode (no login, for browsing the app itself) lives in your own browser storage and stays separate from the real database.'],
      ['How long we keep it', 'For as long as your society remains an active customer, plus a reasonable period after in case you return or need historical records for your own society\u2019s continuity. After a society stops using the service, it may request deletion or export of available records. We will process the request according to the applicable agreement, legal obligations, and records we are required to retain.'],
      ['Your export and correction rights', 'You can export your society\u2019s bills, payments, and member list at any time from within the app, no request needed. If something in your records is wrong, whoever holds the society_admin or treasurer role for your society can correct it directly; if you need our help doing that, write to the email below.'],
      ['If something goes wrong', 'If we identify unauthorised access involving society data, we will assess it and communicate with the appropriate society contact according to applicable legal and contractual obligations.'],
      ['Questions', 'Write to privacy@pranganone.com for anything on this page, a correction request, or available export options.'],
    ],
  },
  gu: {
    title: 'પ્રાઇવસી પોલિસી', desc: 'પ્રાંગણવન કયો ડેટા રાખે છે, કેવી રીતે સુરક્ષિત છે, અને આપનું નિયંત્રણ શું છે.',
    h1: 'પ્રાઇવસી પોલિસી',
    updated: 'છેલ્લે અપડેટ: જુલાઈ 2026',
    sections: [
      ['અમે શું રાખીએ છીએ', 'આપની સોસાયટી ચલાવવા માટે અમે રાખીએ છીએ: રહેવાસી અને કમિટીની સંપર્ક વિગત (નામ, ફોન, ઈમેલ), ફ્લેટ અને માલિકીના રેકોર્ડ, બિલ અને ચુકવણીનો ઇતિહાસ, ફરિયાદ અને એની આંતરિક નોંધ, નોટિસ, અને આપ અપલોડ કરેલા દસ્તાવેજો.'],
      ['અમે તેનો ઉપયોગ કેવી રીતે કરીએ છીએ', 'અમે સોસાયટીનો ડેટા પ્રાંગણવન સેવા આપવા, જાળવવા, સુરક્ષિત રાખવા, સપોર્ટ આપવા અને સેવા સંબંધિત જરૂરી સંપર્ક માટે વાપરીએ છીએ.'],
      ['ખરેખર કોણ શું જોઈ શકે', 'આ સુરક્ષા સિસ્ટમ સ્તરે જ લાગુ છે, ફક્ત સ્ક્રીન પર છુપાવવાની વાત નથી. રહેવાસી ફક્ત પોતાના ફ્લેટનું બિલ અને ચુકવણી જુએ, પડોશીનું ક્યારેય નહીં. વ્યક્તિગત ફરિયાદ ફક્ત ફરિયાદ કરનાર અને કમિટી જુએ; સહિયારી ફરિયાદ (જેમ કે લિફ્ટ બંધ) દરેક રહેવાસી જુએ. આ સુરક્ષા ફ્લેટ, બિલ, ચુકવણી, ફરિયાદ, નોટિસ, દસ્તાવેજો, અને એડજસ્ટમેન્ટ સહિત દરેક મુખ્ય ભાગ માટે સીધી સિસ્ટમ સ્તરે લાગુ છે.'],
      ['પ્લેટફોર્મ ઓનરની એક્સેસ, સ્પષ્ટ રીતે', 'પ્રાંગણવનના ઓપરેટર પાસે હાલમાં પ્લેટફોર્મ પરની દરેક સોસાયટીના ડેટાની કાયમી રીડ-એક્સેસ (વાંચવાની એક્સેસ) છે. કોઈ સોસાયટીમાં સપોર્ટ માટે પ્રવેશે ત્યારે એ ખરેખર લોગ થાય છે (કોણ, ક્યારે, શા માટે). એ સપોર્ટ સેશન ચાલુ હોય ત્યારે ઓપરેટરનું પોતાનું એકાઉન્ટ પણ આપની સોસાયટીના ડેટામાં કંઈ લખવાની મંજૂરી નથી ધરાવતું; આ સિસ્ટમ સ્તરે જ લાગુ છે, ફક્ત સ્ક્રીન પર છુપાવવાની વાત નથી. કાયમી રીડ-એક્સેસ હજુ ખરેખર છે; અમે એને વધુ મર્યાદિત કરવાનું કામ ચાલુ રાખ્યું છે, અને એ બદલાય ત્યારે આ પેજ અપડેટ કરીશું.'],
      ['આપનો ડેટા ક્યાં રહે છે', 'લાઈવ એપ પ્રાંગણવનની ક્લાઉડ ડેટાબેઝ સેવા (Supabase અને Postgres) પર ચાલે છે. ડેમો મોડ (લોગિન વગર, ફક્ત એપ જોવા માટે) આપના પોતાના બ્રાઉઝરમાં જ રહે છે અને લાઈવ ડેટાથી અલગ રહે છે.'],
      ['કેટલો સમય રાખીએ', 'જ્યાં સુધી આપની સોસાયટી સક્રિય ગ્રાહક રહે છે, અને પછી સોસાયટીની સતત જરૂરિયાત માટે વ્યાજબી સમય સુધી રેકોર્ડ રહી શકે છે. સોસાયટી સેવા વાપરવાનું બંધ કરે પછી ઉપલબ્ધ રેકોર્ડના એક્સપોર્ટ અથવા ડેટા હટાવવાની વિનંતી કરી શકે છે. આવી વિનંતી લાગુ કરાર, કાનૂની જવાબદારીઓ અને રાખવા જરૂરી રેકોર્ડ મુજબ પ્રક્રિયા કરવામાં આવશે.'],
      ['આપનો એક્સપોર્ટ અને સુધારાનો અધિકાર', 'આપ એપમાંથી ઉપલબ્ધ બિલ, ચુકવણી અને સભ્ય યાદી એક્સપોર્ટ કરી શકો છો. રેકોર્ડમાં કંઈ ખોટું હોય તો સોસાયટી એડમિન અથવા ટ્રેઝરર સીધું સુધારી શકે છે.'],
      ['કંઈ ખોટું થાય તો', 'જો સોસાયટી ડેટા સંબંધિત અનધિકૃત એક્સેસ ઓળખાય, તો અમે તેનું મૂલ્યાંકન કરી લાગુ કાનૂની અને કરારની જવાબદારીઓ મુજબ યોગ્ય સોસાયટી સંપર્ક સાથે વાતચીત કરીશું.'],
      ['સવાલ', 'આ પેજ વિશે સવાલ, સુધારાની વિનંતી અથવા ઉપલબ્ધ એક્સપોર્ટ વિકલ્પો માટે privacy@pranganone.com પર લખો.'],
    ],
  },
}

export default function Privacy() {
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

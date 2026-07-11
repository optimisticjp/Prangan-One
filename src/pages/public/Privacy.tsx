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
      ['What we do not do with it', 'We do not sell resident data. We do not use your society\u2019s data to train any AI model. We do not share it with advertisers, since Prangan One does not carry ads at all. We do not add resident data to any marketing list without asking first.'],
      ['Who can actually see what', 'This is enforced by the database itself, not just hidden in the screen you happen to be looking at. A resident sees their own flat\u2019s bills and payments, never a neighbor\u2019s. A personal complaint is visible only to the person who filed it and your committee; a community complaint (a broken lift, say) is visible to every resident. Committee and finance roles see what their role needs to do the job. This protection covers flats, bills, payments, complaints, notices, documents, and adjustments directly at the database level.'],
      ['Platform owner access, stated plainly', 'Prangan One\u2019s own operator currently has standing read access to every society\u2019s data on the platform, the same way any small software team maintaining a live product typically does at this stage. Entering a society for support is genuinely logged, who, when, and why, not just shown on screen, and while that support session is active, even the operator\u2019s own account is refused from writing anything to your society\u2019s data, enforced by the database itself, not only hidden in the interface. Standing read access itself is still real; we are working toward narrowing that further and will update this page when that changes. Until then, treat this the way you would any vendor with administrative access to a system holding your records.'],
      ['Where your data lives', 'On Supabase (backed by Postgres, hosted in AWS Mumbai for this project). A separate demo mode (no login, for browsing the app itself) lives only in your own browser and clears when you close the tab, and never mixes with the real database.'],
      ['How long we keep it', 'For as long as your society remains an active customer, plus a reasonable period after in case you return or need historical records (receipts, past complaints) for your own society\u2019s continuity. If you want your society\u2019s data deleted after leaving, write to us and we will do it, short of records we are legally required to retain.'],
      ['Your export and correction rights', 'You can export your society\u2019s bills, payments, and member list at any time from within the app, no request needed. If something in your records is wrong, whoever holds the society_admin or treasurer role for your society can correct it directly; if you need our help doing that, write to the email below.'],
      ['If something goes wrong', 'If we ever discover unauthorized access to your society\u2019s data, we will tell your society\u2019s admin directly, as soon as we reasonably can, with what we know at that point, not after a delay.'],
      ['Questions', 'Write to privacy@pranganone.com for anything on this page, a correction request, or a full data export.'],
    ],
  },
  gu: {
    title: 'પ્રાઇવસી પોલિસી', desc: 'Prangan One કયો ડેટા રાખે છે, કેવી રીતે સુરક્ષિત છે, અને તમારો શું નિયંત્રણ છે.',
    h1: 'પ્રાઇવસી પોલિસી',
    updated: 'છેલ્લે અપડેટ: જુલાઈ 2026',
    sections: [
      ['અમે શું રાખીએ છીએ', 'તમારી સોસાયટી ચલાવવા માટે અમે રાખીએ છીએ: રહેવાસી અને કમિટીની સંપર્ક વિગત (નામ, ફોન, ઈમેલ), ફ્લેટ અને માલિકીના રેકોર્ડ, બિલ અને ચુકવણીનો ઇતિહાસ, ફરિયાદ અને એની આંતરિક નોંધ, નોટિસ, અને તમે અપલોડ કરેલા દસ્તાવેજો.'],
      ['અમે એનું શું નથી કરતા', 'અમે રહેવાસીનો ડેટા વેચતા નથી. અમે તમારી સોસાયટીના ડેટાથી કોઈ AI મોડેલ ટ્રેન નથી કરતા. અમે એ કોઈ જાહેરાત કંપની સાથે શેર નથી કરતા, કારણ કે Prangan One પર કોઈ જાહેરાત જ નથી.'],
      ['ખરેખર કોણ શું જોઈ શકે', 'આ ડેટાબેઝ લેવલે જ લાગુ છે, ફક્ત સ્ક્રીન પર છુપાવેલું નથી. રહેવાસી ફક્ત પોતાના ફ્લેટનું બિલ અને ચુકવણી જુએ, પડોશીનું ક્યારેય નહીં. વ્યક્તિગત ફરિયાદ ફક્ત ફરિયાદ કરનાર અને કમિટી જુએ; સહિયારી ફરિયાદ (જેમ કે લિફ્ટ બંધ) દરેક રહેવાસી જુએ. આ સુરક્ષા ફ્લેટ, બિલ, ચુકવણી, ફરિયાદ, નોટિસ, દસ્તાવેજો, અને એડજસ્ટમેન્ટ સહિત દરેક મુખ્ય ભાગ માટે સીધી ડેટાબેઝ લેવલે લાગુ છે.'],
      ['પ્લેટફોર્મ ઓનરની એક્સેસ, સ્પષ્ટ રીતે', 'Prangan One ના ઓપરેટર પાસે હાલમાં પ્લેટફોર્મ પરની દરેક સોસાયટીના ડેટાની સ્ટેન્ડિંગ read એક્સેસ છે. કોઈ સોસાયટીમાં સપોર્ટ માટે પ્રવેશે ત્યારે એ ખરેખર લોગ થાય છે (કોણ, ક્યારે, શા માટે), અને એ સપોર્ટ સેશન ચાલુ હોય ત્યારે ઓપરેટરનું પોતાનું એકાઉન્ટ પણ તમારી સોસાયટીના ડેટામાં કંઈ લખવાની મંજૂરી નથી ધરાવતું, આ ડેટાબેઝ લેવલે જ લાગુ છે, ફક્ત ઈન્ટરફેસમાં છુપાવેલું નથી. સ્ટેન્ડિંગ read એક્સેસ હજુ ખરેખર છે; અમે એને વધુ મર્યાદિત કરવાનું કામ ચાલુ રાખ્યું છે, અને એ બદલાય ત્યારે આ પેજ અપડેટ કરીશું.'],
      ['તમારો ડેટા ક્યાં રહે છે', 'Supabase પર (Postgres, AWS Mumbai માં હોસ્ટ થયેલ). ડેમો મોડ (કોઈ લોગિન વગર, ફક્ત એપ જોવા માટે) અલગથી તમારા બ્રાઉઝરના લોકલ સ્ટોરેજમાં જ રહે છે અને ક્યારેય ડેટાબેઝ સાથે ભળતું નથી.'],
      ['કેટલો સમય રાખીએ', 'જ્યાં સુધી તમારી સોસાયટી સક્રિય ગ્રાહક છે, વત્તા વ્યાજબી સમય પછી. જો તમે સોસાયટી છોડ્યા પછી ડેટા ડિલીટ કરાવવો હોય, અમને લખો.'],
      ['તમારો એક્સપોર્ટ અને કરેક્શન અધિકાર', 'તમે ગમે ત્યારે એપમાંથી જ તમારી સોસાયટીના બિલ, ચુકવણી, અને સભ્ય યાદી એક્સપોર્ટ કરી શકો છો. કંઈ ખોટું હોય તો સોસાયટી એડમિન કે ટ્રેઝરર સીધું સુધારી શકે છે.'],
      ['કંઈ ખોટું થાય તો', 'જો ક્યારેય તમારી સોસાયટીના ડેટાની અનધિકૃત એક્સેસ ધ્યાનમાં આવે, અમે તરત જ તમારી સોસાયટીના એડમિનને જણાવીશું.'],
      ['સવાલ', 'આ પેજ વિશે કોઈ સવાલ, કરેક્શન વિનંતી, કે પૂરો ડેટા એક્સપોર્ટ માટે privacy@pranganone.com પર લખો.'],
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

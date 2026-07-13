# Prangan One Copy Facts Matrix

| Claim | Current source or implementation evidence | Status | Where the claim appears | Safe wording |
| --- | --- | --- | --- | --- |
| Official brand is Prangan One | Brand assets and metadata use `Prangan One`. | verified | Public header, metadata, legal pages | Use `Prangan One` exactly. |
| Pricing is ₹10 per flat per month | Public pricing copy and structured data currently state ₹10; no separate pricing engine found. | needs business confirmation | Home, Pricing, Terms, SEO structured data | `હાલની જાહેર કિંમત: ફ્લેટ દીઠ મહિને ₹10, સોસાયટી સેટઅપ સમયે પુષ્ટિ સાથે.` |
| ₹499 minimum per society per month | Public pricing and Terms currently state minimum; no separate pricing engine found. | needs business confirmation | Home, Pricing, Terms | `ઓછામાં ઓછું ₹499 મહિને, અંતિમ સેટઅપ સમયે પુષ્ટિ સાથે.` |
| New societies receive a 90-day trial | `supabase/schema.sql` computes trial write access for 90 days from `trial_started_at`; public pricing/terms mention 90 days. | verified | Pricing, Terms | `90 દિવસનો ટ્રાયલ, સોસાયટી તૈયાર થાય ત્યારથી.` |
| Trial starts when the society is set up and ready | `societies.trial_started_at` defaults at creation; public copy says it starts when setup is ready. Code supports a trial start timestamp but business timing is operational. | needs business confirmation | Pricing, Terms | `ટ્રાયલ સેટઅપ પૂર્ણ થયા પછી શરૂ થાય છે.` |
| Overdue subscription becomes read-only after grace | `private.subscription_allows_writes` allows trial/active/grace writes and blocks paused/archived writes. | verified | Terms, subscription banners | `ગ્રેસ પછી નવું લખાણ અટકે છે; જૂના રેકોર્ડ જોવાની/એક્સપોર્ટ કરવાની વ્યવસ્થા રહે છે જ્યાં ઉપલબ્ધ હોય.` |
| 14-day grace period | `supabase/schema.sql` uses a 14-day grace window after trial or lapse. | verified | Terms, subscription messages | `14 દિવસનો ગ્રેસ સમય.` |
| Data deletion/retention after leaving | Privacy page describes retention after active customer plus reasonable time; no automated deletion workflow found. | needs business confirmation | Privacy, Terms | `ડેટા હટાવવા માટે અમને લખો; પ્રક્રિયા સોસાયટીની વિનંતી અને લાગુ કાયદા પ્રમાણે થશે.` |
| Supabase and Postgres are used | `src/lib/supabase.ts`, `supabase/schema.sql`, and Supabase docs in repo. | verified | Privacy, trust copy | `Supabase/Postgres આધારિત સંગ્રહ અને સેશન.` |
| Hosting region is AWS Mumbai | Privacy copy currently states AWS Mumbai; `supabase/README.md` recommends Mumbai if available but does not prove production region. | needs business confirmation | Privacy | Do not state a region unless confirmed. |
| Encryption | No repository evidence of custom encryption claim beyond provider defaults. | needs business confirmation | Avoid in live copy | `સુરક્ષા માટે Supabase અને એપ્લિકેશનના ઍક્સેસ કંટ્રોલનો ઉપયોગ થાય છે.` |
| Row Level Security is used | `supabase/schema.sql` contains RLS policies and tests. | verified | Home trust, Privacy | `Row Level Security વડે સોસાયટી-આધારિત ઍક્સેસ નિયંત્રણ લાગુ કરાયું છે.` |
| Platform-owner support access exists | `support_sessions`, owner support mode safeguards, and tests exist in schema/tests. | verified | Privacy | `પ્લેટફોર્મ સપોર્ટ ઍક્સેસ નિયંત્રિત અને લોગ થાય છે.` |
| Support-session logging | `support_sessions` table and `open_support_session` implementation. | verified | Privacy | `સપોર્ટ સેશન કોણે, ક્યારે અને શા માટે ખોલ્યું તે લોગ થાય છે.` |
| Support sessions are read-only | Schema/tests enforce owner read-only safeguards during support sessions. | verified | Privacy | `સપોર્ટ સેશન દરમિયાન લખાણ અટકાવવા ડેટાબેઝ લેવલે સુરક્ષા છે.` |
| Advertising | No advertising implementation found. | needs business confirmation | Privacy | Avoid broad promise; say only what current product does if policy confirms. |
| Sale or sharing of data | No repository business policy proving never-sell/never-share. | needs business confirmation | Privacy | Do not claim `ક્યારેય વેચતા નથી` unless policy confirms. |
| AI training | No repository policy found. | needs business confirmation | Privacy | Do not mention AI training. |
| Data exports | CSV/PDF/export utilities exist for several records; scope varies by module. | verified | Pricing, Terms, Privacy | `મુખ્ય હિસાબી અને સભ્ય રેકોર્ડ માટે ઉપલબ્ધ એક્સપોર્ટ.` |
| Payment gateway support | Schema comment says no payment gateway for society-period billing; app records payments manually. | verified | Pricing, Terms | `રહેવાસીની મેન્ટેનન્સ ચુકવણી કમિટી દ્વારા નોંધાય છે; ઓનલાઈન ગેટવે પર આધાર નથી.` |
| Automated reminders | WhatsApp share helper exists; no scheduler found. | not currently supported | Avoid claim | `WhatsApp પર રિમાઇન્ડર શેર કરવાની સુવિધા.` |
| Tenant access | Roles include `resident_tenant`. | verified | Auth/access copy | `માલિક અને ભાડુઆત બંને માટે યોગ્ય ઍક્સેસ હોઈ શકે છે.` |
| One vote per flat | Poll implementation needs separate confirmation before public promise. | needs business confirmation | Avoid broad public claim | `મતદાન સુવિધા ઉપલબ્ધ મોડ્યુલ પ્રમાણે.` |
| Receipt behavior | Receipt/PDF code exists; receipt numbers generated in payment tests. | verified | Home preview, features | `ચુકવણી નોંધાય ત્યારે રસીદ/રસીદ નંબર ઉપલબ્ધ થાય છે.` |
| Demo-data separation | Demo mode uses local demo store/seed and public demo page; schema notes demo IDs separate. | verified | Home, Demo, Privacy | `ડેમો ડેટા વાસ્તવિક સોસાયટી ડેટાથી અલગ રહે છે.` |

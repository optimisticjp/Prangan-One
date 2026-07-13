# Prangan One Copy Style Guide

## 1. Official brand usage

- Use the brand exactly as `Prangan One` in every language.
- Do not create Gujarati brand forms such as `પ્રાંગણવન`, `પ્રાંગણ વન`, or `પ્રાંગણ-વન` unless an approved brand decision adds them later.
- The public tagline may remain `The Society OS` where already used. In explanatory Gujarati copy, describe the product as `હાઉસિંગ સોસાયટી મેનેજમેન્ટ` rather than translating the tagline literally.

## 2. Gujarati tone and formality

- Address users respectfully with `આપ` when speaking directly to them.
- Use natural, urban Gujarati suitable for Surat and Gujarat housing societies.
- Prefer concise sentences for mobile screens.
- Use `કૃપા કરીને` for actionable requests, but avoid repeating it in adjacent controls or messages.
- Avoid ceremonial or overly emotional wording in routine UI.
- Do not blame the user. Explain what happened and what can be done next.

## 3. Preferred terminology

| Concept | Preferred Gujarati | Avoid |
| --- | --- | --- |
| Payment | ચુકવણી | પેમેન્ટ in explanatory copy |
| Committee member | કમિટી સભ્ય | કમિટી મેમ્બર |
| Open app | એપ ખોલો | એપ ઓપન કરો |
| Login | લોગિન | sign in transliteration variants |
| Resident | રહેવાસી | user when resident is meant |
| Flat | ફ્લેટ | unit unless legally required |
| Maintenance dues | મેન્ટેનન્સ બાકી | dues only |
| Receipt | રસીદ | receipt transliteration |
| Export | એક્સપોર્ટ | forced Gujarati neologisms |
| Demo | ડેમો | trial when demo is meant |

## 4. Terms that may remain in English or transliteration

- `Prangan One`, `The Society OS`, UPI, PDF, CSV, WhatsApp, AMC, email, Google, Supabase, Postgres, Row Level Security, URL, OTP, PWA.
- Use recognisable mixed Gujarati such as `PDF ડાઉનલોડ`, `WhatsApp પર શેર`, `CSV એક્સપોર્ટ`.
- Do not translate technical IDs, receipt numbers, society codes, email addresses, URLs, or user-entered names.

## 5. Button-writing rules

- Use short, action-first labels.
- One primary action per form state.
- Prefer: `લિંક મોકલો`, `લોગિન કરો`, `ફરી પ્રયત્ન કરો`, `ડેમો ખોલો`, `સંપર્ક કરો`.
- Avoid long labels that explain policy; place explanation in nearby body copy.
- Destructive buttons must name the consequence, for example `હા, કાઢી નાખો`.

## 6. Error-message structure

Use this structure:

1. State the problem in plain language.
2. Give one next step.
3. If needed, provide a support path.

Examples:

- Preferred: `લોગિન થઈ શક્યું નથી. કૃપા કરીને ઈમેલ અને પાસવર્ડ તપાસીને ફરી પ્રયત્ન કરો.`
- Rejected: `AuthApiError: Invalid login credentials`.
- Preferred: `લિંક માન્ય નથી અથવા સમય પૂરો થયો છે. કૃપા કરીને નવી લિંક મંગાવો.`
- Rejected: `Token expired`.

Never expose raw Supabase, Postgres, JavaScript, fetch, or network error text directly to users.

## 7. Success-message structure

- Keep success messages short, reassuring, and specific.
- Mention where the user should look or what changed.
- Avoid exaggerated thanks.

Examples:

- Preferred: `લિંક મોકલી છે. કૃપા કરીને ઈમેલ તપાસો.`
- Preferred: `પાસવર્ડ સેટ થઈ ગયો છે.`
- Rejected: `ખૂબ-ખૂબ આભાર, આપનું કાર્ય સફળતાપૂર્વક પૂર્ણ થયું છે!`

## 8. Confirmation and destructive-warning structure

Use this structure:

1. Name the action being confirmed.
2. Name the consequence.
3. Keep the action button explicit.

Examples:

- Preferred title: `રેકોર્ડ કાઢી નાખવો છે?`
- Preferred body: `આ રેકોર્ડ કાઢી નાખ્યા પછી પાછો લાવી શકાશે નહીં.`
- Preferred action: `હા, કાઢી નાખો`.

## 9. Accessibility-label rules

- `aria-label`, dialog labels, alt text, and visually hidden labels must be meaningful without surrounding visual context.
- Use Gujarati for app-only Gujarati screens and match the active language on public bilingual pages.
- Icon-only buttons must describe the action: `મેનુ ખોલો`, `પાસવર્ડ બતાવો`, `પાસવર્ડ છુપાવો`.
- Image alt text should describe purpose, not visual decoration. Decorative images should be `aria-hidden` or empty alt.

## 10. Dynamic placeholder rules

- Preserve variables and interpolation exactly unless the code is updated safely.
- Do not translate values supplied by users or systems, such as `{email}`, `{receiptNo}`, `{societyCode}`, or IDs.
- Keep examples realistic and local, but clearly fictional when used in demo/sample data.
- Do not imply an action has occurred until the code confirms it.

## 11. Legal and security claim restrictions

- Do not invent guarantees about deletion, retention, encryption, hosting region, AI training, data sale/sharing, support access, read-only behavior, or payment support.
- Claims about pricing, trial, grace periods, exports, RLS, Supabase/Postgres, demo separation, and platform-owner support must be backed by code or repository documentation and listed in `docs/COPY_FACTS.md`.
- Describe RLS as an access-control layer, not absolute protection.
- Legal pages may improve clarity but must preserve dates, contact details, qualifications, and legal meaning.

## 12. Preferred and rejected wording examples

| Situation | Preferred | Rejected |
| --- | --- | --- |
| Routine request | `કૃપા કરીને ઈમેલ નાખો.` | `અરે, પહેલા ઈમેલ તો નાખો.` |
| Positive acknowledgement | `હા, ચોક્કસ.` | `જી હા.` |
| Payment explanation | `ચુકવણી નોંધો` | `પેમેન્ટ એન્ટર કરો` |
| Login failure | `લોગિન થઈ શક્યું નથી. કૃપા કરીને વિગતો તપાસીને ફરી પ્રયત્ન કરો.` | `Invalid credentials` |
| Demo CTA | `ડેમો ખોલો` | `ડેમો ઓપન કરો` |
| Success | `વિનંતી મોકલી છે. અમે સંપર્ક કરીશું.` | `ખૂબ-ખૂબ આભાર!` |

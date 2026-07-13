# Gujarati Copy Style Guide

A practical guide for writing and reviewing user-facing Gujarati in Prangan One.
The goal is Gujarati that a chairman, secretary, treasurer, accountant, resident,
or older owner in a Surat society reads once and understands. Our Gujarati is
already strong — this guide keeps it consistent as the product grows.

> Scope: this covers **user-facing** strings (pages, forms, buttons, banners,
> errors, success messages, receipts, WhatsApp templates, legal copy, demo
> content). It does **not** apply to code identifiers, database keys, CSV column
> keys, or comments.

---

## 1. Tone

- **Warm, plain, respectful.** Write the way a helpful committee member speaks,
  not the way a government circular reads.
- **Short sentences. One idea per line.** Prefer everyday words over heavy
  Sanskritised ones (`મદદ` over `સહાયતા` when either works).
- **Never blame the user in an error.** Say what happened, then what to do next.
- Avoid Kathiyawadi-heavy phrasing and slang. Keep it neutral standard Gujarati
  that reads well across Surat and the rest of Gujarat.

## 2. Pronouns and address

- Use **`આપ`** and **`કૃપા કરીને`** in longer, formal copy: privacy, terms,
  subscription notices, onboarding, and payment requests.
- Use **`તમે` / `તમારું`** for normal in-app copy — friendly without being casual.
- In tight UI (buttons, badges, table headers, short labels) drop the honorifics
  and stay brief. **A button does not need `કૃપા કરીને`.**

## 3. Buttons

- Keep buttons to **one to three words** where possible: `સાચવો`, `રદ કરો`,
  `ચુકવણી નોંધો`, `ડેમો ખોલો`.
- Use a verb the user is doing: `બિલ બનાવો`, `નોટિસ મૂકો`.
- **If a button turns into a sentence, move the detail into helper text** below it.
  Example: the **Features** CTA (and the owner **onboarding** flow) uses the short
  **`સેટઅપ વિનંતી કરો`**, with the full invitation kept as nearby supporting text. The
  **Pricing** page keeps its full CTA `સોસાયટી સેટઅપની વિનંતી કરો` — its explanatory note
  already supplies the context, so shortening it there is neither needed nor part of
  the audit.
- Loading states mirror the action: `સાચવો` → `સેવ થાય છે…`, `મોકલો` → `મોકલાય છે…`.

## 4. Error messages

- Structure: **what happened, then the fix.** e.g. `લિંક જૂની થઈ ગઈ હોઈ શકે છે. ફરી પ્રયાસ કરો.`
- Use a **full stop** between the two parts, not a comma.
- **No exclamation marks on errors. No scary words.**
- Offer a way out when the fix isn't obvious: a retry, or `care@pranganone.com`.
- **Auth errors stay generic on purpose.** Never reveal whether an email exists,
  or which of email/password was wrong. Keep the combined form, e.g.
  `લોગિન થઈ શક્યું નથી. કૃપા કરીને ઈમેલ અને પાસવર્ડ તપાસીને ફરી પ્રયાસ કરો.`

## 5. Success messages

- Confident and short. A check mark is fine: `ચુકવણી નોંધાઈ ગઈ ✅`.
- Say what is now true: `સચવાઈ ગયું`, `તમારો મત નોંધાઈ ગયો`.
- Reserve celebration (🎉) for real milestones (clearing all dues), not routine saves.

## 6. Payment and receipt wording (handle with care)

These carry money meaning — do not soften or reword without a second check:

- A self-reported "I paid" is **not** official until the committee confirms:
  `આ સત્તાવાર ચુકવણી નથી`. Never soften this.
- A cancelled receipt is **cancelled, not deleted**, and the amount returns to the
  flat's dues. State both facts.
- Overpayment credit carries to the **next** bill: keep the direction correct.
- A failed payment does not affect the bill and creates **no** receipt.
- Receipts are computer-generated and need no signature.
- Money always uses **`₹` and Western digits**. Never change an amount, receipt
  number, flat number, or date inside copy.

## 7. Privacy and security wording (handle with care)

- Say the true thing plainly. The product's honesty about **standing read access**
  and **RLS** is a feature — keep it.
- Describe security as enforced at the **database level**, not just hidden on screen:
  `ડેટાબેઝ લેવલે જ લાગુ છે, ફક્ત સ્ક્રીન પર છુપાવેલું નથી`.
- If internal English like "cosmetic" would leak into user text, express it
  naturally (`દેખાવ પૂરતું`, or `ફક્ત UI પૂરતું`) — but **never weaken or remove the
  security explanation** (UI permissions are not the real boundary; Supabase RLS is).
- Point data requests to `privacy@pranganone.com`. Don't over-promise confidentiality.
- Keep the **14-day grace period** and limitation-of-liability wording exact.
- Keep the **"Last updated"** date in sync with the real publish date.

## 8. Numerals — one system: Western digits

- Money, dates, times, and ordinary user-facing numerals use **Western digits**:
  `10`, `12`, `15`, `₹499`, `5 જુલાઈ` — **not** `૧૦`, `૧૨`, `૧૫`.
- The formatters in `src/lib/format.ts` already do this (`inr`, `fmtDate`,
  `fmtMonth`); route new numeric display through them.
- **Do not** convert Gujarati words, IDs, receipt numbers, flat numbers, monetary
  amounts, or dates themselves — only the digit glyphs in ordinary copy.

## 9. English terms — keep vs translate

**Keep in English** (widely understood or required):
WhatsApp, UPI, PDF, Excel, CSV, Login, Email, Demo, Dashboard, Admin, Supabase,
Row Level Security (RLS), AMC, OTP, PIN, JSON, CCTV, sqft, PWA, UI.

**Translate / prefer Gujarati:**

| English | Use |
|---|---|
| Read-only | `ફક્ત જોવા માટે` (keep `(read-only)` in brackets only in the owner console) |
| view-as / impersonation | `કમિટી તરીકે જુઓ` (drop raw "impersonation" from user text) |
| legacy | `જૂની` (drop the English word "legacy") |
| memberships | `સભ્યપદ` / `સભ્યો` (drop the parenthetical `(memberships)`) |
| failed (payment) | `નિષ્ફળ` (prefer over the colloquial `ફેલ` on financial records) |

**Keep CSV import column keys in English** (`name`, `flat`, `email`, `phone`,
`role`) — the importer depends on them.

## 10. Standardised terminology (glossary)

One agreed Gujarati form per recurring term:

| Term | Gujarati | Term | Gujarati |
|---|---|---|---|
| Society | `સોસાયટી` | Chairman | `પ્રમુખ` |
| Resident | `રહેવાસી` | Secretary | `મંત્રી` |
| Owner | `માલિક` | Treasurer | `ખજાનચી` |
| Committee | `કમિટી` | Accountant | `એકાઉન્ટન્ટ` |
| Bill | `બિલ` | Payment | `ચુકવણી` |
| Receipt | `રસીદ` | Credit | `ક્રેડિટ` |
| Due / outstanding | `બાકી` / `બાકી રકમ` | Cancel (receipt) | `રદ કરો` (not `ડિલીટ`) |
| Complaint | `ફરિયાદ` | Notice | `નોટિસ` |
| View (noun) | `વ્યૂ` (long ૂ) | Setup / onboarding | `સેટઅપ` / `ઓનબોર્ડિંગ` |
| Failed (payment) | `નિષ્ફળ` | Pending confirmation | `પુષ્ટિ બાકી` |

### Canonical phrase choices

- **Try again →** `ફરી પ્રયાસ કરો` (standardise over `ફરી પ્રયત્ન કરો`).
  Note: `પ્રયત્ન` is fine where it means *attempt* as a noun/past (`લોગિન પ્રયત્નો`,
  `જોડાવાનો પ્રયત્ન કર્યો`) — only the "try again" instruction standardises to `પ્રયાસ`.
- **Please →** `કૃપા કરીને` (standardise over `કૃપા કરી`).
- **Only →** `ફક્ત` when the meaning is simply "only" (e.g. `ફક્ત જોવા માટે`).
  This is **context-aware**: keep `માત્ર` where it carries deliberate emphasis, and
  do not do an uncontrolled global replace.

## 11. Placeholders and data safety

- Preserve every runtime placeholder **exactly**: `${name}`, `${flat}`,
  `${societyName}`, `${inr(amount)}`, `${receiptNo}`, `${reason}`, JSX `{…}`.
- Never translate, rename, reformat, split, or reconstruct a placeholder.
- After interpolation, re-read the sentence — grammar must stay correct for
  singular and plural counts.
- Verify complete rendered output for text that leaves the app: WhatsApp
  templates, printable receipts/PDFs, CSV exports, resident payment-request
  messages.

## 12. A note on PDF/spreadsheet extraction

Copy pasted out of a PDF often arrives with stray spaces inside Gujarati
conjuncts (e.g. `કં ઈ` for `કંઈ`, `છુ પાવેલું` for `છુપાવેલું`). These are
extraction artefacts — **never** copy them into source. Always use correctly
joined, Unicode-normal Gujarati, and compare against the surrounding source
before committing a replacement.

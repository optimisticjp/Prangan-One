// WhatsApp share links (no number attached, opens the share picker).
// Templates only - no chatbot, no API. The Cloud API hookup comes later.
// Every template takes societyName as a real parameter - these run for
// whichever society is active, not just one hardcoded society.
import { inr, fmtMonth, fmtDate } from './format'

export const waShare = (text: string) =>
  'https://wa.me/?text=' + encodeURIComponent(text)

export const waTemplates = {
  maintenanceReminder: (societyName: string, name: string, flat: string, amount: number, month: string) =>
`નમસ્તે ${name} 🙏
${societyName}: ${fmtMonth(month)} મહિનાનું મેન્ટેનન્સ ${inr(amount)} બાકી છે (ફ્લેટ ${flat}).
અનુકૂળતાએ ભરી દેવા વિનંતી. UPI, રોકડ કે ચેકથી ખજાનચીને ચૂકવી શકાશે.
- ખજાનચી, ${societyName}`,

  paymentReceived: (societyName: string, name: string, flat: string, amount: number, receiptNo: string) =>
`ચુકવણી નોંધાઈ ગઈ ✅
${name} (ફ્લેટ ${flat})
રકમ: ${inr(amount)}
રસીદ નં: ${receiptNo}
આભાર! - ${societyName}`,

  newNotice: (societyName: string, title: string) =>
`📢 ${societyName} - નવી નોટિસ
${title}
પૂરી વિગત સોસાયટી એપમાં જુઓ.`,

  complaintUpdate: (societyName: string, title: string, status: string) =>
`ફરિયાદ અપડેટ 🔧
"${title}"
હાલની સ્થિતિ: ${status}
- કમિટી, ${societyName}`,

  meetingReminder: (societyName: string, name: string, date: string) =>
`📅 યાદ અપાવવા: ${name}
તારીખ: ${fmtDate(date)}
દરેક ફ્લેટમાંથી એક વ્યક્તિએ હાજર રહેવા વિનંતી.
- ${societyName}`,
}

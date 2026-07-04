// Shared Gujarati UI copy. Spoken, respectful Surat Gujarati - not sarkari Gujarati.
import type { ComplaintStatus, PayMode } from './types'

export const t = {
  appName: 'Prangan One',
  appSub: 'ડિજિટલ સોસાયટી',
  tagline: 'આપણી સોસાયટીનું બધું કામ, સરળ ગુજરાતી માં, એક જ જગ્યાએ.',
  home: 'હોમ', bill: 'બિલ', myBill: 'મારું બિલ', receipts: 'રસીદો', viewReceipt: 'રસીદ જુઓ',
  complaints: 'ફરિયાદ', makeComplaint: 'ફરિયાદ કરો', notices: 'નોટિસ', newNotice: 'નવી નોટિસ',
  documents: 'દસ્તાવેજો', contacts: 'જરૂરી સંપર્ક', polls: 'મતદાન', events: 'ઇવેન્ટ',
  parking: 'પાર્કિંગ', profile: 'પ્રોફાઇલ', more: 'વધુ',
  pendingAmount: 'બાકી રકમ', paid: 'ચૂકવેલ', pending: 'બાકી', overdue: 'મુદત વીતી',
  paymentDone: 'ચુકવણી નોંધાઈ ગઈ', save: 'સાચવો', cancel: 'રદ કરો', add: 'ઉમેરો',
  search: 'શોધો...', download: 'ડાઉનલોડ', print: 'પ્રિન્ટ કરો', share: 'શેર કરો',
  exportCsv: 'CSV એક્સપોર્ટ', all: 'બધા', date: 'તારીખ', amount: 'રકમ', flat: 'ફ્લેટ',
  members: 'સભ્યો', dashboard: 'ડેશબોર્ડ', billing: 'બિલિંગ', paymentsL: 'ચુકવણી',
  expenses: 'ખર્ચ', vendors: 'વેન્ડર / AMC', reports: 'રિપોર્ટ', settings: 'સેટિંગ્સ',
  adjustments: 'એડજસ્ટમેન્ટ', logout: 'રોલ બદલો',
}

export const complaintStatusLabel: Record<ComplaintStatus, string> = {
  new: 'નવી ફરિયાદ',
  assigned: 'જવાબદાર વ્યક્તિને સોંપેલ',
  inprogress: 'કામ ચાલુ છે',
  done: 'પૂર્ણ થયું',
  closed: 'બંધ કરેલ',
}
export const complaintStatusTone: Record<ComplaintStatus, 'red' | 'amber' | 'blue' | 'green' | 'gray'> = {
  new: 'red', assigned: 'blue', inprogress: 'amber', done: 'green', closed: 'gray',
}
export const payModeLabel: Record<PayMode, string> = {
  cash: 'રોકડ', upi: 'UPI', cheque: 'ચેક', bank: 'બેંક ટ્રાન્સફર',
}
export const complaintCategories = ['લિફ્ટ', 'પાણી', 'લીકેજ', 'વીજળી', 'સફાઈ', 'પાર્કિંગ', 'અન્ય']
export const expenseCategories = ['સફાઈ પગાર', 'સિક્યુરિટી પગાર', 'કોમન લાઈટ બિલ', 'પાણી ટેન્કર', 'લિફ્ટ AMC', 'CCTV AMC', 'રિપેરિંગ', 'તહેવાર ખર્ચ', 'અન્ય']
export const noticeCategories = ['મેન્ટેનન્સ', 'પાણી', 'લિફ્ટ', 'મીટિંગ', 'સફાઈ', 'પાર્કિંગ', 'તહેવાર', 'અન્ય']
export const eventTypes = ['નવરાત્રી', 'ગણેશ ચતુર્થી', 'દિવાળી મિલન', 'ઉત્તરાયણ', 'સોસાયટી મીટિંગ', 'બ્લડ ડોનેશન કેમ્પ', 'અન્ય']
export const docFolders = ['સોસાયટી રજીસ્ટ્રેશન', 'ઓડિટ રિપોર્ટ', 'મીટિંગ મિનિટ્સ', 'નિયમો', 'વેન્ડર કરાર', 'મેન્ટેનન્સ રસીદ', 'વીમો', 'ફાયર સેફ્ટી', 'લિફ્ટ દસ્તાવેજ', 'કાનૂની નોટિસ', 'ફોર્મ']
export const docPermissionLabel = {
  public: 'બધા સભ્યો માટે', committee: 'ફક્ત કમિટી', accountant: 'એકાઉન્ટન્ટ + કમિટી', admin: 'ફક્ત એડમિન',
} as const

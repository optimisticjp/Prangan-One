// Deterministic sample data generator for the demo.
// Run: node scripts/gen-data.mjs  (writes ./sample-data/*.json)
// All names, phone numbers and vehicle numbers are invented. No real personal data.
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'sample-data')
mkdirSync(OUT, { recursive: true })

const SOC = 'soc_rajhans'
const first = ['રમેશભાઈ','સુરેશભાઈ','હાર્દિકભાઈ','જીતેન્દ્રભાઈ','કિરણભાઈ','મુકેશભાઈ','અલ્પેશભાઈ','ભાવેશભાઈ','નિલેશભાઈ','સંજયભાઈ','પરેશભાઈ','દિનેશભાઈ','હિરેનભાઈ','મનીષભાઈ','રાજેશભાઈ','કમલેશભાઈ','હિતેશભાઈ','જયેશભાઈ','પ્રકાશભાઈ','અશોકભાઈ','ચેતનભાઈ','ગૌતમભાઈ','નરેશભાઈ','મહેશભાઈ']
const sur = ['સાવલિયા','કાથરિયા','ગજેરા','ડોબરિયા','કાકડિયા','વઘાસિયા','રામાણી','ભાલાળા','સોરઠિયા','પટેલ','મોણપરા','વેકરિયા','ધડુક','હિરપરા','ટાંક','બોરડ','સુતરિયા','ગોંડલિયા','લાઠિયા','કોરાટ','દેસાઈ','બાવળિયા','ચોવટિયા','સાકરિયા']
const tenants = ['વિપુલભાઈ જોષી','સંદીપભાઈ રાવલ','કેતનભાઈ મહેતા']

// 24 flats: floors 1-6, units 1-4
const flats = []
let f = 0
for (let fl = 1; fl <= 6; fl++) {
  for (let u = 1; u <= 4; u++) {
    const number = String(fl * 100 + u)
    const isTenant = [4, 11, 18].includes(f)
    flats.push({
      id: 'flat_' + number,
      societyId: SOC,
      number, floor: fl,
      ownerName: first[f] + ' ' + sur[f],
      phone: '+91 90000 000' + String(f + 10).slice(-2),
      occupancy: isTenant ? 'tenant' : 'owner',
      tenantName: isTenant ? tenants[[4,11,18].indexOf(f)] : undefined,
      sqft: u % 2 === 0 ? 1150 : 980,
      memberSince: 2018 + (f % 6)
    })
    f++
  }
}

const AMT = 1200
const months = ['2026-04', '2026-05', '2026-06', '2026-07']
// deterministic unpaid pattern
const unpaid = { '2026-04': [], '2026-05': [7], '2026-06': [15], '2026-07': [] }
const partial = { '2026-06': { 20: 600 } } // flat idx 20 paid half in June
const julyPaidIdx = [0, 1, 2, 3, 5, 8, 9, 13, 16, 21] // 10 of 24 paid so far

const bills = []
const payments = []
let seq = 0
const pad = (n) => String(n).padStart(4, '0')
const modeCycle = ['upi','upi','cash','upi','cheque','cash','upi','bank']

months.forEach((m, mi) => {
  flats.forEach((fl, i) => {
    const billId = `bill_${m}_${fl.number}`
    let paidAmount = 0
    const isCur = m === '2026-07'
    const fullyPaid = isCur ? julyPaidIdx.includes(i) : !unpaid[m].includes(i) && !(partial[m] && partial[m][i] !== undefined)
    const part = partial[m] && partial[m][i]
    if (fullyPaid) paidAmount = AMT
    else if (part !== undefined) paidAmount = part
    bills.push({ id: billId, societyId: SOC, flatId: fl.id, month: m, amount: AMT, paidAmount, dueDate: `${m}-10` })
    if (paidAmount > 0) {
      seq++
      const day = String(2 + ((i * 3) % 9)).padStart(2, '0')
      payments.push({
        id: 'pay_' + pad(seq), societyId: SOC, flatId: fl.id, billId,
        date: `${m}-${day}`, amount: paidAmount,
        mode: modeCycle[(i + mi) % modeCycle.length],
        refNo: ['upi','bank'].includes(modeCycle[(i + mi) % modeCycle.length]) ? 'UTR' + (400100 + seq) : (modeCycle[(i + mi) % modeCycle.length] === 'cheque' ? 'ચેક નં. ' + (77300 + seq) : undefined),
        receiptNo: 'RT-2026-' + pad(seq),
        status: 'success',
        note: part !== undefined ? 'આંશિક ચુકવણી, બાકી પછી' : undefined
      })
    }
  })
})
// one failed UPI attempt (no receipt)
payments.push({ id: 'pay_fail_1', societyId: SOC, flatId: 'flat_305', billId: 'bill_2026-07_305', date: '2026-07-02', amount: AMT, mode: 'upi', refNo: 'UTR499911', status: 'failed', note: 'UPI ટાઈમઆઉટ, ફરી પ્રયત્ન કરવો' })

const vendors = [
  { id:'ven_lift', societyId:SOC, name:'ઓમ લિફ્ટ કેર', service:'લિફ્ટ AMC', contactPerson:'મયુરભાઈ', phone:'+91 90000 00151', amcStart:'2026-01-01', amcEnd:'2026-12-31', notes:'ત્રિમાસિક સર્વિસ, 24x7 ઈમરજન્સી' },
  { id:'ven_plumb', societyId:SOC, name:'શ્રી ગણેશ પ્લમ્બિંગ', service:'પ્લમ્બિંગ', contactPerson:'ગણેશભાઈ', phone:'+91 90000 00152' },
  { id:'ven_elec', societyId:SOC, name:'પાવર ઇલેક્ટ્રિકલ્સ', service:'ઇલેક્ટ્રિક કામ', contactPerson:'રાજુભાઈ', phone:'+91 90000 00153' },
  { id:'ven_water', societyId:SOC, name:'જય જલારામ વોટર ટેન્કર', service:'પાણી ટેન્કર', contactPerson:'ભરતભાઈ', phone:'+91 90000 00154' },
  { id:'ven_clean', societyId:SOC, name:'સ્વચ્છ સફાઈ સર્વિસ', service:'સફાઈ', contactPerson:'મંજુબેન', phone:'+91 90000 00155', amcStart:'2026-04-01', amcEnd:'2027-03-31' },
  { id:'ven_sec', societyId:SOC, name:'રક્ષક સિક્યુરિટી એજન્સી', service:'સિક્યુરિટી', contactPerson:'વિક્રમભાઈ', phone:'+91 90000 00156', amcStart:'2025-08-01', amcEnd:'2026-07-31', notes:'રિન્યુઅલ બાકી છે' },
  { id:'ven_cctv', societyId:SOC, name:'વિઝન CCTV', service:'CCTV AMC', contactPerson:'સમીરભાઈ', phone:'+91 90000 00157', amcStart:'2025-08-16', amcEnd:'2026-08-15' },
  { id:'ven_fire', societyId:SOC, name:'અગ્નિ ફાયર સેફ્ટી', service:'ફાયર સેફ્ટી', contactPerson:'હરેશભાઈ', phone:'+91 90000 00158', amcStart:'2025-07-01', amcEnd:'2026-06-30', notes:'AMC પૂરું, નવો કરાર કરવાનો છે' }
]

const expenses = []
let ei = 0
const exp = (date, category, amount, mode, vendorId, note, billFile) => { ei++; expenses.push({ id:'exp_'+String(ei).padStart(3,'0'), societyId:SOC, date, category, amount, mode, vendorId, note, billFile }) }
for (const m of ['2026-04','2026-05','2026-06']) {
  exp(`${m}-01`, 'સફાઈ પગાર', 6000, 'cash', 'ven_clean')
  exp(`${m}-03`, 'સિક્યુરિટી પગાર', 9500, 'bank', 'ven_sec')
  exp(`${m}-07`, 'કોમન લાઈટ બિલ', 3200 + (m === '2026-05' ? 640 : m === '2026-06' ? 910 : 0), 'bank', undefined, 'DGVCL બિલ', 'dgvcl-bill.pdf')
  exp(`${m}-12`, 'પાણી ટેન્કર', 800, 'cash', 'ven_water')
  exp(`${m}-24`, 'પાણી ટેન્કર', 800, 'cash', 'ven_water')
}
exp('2026-04-05', 'લિફ્ટ AMC', 4500, 'cheque', 'ven_lift', 'ત્રિમાસિક હપ્તો', 'lift-amc-q1.pdf')
exp('2026-05-14', 'રિપેરિંગ', 850, 'cash', 'ven_plumb', 'ટેરેસ પાઈપ લીકેજ રિપેર')
exp('2026-06-09', 'રિપેરિંગ', 2400, 'upi', 'ven_elec', 'પાણીની મોટર રિપેર')
exp('2026-06-20', 'CCTV AMC', 1800, 'upi', 'ven_cctv')
exp('2026-06-27', 'અન્ય', 350, 'cash', undefined, 'સ્ટેશનરી અને ઝેરોક્ષ')
exp('2026-07-01', 'સફાઈ પગાર', 6000, 'cash', 'ven_clean')
exp('2026-07-02', 'પાણી ટેન્કર', 800, 'cash', 'ven_water')

const N = (i) => flats[i].ownerName
const complaints = [
  { id:'cmp_01', societyId:SOC, flatId:'flat_402', category:'લિફ્ટ', title:'લિફ્ટ અવાજ કરે છે', detail:'લિફ્ટ ઉપર જતી વખતે મોટો અવાજ આવે છે. બે દિવસથી આવું થાય છે.', priority:'urgent', status:'inprogress', assignedTo:'ઓમ લિફ્ટ કેર', createdAt:'2026-06-29', hasPhoto:false, internalNotes:['વેન્ડરને ફોન કર્યો, શનિવારે વિઝિટ'], timeline:[
    { date:'2026-06-29', status:'new', by:N(13) },
    { date:'2026-06-30', status:'assigned', note:'ઓમ લિફ્ટ કેરને સોંપેલ', by:'કમિટી' },
    { date:'2026-07-01', status:'inprogress', note:'ટેક્નિશિયન આવીને ચેક કરી ગયા, પાર્ટ મંગાવ્યો છે', by:'કમિટી' } ] },
  { id:'cmp_02', societyId:SOC, flatId:'flat_203', category:'પાણી', title:'સવારે પાણીનું પ્રેશર ઓછું', detail:'ત્રીજા માળે સવારે 7 થી 8 પાણી ધીમું આવે છે.', priority:'normal', status:'assigned', assignedTo:'શ્રી ગણેશ પ્લમ્બિંગ', createdAt:'2026-07-01', internalNotes:[], timeline:[
    { date:'2026-07-01', status:'new', by:N(6) },
    { date:'2026-07-02', status:'assigned', note:'પ્લમ્બરને બતાવવાનું નક્કી', by:'કમિટી' } ] },
  { id:'cmp_03', societyId:SOC, flatId:'flat_104', category:'સફાઈ', title:'પાર્કિંગમાં કચરો', detail:'B પાર્કિંગ પાસે કચરો ભેગો થાય છે, નિયમિત સફાઈ થતી નથી.', priority:'normal', status:'done', assignedTo:'સ્વચ્છ સફાઈ સર્વિસ', createdAt:'2026-06-24', internalNotes:[], timeline:[
    { date:'2026-06-24', status:'new', by:N(3) },
    { date:'2026-06-25', status:'assigned', by:'કમિટી' },
    { date:'2026-06-26', status:'done', note:'સફાઈ થઈ ગઈ, હવે રોજ સાંજે થશે', by:'કમિટી' } ] },
  { id:'cmp_04', societyId:SOC, flatId:'flat_501', category:'લીકેજ', title:'ધાબામાંથી પાણી ટપકે છે', detail:'ચોમાસામાં બેડરૂમની છતમાંથી પાણી ટપકે છે.', priority:'urgent', status:'new', createdAt:'2026-07-02', internalNotes:[], timeline:[
    { date:'2026-07-02', status:'new', by:N(16) } ] },
  { id:'cmp_05', societyId:SOC, flatId:'flat_302', category:'વીજળી', title:'દાદરાની લાઈટ બંધ', detail:'ત્રીજા માળના દાદરાની ટ્યુબલાઈટ ચાલુ થતી નથી.', priority:'normal', status:'closed', assignedTo:'પાવર ઇલેક્ટ્રિકલ્સ', createdAt:'2026-06-15', internalNotes:[], feedback:{ rating:5, comment:'બીજા જ દિવસે કામ થઈ ગયું. આભાર!' }, timeline:[
    { date:'2026-06-15', status:'new', by:N(9) },
    { date:'2026-06-15', status:'assigned', by:'કમિટી' },
    { date:'2026-06-16', status:'done', note:'નવી ટ્યુબલાઈટ નાખી', by:'કમિટી' },
    { date:'2026-06-18', status:'closed', by:'કમિટી' } ] },
  { id:'cmp_06', societyId:SOC, flatId:'flat_601', category:'પાર્કિંગ', title:'ખોટી જગ્યાએ ગાડી પાર્ક', detail:'મારા સ્લોટ P-19 માં બીજી ગાડી પાર્ક થાય છે.', priority:'normal', status:'new', createdAt:'2026-07-03', internalNotes:[], timeline:[
    { date:'2026-07-03', status:'new', by:N(20) } ] },
  { id:'cmp_07', societyId:SOC, flatId:'flat_303', category:'અન્ય', title:'ટેરેસનો દરવાજો ખુલ્લો રહે છે', detail:'રાત્રે ટેરેસનો દરવાજો ખુલ્લો રહે છે, બંધ કરવાની વ્યવસ્થા જોઈએ.', priority:'normal', status:'done', assignedTo:'કમિટી', createdAt:'2026-06-20', internalNotes:['નવું તાળું લગાવ્યું'], timeline:[
    { date:'2026-06-20', status:'new', by:N(10) },
    { date:'2026-06-22', status:'inprogress', by:'કમિટી' },
    { date:'2026-06-23', status:'done', note:'તાળું લગાવી દીધું, ચાવી વોચમેન પાસે', by:'કમિટી' } ] }
]

const notices = [
  { id:'not_01', societyId:SOC, title:'વાર્ષિક સભા: 12 જુલાઈ, રવિવાર', body:'સોસાયટીની વાર્ષિક સભા રવિવાર, 12 જુલાઈ 2026 ના રોજ સાંજે 6 વાગ્યે કોમન પ્લોટમાં રાખેલ છે. વર્ષનો હિસાબ અને નવા કામોની ચર્ચા થશે. દરેક ફ્લેટમાંથી એક વ્યક્તિએ હાજર રહેવા વિનંતી.', date:'2026-07-01', category:'મીટિંગ', pinned:true },
  { id:'not_02', societyId:SOC, title:'રવિવારે સવારે પાણી બંધ રહેશે', body:'ટાંકી સફાઈના કારણે રવિવાર, 5 જુલાઈ ના રોજ સવારે 9 થી 12 પાણી બંધ રહેશે. જરૂર પૂરતું પાણી ભરી રાખવા વિનંતી.', date:'2026-07-02', category:'પાણી', pinned:true },
  { id:'not_03', societyId:SOC, title:'જુલાઈ મેન્ટેનન્સ ભરવા વિનંતી', body:'જુલાઈ મહિનાનું મેન્ટેનન્સ ₹1,200 તા. 10 સુધીમાં ભરવા વિનંતી. UPI, રોકડ કે ચેકથી ખજાનચીને ચૂકવી શકાશે.', date:'2026-07-01', category:'મેન્ટેનન્સ', pinned:false },
  { id:'not_04', societyId:SOC, title:'લિફ્ટ સર્વિસ: શનિવારે બપોરે', body:'શનિવારે બપોરે 2 થી 4 લિફ્ટની નિયમિત સર્વિસ થશે. તે સમયે લિફ્ટ બંધ રહેશે.', date:'2026-06-30', category:'લિફ્ટ', pinned:false },
  { id:'not_05', societyId:SOC, title:'ચોમાસા પહેલા ટેરેસ સફાઈ થઈ ગઈ', body:'ટેરેસ અને પાણીના નિકાલની સફાઈ પૂરી થઈ ગઈ છે. કોઈને લીકેજ જણાય તો તરત ફરિયાદ નોંધાવશો.', date:'2026-06-21', category:'સફાઈ', pinned:false },
  { id:'not_06', societyId:SOC, title:'પાર્કિંગ: પોતાના સ્લોટમાં જ ગાડી રાખવી', body:'બધા સભ્યોને વિનંતી કે પોતાની ગાડી ફાળવેલ સ્લોટમાં જ પાર્ક કરે. મહેમાનની ગાડી ગેટ પાસેની ખાલી જગ્યામાં રાખવી.', date:'2026-06-10', category:'પાર્કિંગ', pinned:false }
]

const documents = [
  { id:'doc_01', societyId:SOC, name:'સોસાયટી રજીસ્ટ્રેશન સર્ટિફિકેટ.pdf', folder:'સોસાયટી રજીસ્ટ્રેશન', permission:'public', date:'2018-03-12', size:'1.2 MB' },
  { id:'doc_02', societyId:SOC, name:'ઓડિટ રિપોર્ટ 2024-25.pdf', folder:'ઓડિટ રિપોર્ટ', permission:'public', date:'2025-09-30', size:'2.8 MB' },
  { id:'doc_03', societyId:SOC, name:'ઓડિટ વર્કિંગ 2025-26 (ડ્રાફ્ટ).xlsx', folder:'ઓડિટ રિપોર્ટ', permission:'accountant', date:'2026-06-28', size:'340 KB' },
  { id:'doc_04', societyId:SOC, name:'વાર્ષિક સભા મિનિટ્સ 2025.pdf', folder:'મીટિંગ મિનિટ્સ', permission:'public', date:'2025-07-14', size:'860 KB' },
  { id:'doc_05', societyId:SOC, name:'કમિટી મીટિંગ મિનિટ્સ જૂન 2026.pdf', folder:'મીટિંગ મિનિટ્સ', permission:'committee', date:'2026-06-08', size:'420 KB' },
  { id:'doc_06', societyId:SOC, name:'સોસાયટીના નિયમો (2024 સુધારેલ).pdf', folder:'નિયમો', permission:'public', date:'2024-04-01', size:'640 KB' },
  { id:'doc_07', societyId:SOC, name:'લિફ્ટ AMC કરાર 2026.pdf', folder:'વેન્ડર કરાર', permission:'committee', date:'2026-01-01', size:'510 KB' },
  { id:'doc_08', societyId:SOC, name:'સિક્યુરિટી એજન્સી કરાર.pdf', folder:'વેન્ડર કરાર', permission:'committee', date:'2025-08-01', size:'480 KB' },
  { id:'doc_09', societyId:SOC, name:'બિલ્ડિંગ વીમા પોલિસી 2026.pdf', folder:'વીમો', permission:'committee', date:'2026-02-15', size:'1.9 MB' },
  { id:'doc_10', societyId:SOC, name:'ફાયર સેફ્ટી NOC.pdf', folder:'ફાયર સેફ્ટી', permission:'public', date:'2025-11-20', size:'720 KB' },
  { id:'doc_11', societyId:SOC, name:'લિફ્ટ લાયસન્સ 2026.pdf', folder:'લિફ્ટ દસ્તાવેજ', permission:'public', date:'2026-01-10', size:'380 KB' },
  { id:'doc_12', societyId:SOC, name:'ભાડૂત NOC ફોર્મ (કોરું).pdf', folder:'ફોર્મ', permission:'public', date:'2024-06-01', size:'120 KB' },
  { id:'doc_13', societyId:SOC, name:'પાણી કનેક્શન કાનૂની પત્ર.pdf', folder:'કાનૂની નોટિસ', permission:'admin', date:'2025-05-19', size:'260 KB' },
  { id:'doc_14', societyId:SOC, name:'મેન્ટેનન્સ રસીદ બુક સ્કેન (જૂની).pdf', folder:'મેન્ટેનન્સ રસીદ', permission:'accountant', date:'2025-04-02', size:'5.1 MB' }
]

const yesVoters = [0,1,2,3,5,8,9,10,13,16,19,21].map(i=>flats[i].id)
const noVoters = [6,12].map(i=>flats[i].id)
const pollVotes1 = {}; yesVoters.forEach(id=>pollVotes1[id]=0); noVoters.forEach(id=>pollVotes1[id]=1)
const pollVotes2 = {}; [0,2,4,7,9,11,14,17,20].forEach((fi,k)=>{ pollVotes2[flats[fi].id] = k % 3 })
const pollVotes3 = {}; for (let i=0;i<18;i++) pollVotes3[flats[i].id] = i % 5 === 0 ? 1 : 0
const polls = [
  { id:'poll_01', societyId:SOC, question:'સોસાયટીમાં 4 નવા CCTV કેમેરા લગાવવા? (અંદાજિત ખર્ચ ₹28,000)', type:'yesno', options:['હા, લગાવવા','ના, હમણાં નહીં'], votes:pollVotes1, status:'open', resultVisible:true, endDate:'2026-07-12' },
  { id:'poll_02', societyId:SOC, question:'નવરાત્રી ડેકોરેશન કઈ થીમમાં કરવું?', type:'multi', options:['પરંપરાગત ગરબા થીમ','ફૂલોની સજાવટ','લાઈટિંગ થીમ'], votes:pollVotes2, status:'open', resultVisible:false, endDate:'2026-08-31' },
  { id:'poll_03', societyId:SOC, question:'ટેરેસ પર નાનો ગાર્ડન બનાવવો?', type:'yesno', options:['હા','ના'], votes:pollVotes3, status:'closed', resultVisible:true, endDate:'2026-05-31' }
]

const navratriContrib = [0,1,3,5,9,13,16,21].map((fi,k)=>({ flatId:flats[fi].id, amount:500, date:'2026-06-2'+(k%8+1) }))
const uttarayanContrib = flats.slice(0,20).map((fl,k)=>({ flatId:fl.id, amount:200, date:'2026-01-0'+((k%9)+1) }))
const events = [
  { id:'evt_01', societyId:SOC, name:'નવરાત્રી મહોત્સવ 2026', type:'નવરાત્રી', date:'2026-10-11', note:'કોમન પ્લોટમાં ગરબા. ફ્લેટ દીઠ ₹500 યોગદાન.', contributions:navratriContrib, volunteers:[N(1),N(5),N(9),N(13)], expenses:[{label:'ડેકોરેશન એડવાન્સ',amount:2000}] },
  { id:'evt_02', societyId:SOC, name:'વાર્ષિક સભા', type:'સોસાયટી મીટિંગ', date:'2026-07-12', note:'સાંજે 6 વાગ્યે, કોમન પ્લોટ. વર્ષનો હિસાબ રજૂ થશે.', contributions:[], volunteers:[], expenses:[] },
  { id:'evt_03', societyId:SOC, name:'બ્લડ ડોનેશન કેમ્પ', type:'બ્લડ ડોનેશન કેમ્પ', date:'2026-06-15', note:'રેડ ક્રોસ સાથે. 22 યુનિટ બ્લડ ડોનેટ થયું.', contributions:[], volunteers:[N(0),N(2),N(7),N(11),N(15),N(19)], expenses:[{label:'નાસ્તો અને પાણી',amount:1500}] },
  { id:'evt_04', societyId:SOC, name:'ઉત્તરાયણ મિલન 2026', type:'ઉત્તરાયણ', date:'2026-01-14', note:'ટેરેસ પર ઉંધિયું-જલેબી સાથે મિલન.', contributions:uttarayanContrib, volunteers:[N(3),N(8)], expenses:[{label:'ઉંધિયું-જલેબી',amount:3200},{label:'દોરી-પતંગ બાળકો માટે',amount:600}] }
]

const vehicles = []
let vseq = 0
flats.forEach((fl, i) => {
  vseq++
  vehicles.push({ id:'veh_'+vseq, societyId:SOC, flatId:fl.id, kind:'2W', number:'GJ05'+String.fromCharCode(65+(i%20))+String.fromCharCode(66+(i%18))+' '+(1200+i*37), slot:'P-'+String(i+1).padStart(2,'0'), ownerType: fl.occupancy==='tenant'?'ભાડૂત':'માલિક' })
  if (i % 3 === 0) {
    vseq++
    // deliberate duplicate slot: flat idx 9 four-wheeler also gets P-07 (same as flat idx 6 two-wheeler)
    const slot = i === 9 ? 'P-07' : 'C-'+String(Math.floor(i/3)+1).padStart(2,'0')
    vehicles.push({ id:'veh_'+vseq, societyId:SOC, flatId:fl.id, kind:'4W', number:'GJ05'+String.fromCharCode(67+(i%17))+String.fromCharCode(65+(i%21))+' '+(4300+i*53), slot, ownerType: fl.occupancy==='tenant'?'ભાડૂત':'માલિક' })
  }
})

const contacts = [
  { id:'con_01', societyId:SOC, name:N(0), role:'પ્રમુખ (ફ્લેટ 101)', phone:'+91 90000 00010', category:'committee' },
  { id:'con_02', societyId:SOC, name:N(9), role:'મંત્રી (ફ્લેટ 302)', phone:'+91 90000 00019', category:'committee' },
  { id:'con_03', societyId:SOC, name:N(2), role:'ખજાનચી (ફ્લેટ 103)', phone:'+91 90000 00012', category:'committee' },
  { id:'con_04', societyId:SOC, name:N(14), role:'કમિટી સભ્ય (ફ્લેટ 403)', phone:'+91 90000 00024', category:'committee' },
  { id:'con_05', societyId:SOC, name:N(19), role:'કમિટી સભ્ય (ફ્લેટ 504)', phone:'+91 90000 00029', category:'committee' },
  { id:'con_06', societyId:SOC, name:'પોલીસ કંટ્રોલ રૂમ', role:'ઈમરજન્સી', phone:'100', category:'emergency' },
  { id:'con_07', societyId:SOC, name:'ફાયર બ્રિગેડ', role:'ઈમરજન્સી', phone:'101', category:'emergency' },
  { id:'con_08', societyId:SOC, name:'એમ્બ્યુલન્સ', role:'ઈમરજન્સી', phone:'108', category:'emergency' },
  { id:'con_09', societyId:SOC, name:'સ્મીમેર હોસ્પિટલ', role:'હોસ્પિટલ', phone:'0261 2900000', category:'emergency' },
  { id:'con_10', societyId:SOC, name:'ઓમ લિફ્ટ કેર (ઈમરજન્સી)', role:'લિફ્ટમાં ફસાવ તો', phone:'+91 90000 00151', category:'service' },
  { id:'con_11', societyId:SOC, name:'શ્રી ગણેશ પ્લમ્બિંગ', role:'પ્લમ્બર', phone:'+91 90000 00152', category:'service' },
  { id:'con_12', societyId:SOC, name:'પાવર ઇલેક્ટ્રિકલ્સ', role:'ઇલેક્ટ્રિશિયન', phone:'+91 90000 00153', category:'service' },
  { id:'con_13', societyId:SOC, name:'જય જલારામ વોટર ટેન્કર', role:'પાણી ટેન્કર', phone:'+91 90000 00154', category:'service' },
  { id:'con_14', societyId:SOC, name:'વોચમેન કેબિન', role:'ગેટ', phone:'+91 90000 00160', category:'service' }
]

const adjustments = [
  { id:'adj_01', societyId:SOC, date:'2026-06-12', flatId:'flat_504', amount:200, type:'credit', reason:'મે મહિનામાં ₹200 વધુ ચૂકવાયા હતા, જૂનમાં જમા' },
  { id:'adj_02', societyId:SOC, date:'2026-06-30', amount:118, type:'debit', reason:'બેંક ચાર્જ (ચેક બુક)' }
]

const societies = [
  { id:SOC, name:'રાજહંસ ટાવર', nameEn:'Rajhans Tower', address:'મોટા વરાછા, સુરત', maintenanceAmount:AMT, dueDay:10, upiId:'rajhanstower@upi (demo)', plan:'pro', flatsLimit:50, status:'active' },
  { id:'soc_shreehari', name:'શ્રી હરિ રેસિડન્સી', nameEn:'Shree Hari Residency', address:'કતારગામ, સુરત', maintenanceAmount:1000, dueDay:5, upiId:'', plan:'trial', flatsLimit:80, status:'trial' },
  { id:'soc_greenvalley', name:'ગ્રીન વેલી હાઈટ્સ', nameEn:'Green Valley Heights', address:'પાલ, સુરત', maintenanceAmount:1500, dueDay:10, upiId:'', plan:'lead', flatsLimit:120, status:'lead' }
]

const W = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2))
W('societies.json', societies)
W('flats.json', flats)
W('bills.json', bills)
W('payments.json', payments)
W('expenses.json', expenses)
W('vendors.json', vendors)
W('complaints.json', complaints)
W('notices.json', notices)
W('documents.json', documents)
W('polls.json', polls)
W('events.json', events)
W('vehicles.json', vehicles)
W('contacts.json', contacts)
W('adjustments.json', adjustments)
console.log('sample-data written:', { flats:flats.length, bills:bills.length, payments:payments.length, expenses:expenses.length, vehicles:vehicles.length })

import { useState } from 'react'
import { HandCoins, IndianRupee, ReceiptText, WalletCards } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'

export default function BusinessMyMoney(){
  const {data,activeMembership,isStaff,addStaffMoney}=useBusiness()
  const toast=useToast()
  const staffId=activeMembership?.staffId??data.staff[0]?.id??null
  const position=data.staffPositions.find(p=>p.staff_id===staffId)
  const [open,setOpen]=useState(false)
  const [kind,setKind]=useState<'advance_expense'|'pocket_expense'>('advance_expense')
  const [amount,setAmount]=useState('')
  const [categoryId,setCategoryId]=useState('')
  const [counterparty,setCounterparty]=useState('')
  const [note,setNote]=useState('')
  const [busy,setBusy]=useState(false)

  if(!isStaff)return <div className="rounded-2xl border border-cream-200 bg-white p-5 text-center text-[12px] text-navy-400">This page is for staff accounts.</div>
  if(!staffId)return <div className="rounded-2xl border border-cream-200 bg-white p-5 text-center text-[12px] text-navy-400">Staff profile not found.</div>

  const submit=async()=>{
    if(Number(amount)<=0)return
    setBusy(true)
    try{
      await addStaffMoney({staffId,kind,amount:Number(amount),categoryId:categoryId||null,counterparty,note})
      toast.success(kind==='advance_expense'?'Expense recorded from business advance':'Pocket expense submitted')
      setOpen(false);setAmount('');setCategoryId('');setCounterparty('');setNote('')
    }catch(error){toast.error(error instanceof Error?error.message:'Could not record expense')}finally{setBusy(false)}
  }

  const entries=data.staffMoney.filter(item=>item.staff_id===staffId)

  return <div className="space-y-3">
    <div><h1 className="text-[17px] font-bold text-navy-900">My money</h1><p className="text-[11.5px] text-navy-400">Business money you hold, expenses you paid, reimbursements and salary.</p></div>

    <section className="grid grid-cols-2 gap-2">
      <Card icon={WalletCards} label="Business money with me" value={position?.advance_balance??0} sub="Still belongs to the business"/>
      <Card icon={HandCoins} label="Business owes me" value={position?.outstanding_due??0} sub="Personal pocket expenses due back"/>
      <Card icon={ReceiptText} label="I paid personally" value={position?.pocket_expenses??0} sub="Business expenses from my pocket"/>
      <Card icon={IndianRupee} label="Salary paid" value={position?.salary_paid??0} sub={(position?.salary_amount??0)>0?'Set salary '+businessMoney(position?.salary_amount??0)+' / '+(position?.salary_period??'monthly'):'Salary history'}/>
    </section>

    {(position?.advance_balance??0)>0&&(position?.outstanding_due??0)>0&&<div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-[11px] text-navy-600">
      You hold {businessMoney(position?.advance_balance??0)} of business money and the business owes you {businessMoney(position?.outstanding_due??0)} personally. A partner/admin can settle these together without moving cash twice.
    </div>}

    <div className="grid grid-cols-2 gap-2">
      <Button variant="soft" onClick={()=>{setKind('advance_expense');setOpen(true)}} disabled={(position?.advance_balance??0)<=0}>Spent money I hold</Button>
      <Button variant="accent" onClick={()=>{setKind('pocket_expense');setOpen(true)}}>I paid personally</Button>
    </div>

    <section>
      <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">My money activity</h2>
      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
        {entries.length===0?<div className="px-4 py-8 text-center text-[12px] text-navy-400">No staff-money activity yet.</div>:entries.map(entry=><div key={entry.id} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2"><div className="min-w-0 flex-1"><div className="flex gap-1.5 items-center"><div className="text-[12px] font-semibold text-navy-800">{label(entry.kind)}</div>{entry.kind==='pocket_expense'&&<Badge tone="amber">REIMBURSE</Badge>}</div><div className="text-[10.5px] text-navy-400 truncate">{entry.counterparty||entry.note||new Date(entry.occurred_at).toLocaleDateString('en-IN')}</div></div><div className="num shrink-0 text-[12px] font-bold text-navy-800">{businessMoney(entry.amount)}</div></div>)}
      </div>
    </section>

    <Modal open={open} onClose={()=>{if(!busy)setOpen(false)}} title={kind==='advance_expense'?'Expense from business money':'Pocket expense'}>
      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] text-navy-600">{kind==='advance_expense'?'This reduces the business advance you are holding.':'This records money you personally paid for business. The business will see that it owes you.'}</div>
      <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus/></Field>
      <Field label="Expense category"><Select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Choose category</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Paid to / vendor"><Input value={counterparty} onChange={e=>setCounterparty(e.target.value)} placeholder="Courier, petrol pump, supplier…"/></Field>
      <Field label="Note"><Textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What was this for?"/></Field>
      <Button full loading={busy} disabled={Number(amount)<=0} onClick={submit}>Save expense</Button>
    </Modal>
  </div>
}
function Card({icon:Icon,label,value,sub}:{icon:typeof WalletCards;label:string;value:number;sub:string}){return <div className="rounded-2xl border border-cream-200 bg-white p-3"><Icon size={17} className="text-saffron-700"/><div className="mt-1 text-[10px] font-semibold text-navy-400">{label}</div><div className="num text-[18px] font-bold text-navy-900">{businessMoney(value)}</div><div className="text-[9.5px] text-navy-400 leading-tight">{sub}</div></div>}
function label(kind:string){return ({advance:'Business money received',advance_expense:'Spent business money held',pocket_expense:'Paid personally',reimbursement:'Reimbursed',salary:'Salary',advance_return:'Business money returned',settlement:'Settled from money held'} as Record<string,string>)[kind]||kind}

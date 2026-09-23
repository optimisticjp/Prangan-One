import { useState } from 'react'
import { Check, Clock3, ShieldCheck, X } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, businessTransactionLabels, expensePaidByLabel } from '../../lib/business/finance'

export default function BusinessApprovals(){
 const {data,userId,canApprove,approveTransaction,rejectTransaction}=useBusiness()
 const toast=useToast(),[busy,setBusy]=useState<string|null>(null)
 const pending=data.transactions.filter(tx=>tx.approval_status==='pending'&&!tx.reversed_at)
 const recent=data.transactions.filter(tx=>['approved','rejected'].includes(tx.approval_status)&&!tx.reversed_at).slice(0,20)
 const decide=async(id:string,decision:'approve'|'reject')=>{setBusy(id);try{if(decision==='approve')await approveTransaction(id);else await rejectTransaction(id);toast.success(decision==='approve'?'Expense review accepted':'Expense flagged')}catch(error){toast.error(error instanceof Error?error.message:'Could not update review')}finally{setBusy(null)}}
 return <div className="space-y-3">
  <div><h1 className="text-[17px] font-bold text-navy-900">Expense review</h1><p className="text-[11.5px] text-navy-400">Let another partner check larger expense records.</p></div>
  <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 flex gap-2 text-[11px] text-navy-600"><ShieldCheck size={16} className="text-navy-600 shrink-0 mt-0.5"/><div><strong>Review is only a check.</strong> PAID means money already moved. TO PAY means the bill is still unpaid or partly unpaid. Accept confirms the record; Flag marks it for attention.</div></div>
  <section><div className="flex items-center justify-between mb-2"><h2 className="text-[13px] font-bold text-navy-900">Needs review</h2><Badge tone={pending.length?'amber':'green'}>{pending.length}</Badge></div><div className="space-y-2">
   {pending.length===0?<Empty text="Nothing needs review."/>:pending.map(tx=>{const own=tx.created_by===userId,payer=expensePaidByLabel(tx,data.accounts,data.partners,data.transactionPayments),rule=tx.approval_rule==='all_partners'?'All other partners':'One other partner';return <div key={tx.id} className="rounded-xl border border-cream-200 bg-white p-3">
    <div className="flex items-start gap-2.5"><div className="h-9 w-9 rounded-lg bg-amber-50 text-pend flex items-center justify-center shrink-0"><Clock3 size={17}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 flex-wrap"><span className="text-[13px] font-bold text-navy-900">{businessTransactionLabels[tx.kind]}</span>{tx.kind==='expense'&&<PaymentBadge status={tx.payment_status}/>}</div><div className="text-[10.5px] text-navy-400 truncate">{tx.counterparty||payer||'Business expense'} · {new Date(tx.occurred_at).toLocaleDateString('en-IN')}</div><div className="text-[9.5px] text-navy-400 mt-0.5">{rule} review required</div></div><div className="num text-[16px] font-bold text-navy-900">{businessMoney(tx.amount)}</div></div>
    {own?<div className="mt-2 text-[11px] text-navy-400 rounded-lg bg-cream-100 px-2.5 py-2">You recorded this. Another eligible partner must review it.</div>:canApprove?<div className="mt-2 grid grid-cols-2 gap-2"><Button variant="soft" className="!min-h-[38px] !text-[11.5px]" loading={busy===tx.id} onClick={()=>decide(tx.id,'approve')}><Check size={14}/> Accept record</Button><Button variant="danger" className="!min-h-[38px] !text-[11.5px]" disabled={busy===tx.id} onClick={()=>decide(tx.id,'reject')}><X size={14}/> Flag</Button></div>:null}
   </div>})}
  </div></section>
  {recent.length>0&&<section><h2 className="text-[13px] font-bold text-navy-900 mb-2">Recent reviews</h2><div className="rounded-xl border border-cream-200 bg-white overflow-hidden">{recent.map(tx=><div key={tx.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-cream-100 last:border-0"><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-navy-800 truncate">{businessTransactionLabels[tx.kind]}</div><div className="text-[10px] text-navy-400">{new Date(tx.occurred_at).toLocaleDateString('en-IN')}</div></div>{tx.kind==='expense'&&<PaymentBadge status={tx.payment_status}/>}<Badge tone={tx.approval_status==='approved'?'green':'red'}>{tx.approval_status==='approved'?'ACCEPTED':'FLAGGED'}</Badge><div className="num text-[12.5px] font-bold">{businessMoney(tx.amount)}</div></div>)}</div></section>}
 </div>
}
function PaymentBadge({status}:{status:'unpaid'|'partial'|'paid'}){if(status==='paid')return <Badge tone="green">PAID</Badge>;if(status==='partial')return <Badge tone="amber">PARTIAL</Badge>;return <Badge tone="amber">TO PAY</Badge>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-cream-200 bg-white px-4 py-7 text-center text-[12.5px] text-navy-400">{text}</div>}

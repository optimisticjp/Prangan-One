import { useState } from 'react'
import { ArrowRightLeft, HandCoins, IndianRupee, Pencil, Plus, Trash2, UserRound, WalletCards } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { accountAvailable, businessMoney } from '../../lib/business/finance'
import type { BusinessStaff, BusinessStaffSalaryPeriod } from '../../lib/business/types'

type Form={name:string;email:string;phone:string;title:string;salary:string;salaryPeriod:BusinessStaffSalaryPeriod;active:boolean}
const empty:Form={name:'',email:'',phone:'',title:'',salary:'0',salaryPeriod:'monthly',active:true}

export default function BusinessStaffPage(){
 const {data,canManageTeam,addStaff,editStaff,deleteStaff,addStaffMoney,settleStaffMoney}=useBusiness()
 const toast=useToast()
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<BusinessStaff|null>(null),[deleting,setDeleting]=useState<BusinessStaff|null>(null),[form,setForm]=useState<Form>(empty)
 const [moneyStaff,setMoneyStaff]=useState<BusinessStaff|null>(null),[moneyKind,setMoneyKind]=useState<'advance'|'reimbursement'|'salary'|'advance_return'>('advance'),[moneyAmount,setMoneyAmount]=useState(''),[accountId,setAccountId]=useState(''),[moneyNote,setMoneyNote]=useState('')
 const [settling,setSettling]=useState<BusinessStaff|null>(null),[offsetAmount,setOffsetAmount]=useState(''),[returnAmount,setReturnAmount]=useState(''),[returnAccountId,setReturnAccountId]=useState(''),[settleNote,setSettleNote]=useState('')
 const [busy,setBusy]=useState(false)
 const activeAccounts=data.accounts.filter(a=>a.active)
 const selectedAvailable=accountAvailable(accountId,data.accountBalances)
 const staffMoneyOut=moneyKind!=='advance_return'
 const moneyTooHigh=staffMoneyOut&&!!accountId&&Number(moneyAmount)>selectedAvailable

 const openAdd=()=>{setEditing(null);setForm(empty);setOpen(true)}
 const openEdit=(staff:BusinessStaff)=>{setEditing(staff);setForm({name:staff.name,email:staff.email??'',phone:staff.phone??'',title:staff.title??'',salary:String(staff.salary_amount),salaryPeriod:staff.salary_period,active:staff.active});setOpen(true)}
 const save=async()=>{if(!form.name.trim())return;setBusy(true);try{const payload={name:form.name,email:form.email,phone:form.phone,title:form.title,salary:Number(form.salary)||0,salaryPeriod:form.salaryPeriod,active:form.active};if(editing)await editStaff(editing.id,payload);else await addStaff(payload);toast.success(editing?'Staff updated':'Staff added');setOpen(false);setEditing(null)}catch(error){toast.error(error instanceof Error?error.message:'Could not save staff')}finally{setBusy(false)}}
 const remove=async()=>{if(!deleting)return;setBusy(true);try{await deleteStaff(deleting.id);toast.success('Staff deleted');setDeleting(null)}catch(error){toast.error(error instanceof Error?error.message:'Could not delete staff')}finally{setBusy(false)}}

 const recordMoney=async()=>{if(!moneyStaff||Number(moneyAmount)<=0||!accountId||moneyTooHigh)return;setBusy(true);try{await addStaffMoney({staffId:moneyStaff.id,kind:moneyKind,amount:Number(moneyAmount),accountId,note:moneyNote});toast.success({advance:'Business money handed to staff',reimbursement:'Pocket expense reimbursed',salary:'Salary payment recorded',advance_return:'Unused business money returned'}[moneyKind]);setMoneyStaff(null);setMoneyAmount('');setMoneyNote('')}catch(error){toast.error(error instanceof Error?error.message:'Could not record staff money')}finally{setBusy(false)}}
 const openSettlement=(staff:BusinessStaff)=>{const p=data.staffPositions.find(x=>x.staff_id===staff.id),held=Number(p?.advance_balance??0),due=Number(p?.outstanding_due??0),offset=Math.min(held,due);setSettling(staff);setOffsetAmount(String(offset));setReturnAmount(String(Math.max(0,held-offset)));setReturnAccountId(activeAccounts[0]?.id??'');setSettleNote('')}
 const settle=async()=>{if(!settling)return;const offset=Math.max(0,Number(offsetAmount)||0),returned=Math.max(0,Number(returnAmount)||0);if(offset+returned<=0||(returned>0&&!returnAccountId))return;setBusy(true);try{await settleStaffMoney({staffId:settling.id,offsetAmount:offset,returnAccountId:returned>0?returnAccountId:null,returnAmount:returned,note:settleNote});toast.success('Staff money settled');setSettling(null)}catch(error){toast.error(error instanceof Error?error.message:'Could not settle staff money')}finally{setBusy(false)}}

 if(!canManageTeam)return <div className="rounded-xl border border-cream-200 bg-white p-5 text-center text-[12px] text-navy-400">Staff management is for partners and business admins.</div>

 return <div className="space-y-3">
  <div className="flex items-start justify-between gap-2"><div><h1 className="text-[17px] font-bold text-navy-900">Staff money</h1><p className="text-[11.5px] text-navy-400">See what business money each staff member is holding and what the business must pay them back personally.</p></div><button onClick={openAdd} className="h-9 px-3 shrink-0 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14}/> Staff</button></div>
  <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] leading-relaxed text-navy-600"><strong>Easy rule:</strong> “Money with staff” still belongs to the business. “Business owes staff” means the staff member used personal money and should be paid back.</div>
  <div className="space-y-2">{data.staff.map(staff=>{const p=data.staffPositions.find(x=>x.staff_id===staff.id),held=Number(p?.advance_balance??0),due=Number(p?.outstanding_due??0);return <div key={staff.id} className="rounded-xl border border-cream-200 bg-white p-3">
   <div className="flex items-center gap-2.5"><div className="h-9 w-9 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center shrink-0"><UserRound size={17}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><div className="font-bold text-[13px] text-navy-900 truncate">{staff.name}</div><Badge tone={staff.active?'green':'gray'}>{staff.active?'ACTIVE':'OFF'}</Badge></div><div className="text-[10.5px] text-navy-400 truncate">{staff.title||'Staff'} · {staff.email||'No login email'}</div><div className="text-[10px] text-navy-400">Salary {businessMoney(staff.salary_amount)} / {staff.salary_period}</div></div></div>
   <div className="grid grid-cols-2 gap-2 mt-2.5"><Position icon={WalletCards} label={'Business money with '+staff.name} value={held} sub="Still belongs to business" tone="navy"/><Position icon={HandCoins} label={'Business owes '+staff.name} value={due} sub={due>0?'Pay back personal spending':'Nothing to pay back'} tone={due>0?'saffron':'green'}/></div>
   <div className="grid grid-cols-3 gap-1.5 mt-2"><Mini label="Spent business money" value={p?.advance_spent??0}/><Mini label="Used own money" value={p?.pocket_expenses??0}/><Mini label="Salary paid" value={p?.salary_paid??0}/></div>
   <div className={'grid gap-1.5 mt-2.5 '+(held>0?'grid-cols-4':'grid-cols-3')}><Button variant="soft" className="!min-h-[38px] !px-1 !text-[10.5px]" onClick={()=>{setMoneyStaff(staff);setMoneyKind('advance');setAccountId(activeAccounts[0]?.id??'')}}><HandCoins size={13}/> Money</Button>{held>0&&<Button variant="accent" className="!min-h-[38px] !px-1 !text-[10.5px]" onClick={()=>openSettlement(staff)}><ArrowRightLeft size={13}/> Settle</Button>}<Button variant="soft" className="!min-h-[38px] !px-1 !text-[10.5px]" onClick={()=>openEdit(staff)}><Pencil size={13}/> Edit</Button><Button variant="danger" className="!min-h-[38px] !px-1 !text-[10.5px]" onClick={()=>setDeleting(staff)}><Trash2 size={13}/> Delete</Button></div>
  </div>})}</div>

  <Modal open={open} onClose={()=>{if(!busy)setOpen(false)}} title={editing?'Edit staff':'Add staff'}>
   <Field label="Name"><Input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} autoFocus/></Field><Field label="Login email" hint="Staff uses Business Login with this email."><Input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></Field>
   <div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></Field><Field label="Job / title"><Input value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></Field></div>
   <div className="grid grid-cols-2 gap-2"><Field label="Salary"><Input inputMode="decimal" value={form.salary} onChange={e=>setForm(v=>({...v,salary:e.target.value}))}/></Field><Field label="Period"><Select value={form.salaryPeriod} onChange={e=>setForm(v=>({...v,salaryPeriod:e.target.value as BusinessStaffSalaryPeriod}))}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></Select></Field></div>
   {editing&&<Field label="Access"><Select value={form.active?'active':'disabled'} onChange={e=>setForm(v=>({...v,active:e.target.value==='active'}))}><option value="active">Active</option><option value="disabled">Disabled</option></Select></Field>}
   <Button full loading={busy} disabled={!form.name.trim()} onClick={save}>{editing?'Save staff':'Add staff'}</Button>
  </Modal>

  <Modal open={!!moneyStaff} onClose={()=>{if(!busy)setMoneyStaff(null)}} title={moneyStaff?'Money · '+moneyStaff.name:'Staff money'}>
   <Field label="What happened?"><Select value={moneyKind} onChange={e=>setMoneyKind(e.target.value as typeof moneyKind)}><option value="advance">Give business money to staff</option><option value="reimbursement">Pay staff back for personal spending</option><option value="salary">Pay salary</option><option value="advance_return">Staff returns unused business money</option></Select></Field>
   <Field label="Amount"><Input inputMode="decimal" value={moneyAmount} onChange={e=>setMoneyAmount(e.target.value)}/></Field>
   <Field label={moneyKind==='advance_return'?'Money comes back into':'Use money from'} hint={staffMoneyOut&&accountId?'Available here: '+businessMoney(selectedAvailable):undefined}><Select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Choose cash / bank / UPI</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name} · {businessMoney(data.accountBalances.find(b=>b.account_id===a.id)?.balance??0)}</option>)}</Select></Field>
   {moneyTooHigh&&<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-navy-600"><strong>Not enough recorded money here.</strong> Available {businessMoney(selectedAvailable)}. Record where the money came from or choose another money place.</div>}
   <Field label="Note"><Textarea value={moneyNote} onChange={e=>setMoneyNote(e.target.value)} placeholder="What is this money for?"/></Field><Button full loading={busy} disabled={Number(moneyAmount)<=0||!accountId||moneyTooHigh} onClick={recordMoney}><IndianRupee size={14}/> Save</Button>
  </Modal>

  <Modal open={!!settling} onClose={()=>{if(!busy)setSettling(null)}} title={settling?'Settle money with '+settling.name:'Settle staff money'} wide>
   {settling&&(()=>{const p=data.staffPositions.find(x=>x.staff_id===settling.id),held=Number(p?.advance_balance??0),due=Number(p?.outstanding_due??0);return <>
    <div className="grid grid-cols-2 gap-2"><Position icon={WalletCards} label="Business money held" value={held} sub="Still belongs to business" tone="navy"/><Position icon={HandCoins} label="Business owes staff" value={due} sub="Pocket expenses due back" tone={due>0?'saffron':'green'}/></div>
    {held>0&&due>0&&<div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-[11px] text-navy-600">Prangan can let staff keep part of the business money they already hold as reimbursement. This reduces both balances without moving cash twice.</div>}
    <div className="grid grid-cols-2 gap-2"><Field label="Keep as reimbursement"><Input inputMode="decimal" value={offsetAmount} onChange={e=>setOffsetAmount(e.target.value)} disabled={due<=0}/></Field><Field label="Return unused money"><Input inputMode="decimal" value={returnAmount} onChange={e=>setReturnAmount(e.target.value)}/></Field></div>
    {Number(returnAmount)>0&&<Field label="Return into"><Select value={returnAccountId} onChange={e=>setReturnAccountId(e.target.value)}><option value="">Choose location</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>}
    <Field label="Settlement note"><Textarea value={settleNote} onChange={e=>setSettleNote(e.target.value)}/></Field>
    <Button full loading={busy} disabled={(Number(offsetAmount)||0)+(Number(returnAmount)||0)<=0||(Number(returnAmount)>0&&!returnAccountId)} onClick={settle}><ArrowRightLeft size={14}/> Complete settlement</Button>
   </>})()}
  </Modal>
  <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete staff" body="This permanently deletes this staff profile and its staff-money history. Type DELETE to continue." busy={busy} onClose={()=>setDeleting(null)} onConfirm={remove}/>
 </div>
}
function Mini({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-cream-100 px-2 py-2 min-w-0"><div className="text-[9.5px] text-navy-400 truncate">{label}</div><div className="num text-[12px] font-bold text-navy-800 truncate">{businessMoney(value)}</div></div>}
function Position({icon:Icon,label,value,sub,tone}:{icon:typeof WalletCards;label:string;value:number;sub:string;tone:'navy'|'saffron'|'green'}){const shell=tone==='saffron'?'bg-saffron-50 border-saffron-200':tone==='green'?'bg-green-50 border-green-100':'bg-navy-50 border-navy-100';return <div className={'rounded-xl border p-2.5 min-w-0 '+shell}><div className="flex items-center gap-1.5 text-[9.5px] font-bold text-navy-500"><Icon size={13}/><span className="truncate">{label}</span></div><div className="num text-[15px] font-bold text-navy-900 mt-0.5">{businessMoney(value)}</div><div className="text-[9.5px] text-navy-400">{sub}</div></div>}

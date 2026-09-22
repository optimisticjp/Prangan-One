import { useState } from 'react'
import { Banknote, HandCoins, IndianRupee, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import type { BusinessStaff, BusinessStaffSalaryPeriod } from '../../lib/business/types'

type Form={name:string;email:string;phone:string;title:string;salary:string;salaryPeriod:BusinessStaffSalaryPeriod;active:boolean}
const empty:Form={name:'',email:'',phone:'',title:'',salary:'0',salaryPeriod:'monthly',active:true}

export default function BusinessStaffPage(){
  const {data,canManageTeam,addStaff,editStaff,deleteStaff,addStaffMoney}=useBusiness()
  const toast=useToast()
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState<BusinessStaff|null>(null)
  const [deleting,setDeleting]=useState<BusinessStaff|null>(null)
  const [form,setForm]=useState<Form>(empty)
  const [moneyStaff,setMoneyStaff]=useState<BusinessStaff|null>(null)
  const [moneyKind,setMoneyKind]=useState<'advance'|'reimbursement'|'salary'|'advance_return'>('advance')
  const [moneyAmount,setMoneyAmount]=useState('')
  const [accountId,setAccountId]=useState('')
  const [moneyNote,setMoneyNote]=useState('')
  const [busy,setBusy]=useState(false)
  const activeAccounts=data.accounts.filter(a=>a.active)

  const openAdd=()=>{setEditing(null);setForm(empty);setOpen(true)}
  const openEdit=(s:BusinessStaff)=>{setEditing(s);setForm({name:s.name,email:s.email??'',phone:s.phone??'',title:s.title??'',salary:String(s.salary_amount),salaryPeriod:s.salary_period,active:s.active});setOpen(true)}
  const save=async()=>{if(!form.name.trim())return;setBusy(true);try{const payload={name:form.name,email:form.email,phone:form.phone,title:form.title,salary:Number(form.salary)||0,salaryPeriod:form.salaryPeriod,active:form.active};if(editing)await editStaff(editing.id,payload);else await addStaff(payload);toast.success(editing?'Staff updated':'Staff added');setOpen(false);setEditing(null)}catch(error){toast.error(error instanceof Error?error.message:'Could not save staff')}finally{setBusy(false)}}
  const remove=async()=>{if(!deleting)return;setBusy(true);try{await deleteStaff(deleting.id);toast.success('Staff deleted');setDeleting(null)}catch(error){toast.error(error instanceof Error?error.message:'Could not delete staff')}finally{setBusy(false)}}
  const recordMoney=async()=>{if(!moneyStaff||Number(moneyAmount)<=0||!accountId)return;setBusy(true);try{await addStaffMoney({staffId:moneyStaff.id,kind:moneyKind,amount:Number(moneyAmount),accountId,note:moneyNote});toast.success('Staff money recorded');setMoneyStaff(null);setMoneyAmount('');setMoneyNote('')}catch(error){toast.error(error instanceof Error?error.message:'Could not record staff money')}finally{setBusy(false)}}

  if(!canManageTeam)return <div className="rounded-2xl border border-cream-200 bg-white p-5 text-center text-[12px] text-navy-400">Staff management is for partners and business admins.</div>

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-2"><div><h1 className="text-[17px] font-bold text-navy-900">Staff</h1><p className="text-[11.5px] text-navy-400">Login access, salary, business advances and reimbursements.</p></div><button onClick={openAdd} className="h-9 px-3 shrink-0 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14}/> Staff</button></div>
    <div className="space-y-2">{data.staff.map(s=>{
      const pos=data.staffPositions.find(p=>p.staff_id===s.id)
      return <div key={s.id} className="rounded-2xl border border-cream-200 bg-white p-3">
        <div className="flex items-center gap-2.5"><div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center shrink-0"><UserRound size={18}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><div className="font-bold text-[13px] text-navy-900 truncate">{s.name}</div><Badge tone={s.active?'green':'gray'}>{s.active?'ACTIVE':'OFF'}</Badge></div><div className="text-[10.5px] text-navy-400 truncate">{s.title||'Staff'} · {s.email||'No login email'}</div><div className="text-[10.5px] text-navy-400">Salary {businessMoney(s.salary_amount)} / {s.salary_period}</div></div></div>
        <div className="grid grid-cols-3 gap-1.5 mt-2.5"><Mini label="Advance left" value={pos?.advance_balance??0}/><Mini label="Business owes" value={pos?.outstanding_due??0}/><Mini label="Salary paid" value={pos?.salary_paid??0}/></div>
        <div className="grid grid-cols-3 gap-1.5 mt-2.5"><Button variant="soft" className="!min-h-[38px] !px-2 !text-[11px]" onClick={()=>{setMoneyStaff(s);setMoneyKind('advance');setAccountId(activeAccounts[0]?.id??'')}}><HandCoins size={13}/> Money</Button><Button variant="soft" className="!min-h-[38px] !px-2 !text-[11px]" onClick={()=>openEdit(s)}><Pencil size={13}/> Edit</Button><Button variant="danger" className="!min-h-[38px] !px-2 !text-[11px]" onClick={()=>setDeleting(s)}><Trash2 size={13}/> Delete</Button></div>
      </div>
    })}</div>

    <Modal open={open} onClose={()=>{if(!busy)setOpen(false)}} title={editing?'Edit staff':'Add staff'}>
      <Field label="Name"><Input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} autoFocus/></Field>
      <Field label="Login email" hint="Staff uses the Business Login with this email."><Input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></Field><Field label="Job / title"><Input value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} placeholder="Delivery, warehouse…"/></Field></div>
      <div className="grid grid-cols-2 gap-2"><Field label="Salary"><Input inputMode="decimal" value={form.salary} onChange={e=>setForm(v=>({...v,salary:e.target.value}))}/></Field><Field label="Period"><Select value={form.salaryPeriod} onChange={e=>setForm(v=>({...v,salaryPeriod:e.target.value as BusinessStaffSalaryPeriod}))}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></Select></Field></div>
      {editing&&<Field label="Access"><Select value={form.active?'active':'disabled'} onChange={e=>setForm(v=>({...v,active:e.target.value==='active'}))}><option value="active">Active</option><option value="disabled">Disabled</option></Select></Field>}
      <Button full loading={busy} disabled={!form.name.trim()} onClick={save}>{editing?'Save staff':'Add staff'}</Button>
    </Modal>

    <Modal open={!!moneyStaff} onClose={()=>{if(!busy)setMoneyStaff(null)}} title={moneyStaff?'Money · '+moneyStaff.name:'Staff money'}>
      <Field label="What is this?"><Select value={moneyKind} onChange={e=>setMoneyKind(e.target.value as typeof moneyKind)}><option value="advance">Give business money to spend</option><option value="reimbursement">Reimburse pocket expense</option><option value="salary">Pay salary</option><option value="advance_return">Staff returns unused advance</option></Select></Field>
      <Field label="Amount"><Input inputMode="decimal" value={moneyAmount} onChange={e=>setMoneyAmount(e.target.value)}/></Field>
      <Field label={moneyKind==='advance_return'?'Receive into account':'Business account'}><Select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Choose account</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      <Field label="Note"><Textarea value={moneyNote} onChange={e=>setMoneyNote(e.target.value)} placeholder="Purpose, salary month, settlement note…"/></Field>
      <Button full loading={busy} disabled={Number(moneyAmount)<=0||!accountId} onClick={recordMoney}><IndianRupee size={14}/> Record</Button>
    </Modal>

    <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete staff" body="This permanently deletes this staff profile and its staff-money history. Type DELETE to continue." busy={busy} onClose={()=>setDeleting(null)} onConfirm={remove}/>
  </div>
}
function Mini({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-cream-100 px-2 py-2 min-w-0"><div className="text-[9.5px] text-navy-400 truncate">{label}</div><div className="num text-[12px] font-bold text-navy-800 truncate">{businessMoney(value)}</div></div>}

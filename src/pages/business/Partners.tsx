import { useMemo, useState } from 'react'
import { ArrowRightLeft, Banknote, HandCoins, Pencil, Plus, Trash2, UserRound, WalletCards } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import type { BusinessPartner, BusinessRole } from '../../lib/business/types'

type PartnerForm = { name: string; email: string; phone: string; ownership: string; role: BusinessRole; status: 'active' | 'disabled' }
const emptyForm: PartnerForm = { name: '', email: '', phone: '', ownership: '', role: 'partner', status: 'active' }

export default function BusinessPartners() {
  const { data, canAdmin, canWrite, addPartner, editPartner, deletePartner, postTransaction, settlePartnerMoney } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BusinessPartner | null>(null)
  const [deleting, setDeleting] = useState<BusinessPartner | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [form, setForm] = useState<PartnerForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [paying, setPaying] = useState<{partnerId:string;name:string;due:number}|null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payAccountId, setPayAccountId] = useState('')
  const [settling, setSettling] = useState<{partnerId:string;name:string;due:number}|null>(null)
  const [settleHeldAccountId, setSettleHeldAccountId] = useState('')
  const [settleReimburse, setSettleReimburse] = useState('')
  const [settleReturn, setSettleReturn] = useState('')
  const [settleDestinationId, setSettleDestinationId] = useState('')
  const [settleNote, setSettleNote] = useState('')

  const activeAccounts = data.accounts.filter(account => account.active)
  const balanceByAccount = useMemo(() => new Map(data.accountBalances.map(balance => [balance.account_id, Number(balance.balance)])), [data.accountBalances])
  const heldAccountsFor = (partnerId:string) => data.accounts.filter(a=>a.active&&a.custodian_partner_id===partnerId).map(account=>({account,balance:balanceByAccount.get(account.id)??0}))

  const openAdd=()=>{setEditing(null);setForm(emptyForm);setOpen(true)}
  const openEdit=(partner:BusinessPartner)=>{
    const membership=data.members.find(member=>member.partner_id===partner.id)
    setEditing(partner)
    setForm({name:partner.name,email:partner.email??'',phone:partner.phone??'',ownership:partner.ownership_percent==null?'':String(partner.ownership_percent),role:membership?.role??'partner',status:membership?.status==='disabled'?'disabled':'active'})
    setOpen(true)
  }

  const submitAdd=async()=>{
    if(!form.name.trim())return
    setSaving(true)
    try{
      await addPartner({name:form.name,email:form.email,phone:form.phone,ownership:form.ownership?Number(form.ownership):null})
      toast.success('Partner added');setOpen(false);setForm(emptyForm)
    }catch(error){toast.error(error instanceof Error?error.message:'Could not add partner')}finally{setSaving(false)}
  }
  const confirmEditNow=async()=>{
    if(!editing||!form.name.trim())return
    setSaving(true)
    try{
      await editPartner(editing.id,{name:form.name,email:form.email,phone:form.phone,ownership:form.ownership?Number(form.ownership):null,role:form.role,status:form.status})
      toast.success('Partner updated');setConfirmEdit(false);setOpen(false);setEditing(null)
    }catch(error){toast.error(error instanceof Error?error.message:'Could not update partner')}finally{setSaving(false)}
  }
  const deleteNow=async()=>{
    if(!deleting)return
    setSaving(true)
    try{await deletePartner(deleting.id);toast.success('Partner and related records deleted');setDeleting(null)}
    catch(error){toast.error(error instanceof Error?error.message:'Could not delete partner')}finally{setSaving(false)}
  }

  const openPayDue=(partnerId:string,name:string,due:number)=>{
    setPaying({partnerId,name,due});setPayAmount(String(due));setPayAccountId(activeAccounts.find(a=>!a.custodian_partner_id)?.id??activeAccounts[0]?.id??'')
  }
  const payDue=async()=>{
    if(!paying||Number(payAmount)<=0||!payAccountId)return
    setSaving(true)
    try{
      await postTransaction({kind:'reimbursement',amount:Math.min(Number(payAmount),paying.due),accountId:payAccountId,partnerId:paying.partnerId,note:'Partner reimbursement'})
      toast.success('Partner reimbursement recorded');setPaying(null)
    }catch(error){toast.error(error instanceof Error?error.message:'Could not reimburse partner')}finally{setSaving(false)}
  }

  const openHeldSettlement=(partnerId:string,name:string,due:number)=>{
    const first=heldAccountsFor(partnerId).find(item=>item.balance>0);if(!first)return
    const reimburse=Math.min(due,first.balance)
    setSettling({partnerId,name,due});setSettleHeldAccountId(first.account.id);setSettleReimburse(String(reimburse));setSettleReturn(String(Math.max(0,first.balance-reimburse)))
    setSettleDestinationId(activeAccounts.find(a=>a.id!==first.account.id&&a.custodian_partner_id!==partnerId)?.id??'');setSettleNote('')
  }
  const onHeldAccountChange=(accountId:string)=>{
    if(!settling)return
    const balance=balanceByAccount.get(accountId)??0;const reimburse=Math.min(settling.due,balance)
    setSettleHeldAccountId(accountId);setSettleReimburse(String(reimburse));setSettleReturn(String(Math.max(0,balance-reimburse)))
    setSettleDestinationId(activeAccounts.find(a=>a.id!==accountId&&a.custodian_partner_id!==settling.partnerId)?.id??'')
  }
  const settleHeld=async()=>{
    if(!settling||!settleHeldAccountId)return
    const reimburseAmount=Math.max(0,Number(settleReimburse)||0),returnAmount=Math.max(0,Number(settleReturn)||0)
    if(reimburseAmount+returnAmount<=0||(returnAmount>0&&!settleDestinationId))return
    setSaving(true)
    try{
      await settlePartnerMoney({partnerId:settling.partnerId,heldAccountId:settleHeldAccountId,destinationAccountId:returnAmount>0?settleDestinationId:null,reimburseAmount,returnAmount,note:settleNote})
      toast.success('Partner money settled');setSettling(null)
    }catch(error){toast.error(error instanceof Error?error.message:'Could not settle partner money')}finally{setSaving(false)}
  }

  return <div className="space-y-3 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0"><h1 className="text-[17px] font-bold text-navy-900">Partners</h1><p className="text-[11.5px] text-navy-400">Separate business money held by a partner from personal money owed to them.</p></div>
      {canAdmin&&<button onClick={openAdd} className="h-9 shrink-0 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14}/> Partner</button>}
    </div>
    <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] text-navy-600"><strong>Business money with Raj</strong> still belongs to the business. <strong>Business owes Raj</strong> means Raj used personal money or lent money to the business.</div>

    <div className="space-y-2">{data.partnerPositions.map(position=>{
      const partner=data.partners.find(item=>item.id===position.partner_id);if(!partner||!partner.active)return null
      const membership=data.members.find(member=>member.partner_id===partner.id),due=Number(position.outstanding_due),held=heldAccountsFor(position.partner_id),heldTotal=held.reduce((sum,item)=>sum+item.balance,0)
      return <div key={position.partner_id} className="rounded-xl border border-cream-200 bg-white p-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0"><div className="h-9 w-9 shrink-0 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center"><UserRound size={17}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 min-w-0"><div className="text-[13px] font-bold text-navy-900 truncate">{position.name}</div>{membership&&<Badge tone={membership.status==='active'?'green':'gray'}>{membership.role.toUpperCase()}</Badge>}</div><div className="text-[10.5px] text-navy-400 truncate">{partner.email||partner.phone||'No login access'}</div></div></div>
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <PositionCard icon={WalletCards} label="Business money with partner" value={heldTotal} sub={held.length?held.map(item=>item.account.name).join(' · '):'No held-money location'} tone="navy"/>
          <PositionCard icon={HandCoins} label="Business owes partner" value={due} sub={due>0?'Personal spending / partner loan':'Nothing to reimburse'} tone={due>0?'saffron':'green'}/>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-2"><Mini label="Capital" value={position.capital}/><Mini label="Paid personally" value={position.personal_expenses}/><Mini label="Withdrawn" value={position.withdrawals}/></div>
        {canWrite&&(heldTotal>0||due>0)&&<div className={'mt-2.5 grid gap-2 '+(heldTotal>0&&due>0?'grid-cols-2':'grid-cols-1')}>
          {heldTotal>0&&<Button variant="accent" className="!min-h-[38px] !text-[11px]" onClick={()=>openHeldSettlement(position.partner_id,position.name,due)}><ArrowRightLeft size={14}/> Settle held money</Button>}
          {due>0&&<Button variant="soft" className="!min-h-[38px] !text-[11px]" onClick={()=>openPayDue(position.partner_id,position.name,due)}><Banknote size={14}/> Pay due</Button>}
        </div>}
        {canAdmin&&<div className="mt-2 grid grid-cols-2 gap-2"><Button variant="soft" className="!min-h-[36px] !text-[11.5px]" onClick={()=>openEdit(partner)}><Pencil size={13}/> Edit</Button><Button variant="danger" className="!min-h-[36px] !text-[11.5px]" onClick={()=>setDeleting(partner)}><Trash2 size={13}/> Delete</Button></div>}
      </div>
    })}</div>

    <Modal open={!!paying} onClose={()=>{if(!saving)setPaying(null)}} title={paying?'Pay '+paying.name:'Pay partner'}>
      {paying&&<div className="rounded-xl bg-saffron-50 border border-saffron-200 px-3 py-2"><div className="text-[10px] font-bold text-saffron-700">BUSINESS OWES</div><div className="num text-[18px] font-bold text-navy-900">{businessMoney(paying.due)}</div></div>}
      <Field label="Amount to reimburse"><Input inputMode="decimal" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></Field>
      <Field label="Pay from"><Select value={payAccountId} onChange={e=>setPayAccountId(e.target.value)}><option value="">Choose money location</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      <Button full loading={saving} disabled={!payAccountId||Number(payAmount)<=0} onClick={payDue}><Banknote size={15}/> Record reimbursement</Button>
    </Modal>

    <Modal open={!!settling} onClose={()=>{if(!saving)setSettling(null)}} title={settling?'Settle money with '+settling.name:'Settle held money'} wide>
      {settling&&<>
        <div className="grid grid-cols-2 gap-2"><PositionCard icon={WalletCards} label="Business money held" value={balanceByAccount.get(settleHeldAccountId)??0} sub="Still belongs to business" tone="navy"/><PositionCard icon={HandCoins} label="Business owes partner" value={settling.due} sub="Personal money due back" tone="saffron"/></div>
        <Field label="Money location held by partner"><Select value={settleHeldAccountId} onChange={e=>onHeldAccountChange(e.target.value)}>{heldAccountsFor(settling.partnerId).filter(i=>i.balance>0).map(i=><option key={i.account.id} value={i.account.id}>{i.account.name} · {businessMoney(i.balance)}</option>)}</Select></Field>
        <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-[11px] text-navy-600">Prangan can use some business money already held to reimburse personal spending, then return the rest to another business location. No fake withdrawal is created.</div>
        <div className="grid grid-cols-2 gap-2"><Field label="Keep as reimbursement"><Input inputMode="decimal" value={settleReimburse} onChange={e=>setSettleReimburse(e.target.value)}/></Field><Field label="Return to business"><Input inputMode="decimal" value={settleReturn} onChange={e=>setSettleReturn(e.target.value)}/></Field></div>
        {Number(settleReturn)>0&&<Field label="Return into"><Select value={settleDestinationId} onChange={e=>setSettleDestinationId(e.target.value)}><option value="">Choose destination</option>{activeAccounts.filter(a=>a.id!==settleHeldAccountId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>}
        <Field label="Settlement note"><Textarea value={settleNote} onChange={e=>setSettleNote(e.target.value)} placeholder="Optional handover detail"/></Field>
        <Button full loading={saving} disabled={(Number(settleReimburse)||0)+(Number(settleReturn)||0)<=0||(Number(settleReturn)>0&&!settleDestinationId)} onClick={settleHeld}><ArrowRightLeft size={15}/> Complete settlement</Button>
      </>}
    </Modal>

    <Modal open={open} onClose={()=>{if(!saving){setOpen(false);setEditing(null)}}} title={editing?'Edit partner':'Add partner'}>
      <Field label="Partner name"><Input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} autoFocus/></Field>
      <Field label="Email" hint="Email controls who can log in to this Business workspace."><Input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></Field><Field label="Ownership %"><Input inputMode="decimal" value={form.ownership} onChange={e=>setForm(v=>({...v,ownership:e.target.value}))}/></Field></div>
      {editing&&<div className="grid grid-cols-2 gap-2"><Field label="Workspace role"><Select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value as BusinessRole}))}><option value="admin">Admin</option><option value="partner">Partner</option><option value="bookkeeper">Bookkeeper</option><option value="viewer">Viewer</option></Select></Field><Field label="Login status"><Select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value as 'active'|'disabled'}))}><option value="active">Active</option><option value="disabled">Disabled</option></Select></Field></div>}
      <Button full loading={saving} disabled={!form.name.trim()} onClick={editing?()=>setConfirmEdit(true):submitAdd}>{editing?'Review edit':'Add partner'}</Button>
    </Modal>
    <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm partner edit" body="This changes the partner profile, ownership, login email, workspace role and login status exactly as entered." busy={saving} onClose={()=>setConfirmEdit(false)} onConfirm={confirmEditNow}/>
    <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete partner" body="This permanently deletes the partner, their Business login membership and transactions tied to this partner. Type DELETE to continue." busy={saving} onClose={()=>setDeleting(null)} onConfirm={deleteNow}/>
  </div>
}

function Mini({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-cream-100 px-2 py-2 min-w-0"><div className="text-[9.5px] text-navy-400 font-semibold truncate">{label}</div><div className="num text-[12px] font-bold text-navy-800 truncate">{businessMoney(value)}</div></div>}
function PositionCard({icon:Icon,label,value,sub,tone}:{icon:typeof WalletCards;label:string;value:number;sub:string;tone:'navy'|'saffron'|'green'}){
  const shell=tone==='saffron'?'bg-saffron-50 border-saffron-200':tone==='green'?'bg-green-50 border-green-100':'bg-navy-50 border-navy-100'
  return <div className={'rounded-xl border p-2.5 min-w-0 '+shell}><div className="flex items-center gap-1.5 text-[9.5px] font-bold text-navy-500"><Icon size={13}/><span className="truncate">{label}</span></div><div className="num text-[15px] font-bold text-navy-900 mt-0.5">{businessMoney(value)}</div><div className="text-[9.5px] text-navy-400 line-clamp-2">{sub}</div></div>
}

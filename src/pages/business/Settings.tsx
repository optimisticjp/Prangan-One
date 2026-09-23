import { useEffect, useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'

type ReviewMode='none'|'one'|'tiered'|'all'
function modeFromBusiness(one:number|null|undefined,all:number|null|undefined):ReviewMode{
 if(one==null)return'none';if(one===0&&all===0)return'all';if(all!=null)return'tiered';return'one'
}

export default function BusinessSettings(){
 const {data,canAdmin,saveSettings,deleteBusiness}=useBusiness()
 const toast=useToast(),navigate=useNavigate()
 const [name,setName]=useState(data.business?.name??'')
 const [reviewMode,setReviewMode]=useState<ReviewMode>(modeFromBusiness(data.business?.approval_one_above,data.business?.approval_all_above))
 const [oneAbove,setOneAbove]=useState(String(data.business?.approval_one_above??5000))
 const [allAbove,setAllAbove]=useState(String(data.business?.approval_all_above??25000))
 const [confirmEdit,setConfirmEdit]=useState(false),[confirmDelete,setConfirmDelete]=useState(false),[saving,setSaving]=useState(false)
 useEffect(()=>{setName(data.business?.name??'');setReviewMode(modeFromBusiness(data.business?.approval_one_above,data.business?.approval_all_above));setOneAbove(String(data.business?.approval_one_above??5000));setAllAbove(String(data.business?.approval_all_above??25000))},[data.business])
 const thresholds=()=>{if(reviewMode==='none')return{approvalOneAbove:null,approvalAllAbove:null};if(reviewMode==='all')return{approvalOneAbove:0,approvalAllAbove:0};const one=Math.max(0,Number(oneAbove)||0);if(reviewMode==='one')return{approvalOneAbove:one,approvalAllAbove:null};return{approvalOneAbove:one,approvalAllAbove:Math.max(one,Number(allAbove)||one)}}
 const save=async()=>{if(!canAdmin||!name.trim())return;setSaving(true);try{await saveSettings({name,...thresholds()});toast.success('Business settings saved');setConfirmEdit(false)}catch(error){toast.error(error instanceof Error?error.message:'Could not save settings')}finally{setSaving(false)}}
 const remove=async()=>{if(!canAdmin)return;setSaving(true);try{await deleteBusiness();toast.success('Business permanently deleted');setConfirmDelete(false);navigate('/business/onboarding',{replace:true})}catch(error){toast.error(error instanceof Error?error.message:'Could not delete business')}finally{setSaving(false)}}
 return <div className="space-y-3 min-w-0">
  <div><h1 className="text-[17px] font-bold text-navy-900">Business settings</h1><p className="text-[11.5px] text-navy-400">Business name and rules for when another partner should check an expense.</p></div>
  <div className="rounded-xl border border-cream-200 bg-white p-3 space-y-3">
   <Field label="Business name"><Input value={name} onChange={e=>setName(e.target.value)} disabled={!canAdmin}/></Field>
   <Field label="Expense review rule" hint="Use this when you want another partner to check larger expense records. Payment and review are separate."><Select value={reviewMode} onChange={e=>setReviewMode(e.target.value as ReviewMode)} disabled={!canAdmin}><option value="none">No partner check needed</option><option value="one">One partner checks larger expenses</option><option value="tiered">One partner above one limit, all partners above a higher limit</option><option value="all">All other partners check every expense</option></Select></Field>
   {reviewMode==='one'&&<Field label="Review expenses above"><Input inputMode="decimal" value={oneAbove} onChange={e=>setOneAbove(e.target.value)} placeholder="5000"/></Field>}
   {reviewMode==='tiered'&&<div className="grid grid-cols-2 gap-2"><Field label="One partner above"><Input inputMode="decimal" value={oneAbove} onChange={e=>setOneAbove(e.target.value)} placeholder="5000"/></Field><Field label="All partners above"><Input inputMode="decimal" value={allAbove} onChange={e=>setAllAbove(e.target.value)} placeholder="25000"/></Field></div>}
   <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 flex items-start gap-2"><ShieldCheck size={16} className="text-navy-600 shrink-0 mt-0.5"/><div className="text-[11px] text-navy-600">{reviewMode==='none'&&'Expenses are recorded without partner review.'}{reviewMode==='one'&&<>Expenses up to {formatThreshold(oneAbove)} need no review. Larger expenses need one other partner.</>}{reviewMode==='tiered'&&<>Up to {formatThreshold(oneAbove)} needs no review; above that needs one partner; above {formatThreshold(allAbove)} needs all other active partners.</>}{reviewMode==='all'&&'Every expense needs all other active partners to review it.'}</div></div>
   {canAdmin&&<Button full loading={saving} disabled={!name.trim()} onClick={()=>setConfirmEdit(true)}>Save changes</Button>}
  </div>
  {canAdmin&&<div className="rounded-xl border border-red-200 bg-red-50 p-3"><div className="font-bold text-[13px] text-over">Delete entire Business</div><p className="text-[11.5px] text-navy-500 mt-1">Permanently removes this Business, partners, accounts, transactions, payment history, staff, tasks, proofs and recurring entries.</p><Button variant="danger" full className="mt-3" onClick={()=>setConfirmDelete(true)}><Trash2 size={15}/> Delete Business</Button></div>}
  <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm Business edit" body="This changes the Business name and the amount-based expense review rule for future expenses." busy={saving} onClose={()=>setConfirmEdit(false)} onConfirm={save}/>
  <TypedConfirmModal open={confirmDelete} mode="DELETE" title="Delete entire Business" body="This permanently deletes the complete Business workspace and all Business data inside it. This cannot be undone from the app." busy={saving} onClose={()=>setConfirmDelete(false)} onConfirm={remove}/>
 </div>
}
function formatThreshold(value:string){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value)||0)}

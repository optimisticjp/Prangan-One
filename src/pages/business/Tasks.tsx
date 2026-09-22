import { useMemo, useState } from 'react'
import { BellRing, CalendarDays, CheckCircle2, Clock3, MessageSquareText, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import type { BusinessTask, BusinessTaskPriority, BusinessTaskStatus } from '../../lib/business/types'

const priorityTone: Record<BusinessTaskPriority, 'red'|'amber'|'gray'|'green'> = { urgent:'red', high:'amber', normal:'gray', low:'green' }
const taskCategories = ['General','Operations','Sales','Marketing','Purchase','Delivery','Customer','Accounts','Admin','Maintenance']

export default function BusinessTasks(){
  const { data, activeMembership, canManageTeam, isStaff, addTask, editTask, setTaskStatus, addTaskNote, sendTaskReminder, deleteTask } = useBusiness()
  const toast=useToast()
  const [filter,setFilter]=useState<'open'|'completed'|'all'>('open')
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState<BusinessTask|null>(null)
  const [selected,setSelected]=useState<BusinessTask|null>(null)
  const [confirmDelete,setConfirmDelete]=useState(false)
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [category,setCategory]=useState('General')
  const [priority,setPriority]=useState<BusinessTaskPriority>('normal')
  const [assigneeType,setAssigneeType]=useState<'partner'|'staff'|'none'>('none')
  const [assigneeId,setAssigneeId]=useState('')
  const [dueAt,setDueAt]=useState('')
  const [note,setNote]=useState('')
  const [statusNote,setStatusNote]=useState('')
  const [busy,setBusy]=useState(false)

  const list=useMemo(()=>data.tasks.filter(task=>filter==='all'||(filter==='completed'?task.status==='completed':task.status!=='completed')),[data.tasks,filter])

  const partnerOptions=data.partners.filter(p=>p.active)
  const staffOptions=data.staff.filter(s=>s.active)

  const assigneeName=(task:BusinessTask)=>{
    if(task.assignee_staff_id)return data.staff.find(s=>s.id===task.assignee_staff_id)?.name||'Staff'
    if(task.assignee_partner_id)return data.partners.find(p=>p.id===task.assignee_partner_id)?.name||'Partner'
    return 'Unassigned'
  }

  const openAdd=()=>{setEditing(null);setTitle('');setDescription('');setCategory('General');setPriority('normal');setAssigneeType('none');setAssigneeId('');setDueAt('');setOpen(true)}
  const openEdit=(task:BusinessTask)=>{setEditing(task);setTitle(task.title);setDescription(task.description??'');setCategory(task.category);setPriority(task.priority);setAssigneeType(task.assignee_staff_id?'staff':task.assignee_partner_id?'partner':'none');setAssigneeId(task.assignee_staff_id||task.assignee_partner_id||'');setDueAt(task.due_at?new Date(new Date(task.due_at).getTime()-new Date(task.due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'');setOpen(true)}

  const save=async()=>{
    if(!title.trim())return
    setBusy(true)
    try{
      const payload={title,description,category,priority,partnerId:assigneeType==='partner'?assigneeId||null:null,staffId:assigneeType==='staff'?assigneeId||null:null,dueAt:dueAt?new Date(dueAt).toISOString():null}
      if(editing)await editTask(editing.id,payload);else await addTask(payload)
      toast.success(editing?'Task updated':'Task added')
      setOpen(false);setEditing(null)
    }catch(error){toast.error(error instanceof Error?error.message:'Could not save task')}finally{setBusy(false)}
  }

  const changeStatus=async(task:BusinessTask,status:BusinessTaskStatus)=>{
    if((status==='completed'||status==='pending')&&!statusNote.trim()){toast.error(status==='completed'?'Add a note explaining how the task was finished.':'Add a note explaining why it is pending.');return}
    setBusy(true)
    try{await setTaskStatus(task.id,status,statusNote);toast.success(status==='completed'?'Task completed':'Task status updated');setStatusNote('');setSelected(null)}
    catch(error){toast.error(error instanceof Error?error.message:'Could not update task')}finally{setBusy(false)}
  }

  const addNoteNow=async()=>{
    if(!selected||!note.trim())return
    setBusy(true)
    try{await addTaskNote(selected.id,note,true);toast.success('Note added and notification sent');setNote('')}
    catch(error){toast.error(error instanceof Error?error.message:'Could not add note')}finally{setBusy(false)}
  }

  const remind=async(task:BusinessTask)=>{
    setBusy(true)
    try{await sendTaskReminder(task.id,'Reminder: '+task.title);toast.success('Reminder sent')}
    catch(error){toast.error(error instanceof Error?error.message:'Could not send reminder')}finally{setBusy(false)}
  }

  const remove=async()=>{
    if(!selected)return
    setBusy(true)
    try{await deleteTask(selected.id);toast.success('Task deleted');setSelected(null);setConfirmDelete(false)}
    catch(error){toast.error(error instanceof Error?error.message:'Could not delete task')}finally{setBusy(false)}
  }

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div><h1 className="text-[17px] font-bold text-navy-900">Tasks</h1><p className="text-[11.5px] text-navy-400">{isStaff?'Your assigned work and updates.':'Assign work to partners or staff and follow it to completion.'}</p></div>
      {canManageTeam&&<button onClick={openAdd} className="h-9 px-3 shrink-0 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14}/> Task</button>}
    </div>

    <div className="grid grid-cols-3 gap-1.5">{(['open','completed','all'] as const).map(value=><button key={value} onClick={()=>setFilter(value)} className={'min-h-[38px] rounded-xl border text-[11px] font-semibold capitalize '+(filter===value?'bg-navy-900 text-white border-navy-900':'bg-white text-navy-500 border-cream-200')}>{value}</button>)}</div>

    <div className="space-y-2">{list.length===0?<div className="rounded-2xl border border-cream-200 bg-white px-4 py-8 text-center text-[12px] text-navy-400">No tasks here.</div>:list.map(task=>{
      const overdue=task.status!=='completed'&&task.due_at&&new Date(task.due_at)<new Date()
      return <button key={task.id} onClick={()=>{setSelected(task);setStatusNote('')}} className="w-full rounded-2xl border border-cream-200 bg-white p-3 text-left">
        <div className="flex items-start gap-2"><div className={'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 '+(task.status==='completed'?'bg-green-50 text-paid':overdue?'bg-red-50 text-over':'bg-navy-50 text-navy-600')}>{task.status==='completed'?<CheckCircle2 size={17}/>:<Clock3 size={17}/>}</div><div className="min-w-0 flex-1"><div className="flex gap-1.5 flex-wrap"><Badge tone={priorityTone[task.priority]}>{task.priority.toUpperCase()}</Badge><Badge tone="gray">{task.category}</Badge>{overdue&&<Badge tone="red">OVERDUE</Badge>}</div><div className="mt-1 text-[13px] font-bold text-navy-900">{task.title}</div><div className="mt-1 flex items-center gap-3 text-[10.5px] text-navy-400"><span className="inline-flex items-center gap-1"><UserRound size={11}/>{assigneeName(task)}</span>{task.due_at&&<span className="inline-flex items-center gap-1"><CalendarDays size={11}/>{new Date(task.due_at).toLocaleDateString('en-IN')}</span>}</div>{task.status_note&&<div className="mt-1 text-[10.5px] text-navy-500 line-clamp-2">{task.status_note}</div>}</div></div>
      </button>
    })}</div>

    <Modal open={open} onClose={()=>{if(!busy)setOpen(false)}} title={editing?'Edit task':'Add task'}>
      <Field label="Task"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Call courier and confirm pickup" autoFocus/></Field>
      <Field label="What needs to happen"><Textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Clear instructions make tasks easier to finish."/></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Category"><Select value={category} onChange={e=>setCategory(e.target.value)}>{taskCategories.map(v=><option key={v}>{v}</option>)}</Select></Field><Field label="Priority"><Select value={priority} onChange={e=>setPriority(e.target.value as BusinessTaskPriority)}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></Select></Field></div>
      <Field label="Assign to"><Select value={assigneeType+':'+assigneeId} onChange={e=>{const [type,id]=e.target.value.split(':');setAssigneeType(type as 'partner'|'staff'|'none');setAssigneeId(id||'')}}><option value="none:">Unassigned</option><optgroup label="Partners">{partnerOptions.map(p=><option key={p.id} value={'partner:'+p.id}>{p.name}</option>)}</optgroup><optgroup label="Staff">{staffOptions.map(s=><option key={s.id} value={'staff:'+s.id}>{s.name}{s.title?' · '+s.title:''}</option>)}</optgroup></Select></Field>
      <Field label="Due date & time"><Input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></Field>
      <Button full loading={busy} disabled={!title.trim()} onClick={save}>{editing?'Save task':'Add task'}</Button>
    </Modal>

    <Modal open={!!selected} onClose={()=>{if(!busy)setSelected(null)}} title="Task details">
      {selected&&<>
        <div><div className="flex gap-1.5 flex-wrap"><Badge tone={priorityTone[selected.priority]}>{selected.priority.toUpperCase()}</Badge><Badge tone="gray">{selected.category}</Badge></div><div className="mt-2 text-[16px] font-bold text-navy-900">{selected.title}</div>{selected.description&&<p className="mt-1 text-[12px] text-navy-500">{selected.description}</p>}<div className="mt-2 text-[11px] text-navy-400">Assigned to {assigneeName(selected)}{selected.due_at?' · Due '+new Date(selected.due_at).toLocaleString('en-IN'):''}</div></div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto">{data.taskNotes.filter(n=>n.task_id===selected.id).map(n=><div key={n.id} className="rounded-xl bg-cream-100 px-3 py-2"><div className="text-[11.5px] text-navy-700">{n.note}</div><div className="text-[9.5px] text-navy-400 mt-0.5">{new Date(n.created_at).toLocaleString('en-IN')}</div></div>)}</div>

        <Field label="Add note"><Textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Update the other person…"/></Field>
        <Button full variant="soft" loading={busy} disabled={!note.trim()} onClick={addNoteNow}><MessageSquareText size={14}/> Add note & notify</Button>

        {selected.status!=='completed'&&<>
          <Field label={selected.status==='in_progress'?'Pending / completion note':'Status note'} hint="Required when marking completed or moving back to pending."><Textarea value={statusNote} onChange={e=>setStatusNote(e.target.value)} placeholder="Why pending, or how it was finished…"/></Field>
          <div className="grid grid-cols-2 gap-2">{selected.status!=='in_progress'&&<Button variant="soft" onClick={()=>void changeStatus(selected,'in_progress')}>Start</Button>}<Button variant="accent" onClick={()=>void changeStatus(selected,'completed')}>Complete</Button></div>
        </>}
        {selected.status==='completed'&&<Button full variant="soft" onClick={()=>void changeStatus(selected,'pending')}>Reopen as pending</Button>}

        {canManageTeam&&<div className="grid grid-cols-3 gap-2"><Button variant="soft" className="!px-2" onClick={()=>{openEdit(selected);setSelected(null)}}><Pencil size={13}/> Edit</Button><Button variant="soft" className="!px-2" onClick={()=>void remind(selected)}><BellRing size={13}/> Remind</Button><Button variant="danger" className="!px-2" onClick={()=>setConfirmDelete(true)}><Trash2 size={13}/> Delete</Button></div>}
      </>}
    </Modal>

    <TypedConfirmModal open={confirmDelete} mode="DELETE" title="Delete task" body="This permanently deletes the task, its notes and related task notifications." busy={busy} onClose={()=>setConfirmDelete(false)} onConfirm={remove}/>
  </div>
}

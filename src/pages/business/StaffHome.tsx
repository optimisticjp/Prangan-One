import { Bell, CheckCircle2, Clock3, HandCoins, IndianRupee, ListTodo, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'

export default function BusinessStaffHome(){
  const {data,activeMembership}=useBusiness()
  const staffId=activeMembership?.staffId??data.staff[0]?.id??null
  const position=data.staffPositions.find(p=>p.staff_id===staffId)
  const openTasks=data.tasks.filter(t=>t.status!=='completed')
  const completed=data.tasks.filter(t=>t.status==='completed')
  const unread=data.notifications.filter(n=>!n.read_at)
  const dueSoon=openTasks.filter(t=>t.due_at&&new Date(t.due_at).getTime()-Date.now()<24*60*60*1000)

  return <div className="space-y-3">
    <section className="rounded-2xl bg-navy-900 text-white p-4">
      <div className="text-[10px] uppercase tracking-wide text-white/55 font-semibold">My work</div>
      <div className="mt-1 text-[20px] font-bold">{data.staff[0]?.name||'Staff'}</div>
      <div className="mt-3 grid grid-cols-3 gap-2"><Mini icon={ListTodo} label="Open tasks" value={String(openTasks.length)}/><Mini icon={CheckCircle2} label="Done" value={String(completed.length)}/><Mini icon={Bell} label="Unread" value={String(unread.length)}/></div>
    </section>

    <section className="grid grid-cols-2 gap-2">
      <MoneyCard icon={WalletCards} label="Business money with me" value={position?.advance_balance??0}/>
      <MoneyCard icon={HandCoins} label="Business owes me" value={position?.outstanding_due??0}/>
      <MoneyCard icon={IndianRupee} label="Salary paid" value={position?.salary_paid??0}/>
      <MoneyCard icon={Clock3} label="Due soon" value={dueSoon.length} numeric/>
    </section>

    <section className="grid grid-cols-3 gap-2">
      <Link to="/business/tasks" className="min-h-[58px] rounded-xl border border-cream-200 bg-white flex flex-col items-center justify-center text-[10.5px] font-semibold text-navy-700"><ListTodo size={17} className="text-saffron-700"/>Tasks</Link>
      <Link to="/business/my-money" className="min-h-[58px] rounded-xl border border-cream-200 bg-white flex flex-col items-center justify-center text-[10.5px] font-semibold text-navy-700"><WalletCards size={17} className="text-saffron-700"/>My money</Link>
      <Link to="/business/notifications" className="relative min-h-[58px] rounded-xl border border-cream-200 bg-white flex flex-col items-center justify-center text-[10.5px] font-semibold text-navy-700"><Bell size={17} className="text-saffron-700"/>Alerts{unread.length>0&&<Badge tone="amber">{unread.length}</Badge>}</Link>
    </section>

    <section><div className="flex items-center justify-between mb-1.5"><h2 className="text-[13px] font-bold text-navy-900">Next tasks</h2><Link to="/business/tasks" className="text-[11px] font-semibold text-saffron-700">See all</Link></div><div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">{openTasks.length===0?<div className="px-4 py-7 text-center text-[12px] text-navy-400">No open tasks.</div>:openTasks.slice(0,5).map(task=><Link key={task.id} to="/business/tasks" className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><Clock3 size={14}/></div><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-navy-800 truncate">{task.title}</div><div className="text-[10px] text-navy-400">{task.priority.toUpperCase()}{task.due_at?' · '+new Date(task.due_at).toLocaleDateString('en-IN'):''}</div></div></Link>)}</div></section>
  </div>
}
function Mini({icon:Icon,label,value}:{icon:typeof ListTodo;label:string;value:string}){return <div className="rounded-xl bg-white/10 p-2 text-center"><Icon size={15} className="mx-auto text-saffron-400"/><div className="mt-1 text-[15px] font-bold">{value}</div><div className="text-[9px] text-white/55">{label}</div></div>}
function MoneyCard({icon:Icon,label,value,numeric=false}:{icon:typeof WalletCards;label:string;value:number;numeric?:boolean}){return <div className="rounded-2xl border border-cream-200 bg-white p-3"><Icon size={16} className="text-saffron-700"/><div className="mt-1 text-[10px] text-navy-400">{label}</div><div className="num text-[17px] font-bold text-navy-900">{numeric?value:businessMoney(value)}</div></div>}

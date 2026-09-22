import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'

export default function BusinessNotifications(){
  const {data,markNotificationRead,markAllNotificationsRead}=useBusiness()
  const unread=data.notifications.filter(n=>!n.read_at)

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-2"><div><h1 className="text-[17px] font-bold text-navy-900">Notifications</h1><p className="text-[11.5px] text-navy-400">Task assignments, reminders, notes and staff-money updates.</p></div>{unread.length>0&&<Button variant="soft" className="!min-h-[36px] !px-3 !text-[11px]" onClick={()=>void markAllNotificationsRead()}><CheckCheck size={13}/> Read all</Button>}</div>

    <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
      {data.notifications.length===0?<div className="px-4 py-10 text-center text-[12px] text-navy-400">No notifications yet.</div>:data.notifications.map(n=><button key={n.id} onClick={()=>{if(!n.read_at)void markNotificationRead(n.id)}} className={'w-full px-3 py-3 border-b border-cream-100 last:border-0 flex items-start gap-2.5 text-left '+(!n.read_at?'bg-saffron-50/60':'bg-white')}>
        <div className={'h-9 w-9 rounded-xl shrink-0 flex items-center justify-center '+(!n.read_at?'bg-saffron-100 text-saffron-700':'bg-navy-50 text-navy-400')}><Bell size={16}/></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><div className="text-[12.5px] font-bold text-navy-800">{n.title}</div>{!n.read_at&&<span className="h-2 w-2 rounded-full bg-saffron-500"/>}</div>{n.body&&<div className="mt-0.5 text-[11px] text-navy-500">{n.body}</div>}<div className="mt-1 text-[9.5px] text-navy-300">{new Date(n.created_at).toLocaleString('en-IN')}</div></div>
      </button>)}
    </div>
  </div>
}

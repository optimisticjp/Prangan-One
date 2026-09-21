import { ArrowRight, Banknote, BarChart3, CalendarCheck2, Settings, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'

const tools = [
  { to: '/business/accounts', icon: Banknote, title: 'Money accounts', sub: 'Cash, bank and optional payment accounts' },
  { to: '/business/categories', icon: Tags, title: 'Categories', sub: 'Edit or delete income and expense labels' },
  { to: '/business/day-close', icon: CalendarCheck2, title: 'Day close', sub: 'Expected cash vs actual cash counted' },
  { to: '/business/reports', icon: BarChart3, title: 'Reports & export', sub: 'Money movement, categories and CSV' },
  { to: '/business/settings', icon: Settings, title: 'Business settings', sub: 'Name, approval rule and workspace controls' },
]

export default function BusinessMore() {
  return (
    <div>
      <h1 className="text-[17px] font-bold text-navy-900 mb-2.5">More tools</h1>
      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
        {tools.map(t => (
          <Link key={t.to} to={t.to} className="min-h-[62px] flex items-center gap-3 px-3 py-2.5 border-b border-cream-100 last:border-0 active:bg-cream-50">
            <div className="h-9 w-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
              <t.icon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-navy-800">{t.title}</div>
              <div className="text-[10.5px] text-navy-400 truncate">{t.sub}</div>
            </div>
            <ArrowRight size={15} className="text-navy-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}

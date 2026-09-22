import { ArrowRight, Banknote, BarChart3, Bell, CalendarCheck2, Languages, ListTodo, LogOut, Settings, Tags, Upload, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useBusinessLanguage } from '../../lib/business/i18n'
import type { BusinessLanguage } from '../../lib/business/i18n'
import { signOut } from '../../lib/auth'

const tools = [
  { to: '/business/tasks', icon: ListTodo, title: 'Tasks', sub: 'Assign work, due dates, priorities, notes and reminders' },
  { to: '/business/staff', icon: UsersRound, title: 'Staff & salary', sub: 'Staff login, salary, advances and reimbursements' },
  { to: '/business/notifications', icon: Bell, title: 'Notifications', sub: 'Task assignments, updates and reminders' },
  { to: '/business/accounts', icon: Banknote, title: 'Money accounts', sub: 'Cash, bank and optional payment accounts' },
  { to: '/business/categories', icon: Tags, title: 'Categories', sub: 'Edit or delete income and expense labels' },
  { to: '/business/day-close', icon: CalendarCheck2, title: 'Day close', sub: 'Count notes and compare actual cash' },
  { to: '/business/import', icon: Upload, title: 'Import bank statement', sub: 'CSV debit / credit import with preview' },
  { to: '/business/reports', icon: BarChart3, title: 'Reports & CA pack', sub: 'Monthly money movement, export and PDF' },
  { to: '/business/settings', icon: Settings, title: 'Business settings', sub: 'Name, approval rule and workspace controls' },
]

export default function BusinessMore() {
  const { language, setLanguage } = useBusinessLanguage()
  const navigate = useNavigate()
  const logout = async () => { await signOut(); navigate('/business/login', { replace: true }) }

  return (
    <div className="space-y-3">
      <h1 className="text-[17px] font-bold text-navy-900">More tools</h1>

      <div className="rounded-2xl border border-cream-200 bg-white p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-9 w-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><Languages size={17} /></div>
          <div>
            <div className="text-[12.5px] font-bold text-navy-800">Business language</div>
            <div className="text-[10.5px] text-navy-400">Daily Home, navigation and quick entry use this language.</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <LanguageButton label="English" value="en" current={language} onChange={setLanguage} />
          <LanguageButton label="ગુજરાતી" value="gu" current={language} onChange={setLanguage} />
          <LanguageButton label="हिंदी" value="hi" current={language} onChange={setLanguage} />
        </div>
      </div>

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
      <button onClick={() => void logout()} className="w-full min-h-[48px] rounded-2xl border border-cream-200 bg-white text-[12.5px] font-semibold text-navy-600 flex items-center justify-center gap-2"><LogOut size={15} /> Log out of Business</button>
    </div>
  )
}

function LanguageButton({
  label,
  value,
  current,
  onChange,
}: {
  label: string
  value: BusinessLanguage
  current: BusinessLanguage
  onChange: (value: BusinessLanguage) => void
}) {
  const active = value === current
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={'min-h-[40px] rounded-xl border text-[11.5px] font-semibold ' + (active ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-600 border-cream-300')}
    >
      {label}
    </button>
  )
}

import { BriefcaseBusiness, Building2, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PranganBrand } from '../components/PranganBrand'

const choices = [
  { to: '/user-login', icon: UserRound, eyebrow: 'USER', title: 'Resident / User Login', gu: 'રહેવાસી લોગિન', body: 'For flat owners and tenants: dues, receipts, notices and complaints.', tone: 'bg-saffron-50 text-saffron-700 border-saffron-200' },
  { to: '/admin-login', icon: ShieldCheck, eyebrow: 'ADMIN', title: 'Admin & Committee Login', gu: 'એડમિન અને કમિટી લોગિન', body: 'For Prangan One owner, society admins, committee, accountants and auditors.', tone: 'bg-navy-50 text-navy-700 border-navy-100' },
  { to: '/business/login', icon: BriefcaseBusiness, eyebrow: 'BUSINESS', title: 'Business Login', gu: 'બિઝનેસ લોગિન', body: 'For business admins, partners, bookkeepers and viewers.', tone: 'bg-green-50 text-paid border-green-100' },
]

export default function Login() {
  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-cream-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <PranganBrand variant="wordmark-navy" height={32} className="mx-auto" />
          <h1 className="mt-5 text-[25px] font-bold text-navy-900">Choose your login</h1>
          <p className="mt-1.5 text-[13.5px] text-navy-500">Pick the section you use. No confusing workspace mixing.</p>
        </div>
        <div className="mt-6 space-y-3">
          {choices.map(choice => (
            <Link key={choice.to} to={choice.to} className="flex min-h-[94px] w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm active:scale-[0.99]">
              <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ' + choice.tone}><choice.icon size={21} /></div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[9.5px] font-bold tracking-[0.12em] text-navy-400">{choice.eyebrow}</div>
                <div className="text-[15px] font-bold text-navy-900">{choice.title}</div>
                <div className="text-[12px] font-semibold text-saffron-700">{choice.gu}</div>
                <p className="mt-1 text-[11.5px] leading-snug text-navy-400">{choice.body}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-cream-200 bg-white p-3.5">
          <div className="flex items-start gap-2.5">
            <Building2 size={17} className="mt-0.5 shrink-0 text-navy-400" />
            <div><div className="text-[12.5px] font-semibold text-navy-800">New resident?</div><p className="text-[11.5px] text-navy-400">Have a society code? <Link to="/join" className="font-semibold text-saffron-700">Request to join.</Link></p></div>
          </div>
        </div>
        <Link to="/" className="mt-5 block text-center text-[12.5px] font-semibold text-navy-400">← Back to Prangan One</Link>
      </div>
    </main>
  )
}

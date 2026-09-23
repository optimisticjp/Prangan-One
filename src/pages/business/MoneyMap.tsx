import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Building2, HandCoins, UserRound, UsersRound, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, summarizeBusinessMoney, transactionRemaining } from '../../lib/business/finance'

export default function BusinessMoneyMap() {
  const { data } = useBusiness()
  const active = data.accountBalances.filter(balance => data.accounts.find(account => account.id === balance.account_id)?.active !== false)
  const money = summarizeBusinessMoney(active, data.staffPositions)
  const negative = active.filter(balance => Number(balance.balance) < 0)
  const positive = active.filter(balance => Number(balance.balance) >= 0)
  const partnerHeld = positive.filter(balance => !!data.accounts.find(account => account.id === balance.account_id)?.custodian_partner_id)
  const shared = positive.filter(balance => !data.accounts.find(account => account.id === balance.account_id)?.custodian_partner_id)
  const partnerDue = data.partnerPositions.filter(position => Number(position.outstanding_due) > 0)
  const staffDue = data.staffPositions.filter(position => Number(position.outstanding_due) > 0)
  const receivables = data.transactions.filter(tx => tx.kind === 'income' && tx.payment_status !== 'paid' && !tx.reversed_at)
  const payables = data.transactions.filter(tx => tx.kind === 'expense' && tx.payment_status !== 'paid' && !tx.reversed_at)
  const collect = receivables.reduce((sum, tx) => sum + transactionRemaining(tx), 0)
  const pay = payables.reduce((sum, tx) => sum + transactionRemaining(tx), 0)

  return (
    <div className="space-y-3 min-w-0">
      <div>
        <h1 className="text-[17px] font-bold text-navy-900">Money overview</h1>
        <p className="text-[11.5px] text-navy-400">Answer five simple questions: how much money we have, where it is, who has it, who owes us, and who we owe.</p>
      </div>

      <section className="rounded-2xl bg-navy-900 text-cream-50 p-3.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-cream-100/55">Money available now</div>
        <div className="num text-[27px] font-bold leading-tight mt-0.5">{businessMoney(money.available)}</div>
        <div className="text-[10px] text-cream-100/55 mt-1">Only money Prangan can positively locate is counted here.</div>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <Summary label="Cash / bank / UPI" value={shared.reduce((sum, item) => sum + Math.max(0, Number(item.balance)), 0)} />
          <Summary label="With partners" value={partnerHeld.reduce((sum, item) => sum + Math.max(0, Number(item.balance)), 0)} />
          <Summary label="With staff" value={money.staffHeld} />
        </div>
      </section>

      {negative.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="px-3 py-2.5 flex gap-2.5 items-start">
            <AlertTriangle size={17} className="text-over shrink-0 mt-0.5" />
            <div>
              <div className="text-[12.5px] font-bold text-navy-900">Records are short by {businessMoney(money.recordGap)}</div>
              <div className="text-[10.5px] leading-relaxed text-navy-500 mt-0.5">This is not a debt from a person. It means Prangan sees a payment from a money location before enough money was recorded there.</div>
            </div>
          </div>
          {negative.map(balance => (
            <Link key={balance.account_id} to="/business/accounts" className="min-h-[48px] border-t border-red-100 px-3 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0"><div className="text-[11.5px] font-semibold text-navy-800">{balance.name}</div><div className="text-[9.5px] text-navy-400">Money source missing from records</div></div>
              <div className="num text-[12px] font-bold text-over">{businessMoney(Math.abs(Number(balance.balance)))}</div>
              <ArrowRight size={13} className="text-navy-300" />
            </Link>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Who owes whom?</h2>
        <div className="grid grid-cols-2 gap-2">
          <DueCard to="/business/ledger" icon={ArrowDownLeft} label="Customers owe us" value={collect} sub={receivables.length ? receivables.length + ' customer amount' + (receivables.length === 1 ? '' : 's') + ' open' : 'Nothing to collect'} tone="green" />
          <DueCard to="/business/ledger" icon={ArrowUpRight} label="We owe vendors" value={pay} sub={payables.length ? payables.length + ' bill' + (payables.length === 1 ? '' : 's') + ' open' : 'Nothing to pay'} tone="amber" />
          <DueCard to="/business/partners" icon={UserRound} label="We owe partners" value={partnerDue.reduce((sum, item) => sum + Number(item.outstanding_due), 0)} sub={partnerDue.length ? partnerDue.map(item => item.name).join(', ') : 'Nothing due'} tone="saffron" />
          <DueCard to="/business/staff" icon={UsersRound} label="We owe staff" value={staffDue.reduce((sum, item) => sum + Number(item.outstanding_due), 0)} sub={staffDue.length ? staffDue.map(item => item.name).join(', ') : 'Nothing due'} tone="saffron" />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <h2 className="text-[13px] font-bold text-navy-900">Where is our money?</h2>
            <div className="text-[9.5px] text-navy-400">Every positive rupee should have a location or a person holding it.</div>
          </div>
          <Link to="/business/accounts" className="text-[10.5px] font-semibold text-saffron-700">Manage</Link>
        </div>
        <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
          {positive.map(balance => {
            const account = data.accounts.find(item => item.id === balance.account_id)
            if (!account) return null
            const holder = account.custodian_partner_id ? data.partners.find(partner => partner.id === account.custodian_partner_id) : null
            return (
              <div key={balance.account_id} className="min-h-[54px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0">
                <div className={'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ' + (holder ? 'bg-saffron-50 text-saffron-700' : 'bg-navy-50 text-navy-600')}>
                  {holder ? <UserRound size={15} /> : account.kind === 'bank' ? <Building2 size={15} /> : <WalletCards size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0"><div className="text-[12px] font-semibold text-navy-800 truncate">{balance.name}</div>{holder && <Badge tone="saffron">WITH {holder.name.toUpperCase()}</Badge>}</div>
                  <div className="text-[9.5px] text-navy-400 uppercase">{holder ? 'Business money held by partner' : account.kind}</div>
                </div>
                <div className="num text-[13px] font-bold text-navy-900">{businessMoney(Math.max(0, Number(balance.balance)))}</div>
              </div>
            )
          })}
          {data.staffPositions.filter(position => Number(position.advance_balance) > 0).map(position => (
            <div key={'staff-' + position.staff_id} className="min-h-[54px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0">
              <div className="h-8 w-8 rounded-lg bg-saffron-50 text-saffron-700 flex items-center justify-center shrink-0"><UsersRound size={15} /></div>
              <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-navy-800 truncate">{position.name}</div><div className="text-[9.5px] text-navy-400">BUSINESS MONEY WITH STAFF</div></div>
              <div className="num text-[13px] font-bold text-navy-900">{businessMoney(position.advance_balance)}</div>
            </div>
          ))}
        </div>
      </section>

      {(partnerDue.length > 0 || staffDue.length > 0) && (
        <section>
          <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">People the business must pay back</h2>
          <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            {partnerDue.map(position => <OwedRow key={'p-' + position.partner_id} icon={UserRound} name={position.name} detail="Partner used personal money / lent money" amount={position.outstanding_due} to="/business/partners" />)}
            {staffDue.map(position => <OwedRow key={'s-' + position.staff_id} icon={UsersRound} name={position.name} detail="Staff paid business expense personally" amount={position.outstanding_due} to="/business/staff" />)}
          </div>
        </section>
      )}

      <div className="rounded-xl bg-cream-100 border border-cream-200 px-3 py-2.5 flex gap-2">
        <HandCoins size={16} className="text-saffron-700 shrink-0 mt-0.5" />
        <p className="text-[10.5px] leading-relaxed text-navy-500"><strong>Easy rule:</strong> “Money with someone” is still business money. “Business owes someone” means they used their own personal money and need to be paid back.</p>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-white/10 border border-white/10 px-2 py-2"><div className="text-[8.5px] text-cream-100/50 font-semibold leading-tight">{label}</div><div className="num text-[11.5px] font-bold truncate mt-0.5">{businessMoney(value)}</div></div>
}

function DueCard({ to, icon: Icon, label, value, sub, tone }: { to: string; icon: typeof ArrowDownLeft; label: string; value: number; sub: string; tone: 'green' | 'amber' | 'saffron' }) {
  const cls = tone === 'green' ? 'bg-green-50 border-green-100 text-paid' : tone === 'amber' ? 'bg-amber-50 border-amber-100 text-pend' : 'bg-saffron-50 border-saffron-200 text-saffron-700'
  return <Link to={to} className={'rounded-xl border p-2.5 min-w-0 active:scale-[0.99] ' + cls}><div className="flex items-center justify-between gap-1"><span className="text-[9.5px] font-bold leading-tight">{label}</span><Icon size={13} /></div><div className="num text-[15px] font-bold text-navy-900 mt-0.5">{businessMoney(value)}</div><div className="text-[9.5px] text-navy-400 leading-tight mt-0.5 truncate">{sub}</div></Link>
}

function OwedRow({ icon: Icon, name, detail, amount, to }: { icon: typeof UserRound; name: string; detail: string; amount: number; to: string }) {
  return <Link to={to} className="min-h-[52px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0 active:bg-cream-50"><div className="h-8 w-8 rounded-lg bg-saffron-50 text-saffron-700 flex items-center justify-center"><Icon size={14} /></div><div className="min-w-0 flex-1"><div className="text-[11.5px] font-semibold text-navy-800 truncate">Business owes {name}</div><div className="text-[9.5px] text-navy-400">{detail}</div></div><div className="num text-[12px] font-bold text-pend">{businessMoney(amount)}</div><ArrowRight size={13} className="text-navy-300" /></Link>
}

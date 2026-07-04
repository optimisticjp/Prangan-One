/**
 * Receipt styled after the paper receipt books societies already use,
 * so it feels instantly familiar to older members.
 * Print uses the browser dialog (save as PDF works from there too).
 */
import { Printer, Share2 } from 'lucide-react'
import type { Flat, Payment, Society } from '../lib/types'
import { fmtDate, fmtMonth, inr } from '../lib/format'
import { payModeLabel } from '../lib/copy'
import { waShare, waTemplates } from '../lib/whatsapp'
import { Button } from './ui'

export function ReceiptView({ payment, flat, society, month }: {
  payment: Payment; flat: Flat; society: Society; month?: string
}) {
  const personName = flat.occupancy === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName
  return (
    <div>
      <div className="print-area card p-0 overflow-hidden max-w-xl mx-auto">
        {/* header band */}
        <div className="bg-navy-800 text-cream-50 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-[18px] leading-tight">{society.name}</div>
            <div className="text-[12.5px] text-cream-200/90">{society.address}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-cream-200/80">રસીદ</div>
            <div className="font-bold text-saffron-400 num">{payment.receiptNo}</div>
          </div>
        </div>

        {/* body, receipt-book style */}
        <div className="px-5 py-5 space-y-3 border-x-2 border-dashed border-cream-300 sm:border-x-0">
          <div className="flex justify-between text-[14px]">
            <span className="text-navy-400">તારીખ</span>
            <span className="font-semibold">{fmtDate(payment.date)}</span>
          </div>
          <div className="border-t border-dashed border-cream-300" />
          <p className="text-[15.5px] leading-relaxed">
            શ્રી <b>{personName}</b> (ફ્લેટ <b className="num">{flat.number}</b>) પાસેથી{' '}
            {month ? <>માસ <b>{fmtMonth(month)}</b> ના મેન્ટેનન્સ પેટે </> : <>સોસાયટી ફંડ પેટે </>}
            રકમ મળી.
          </p>
          <div className="flex items-center justify-between bg-cream-100 border border-cream-200 rounded-xl px-4 py-3">
            <span className="text-navy-500 text-[14px]">મળેલ રકમ</span>
            <span className="num text-[26px] font-bold text-navy-900">{inr(payment.amount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13.5px]">
            <div>
              <div className="text-navy-400">ચુકવણી પ્રકાર</div>
              <div className="font-semibold">{payModeLabel[payment.mode]}</div>
            </div>
            {payment.refNo && (
              <div>
                <div className="text-navy-400">રેફરન્સ</div>
                <div className="font-semibold num">{payment.refNo}</div>
              </div>
            )}
          </div>
          {payment.note && <div className="text-[13px] text-navy-500 bg-saffron-50 border border-saffron-100 rounded-lg px-3 py-2">નોંધ: {payment.note}</div>}

          <div className="flex items-end justify-between pt-4">
            {/* paid stamp */}
            <div className="h-16 w-16 rounded-full border-[2.5px] border-paid/70 text-paid/80 flex items-center justify-center rotate-[-12deg] font-bold text-[13px]">
              ચૂકવેલ
            </div>
            <div className="text-center">
              <div className="h-9" />
              <div className="border-t border-navy-300 pt-1 text-[12.5px] text-navy-500 px-4">ખજાનચી, {society.name}</div>
            </div>
          </div>
        </div>

        <div className="bg-cream-100 border-t border-cream-200 px-5 py-2.5 text-center text-[11.5px] text-navy-400">
          આ કમ્પ્યુટર-જનરેટેડ રસીદ છે. કોઈ સહીની જરૂર નથી.
          <div className="text-[10px] text-navy-300 mt-0.5">Powered by Prangan One</div>
        </div>
      </div>

      <div className="no-print flex gap-2 max-w-xl mx-auto mt-4">
        <Button full onClick={() => window.print()}><Printer size={17} /> પ્રિન્ટ / PDF સેવ કરો</Button>
        <a className="flex-1" href={waShare(waTemplates.paymentReceived(society.name, personName, flat.number, payment.amount, payment.receiptNo ?? ''))} target="_blank" rel="noreferrer">
          <Button full variant="soft"><Share2 size={17} /> WhatsApp</Button>
        </a>
      </div>
    </div>
  )
}

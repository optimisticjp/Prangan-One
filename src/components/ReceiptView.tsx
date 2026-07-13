/**
 * Receipt styled after the paper receipt books societies already use,
 * so it feels instantly familiar to older members.
 *
 * The primary action is now a real, downloadable PDF: the browser-drawn
 * receipt node is rasterised to a high-res PNG and dropped into a
 * receipt-shaped PDF page (see src/lib/receiptPdf.ts). On phones that support
 * Web Share Level 2, "WhatsApp પર મોકલો" shares the actual PDF file straight
 * into WhatsApp; everywhere else it downloads the PDF and opens the wa.me text
 * link, so nothing regresses. Browser print still works as a secondary option.
 */
import { useRef, useState } from 'react'
import { Download, MessageCircle, Printer, Loader2 } from 'lucide-react'
import type { Flat, Payment, Society } from '../lib/types'
import { fmtDate, fmtMonth, inr } from '../lib/format'
import { payModeLabel } from '../lib/copy'
import { waShare, waTemplates } from '../lib/whatsapp'
import { generateReceiptPdf, downloadBlob } from '../lib/receiptPdf'
import { PoweredByPrangan } from './PranganBrand'
import { SocietyBadge } from './SocietyLogo'
import { Button } from './ui'

export function ReceiptView({ payment, flat, society, month }: {
  payment: Payment; flat: Flat; society: Society; month?: string
}) {
  const personName = flat.occupancy === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName
  const receiptRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null)
  const receiptNo = payment.receiptNo ?? 'receipt'
  const waText = waTemplates.paymentReceived(society.name, personName, flat.number, payment.amount, payment.receiptNo ?? '')

  const downloadReceipt = async () => {
    if (!receiptRef.current || busy) return
    setBusy('download')
    try {
      const { blob, filename } = await generateReceiptPdf(receiptRef.current, receiptNo)
      downloadBlob(blob, filename)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Receipt PDF generation failed:', e)
    } finally {
      setBusy(null)
    }
  }

  const shareWhatsApp = async () => {
    if (!receiptRef.current || busy) return
    const title = `રસીદ ${payment.receiptNo ?? ''}`.trim()
    const waUrl = waShare(waText)
    setBusy('share')
    try {
      const { blob, file, filename } = await generateReceiptPdf(receiptRef.current, receiptNo)
      // Web Share Level 2: send the actual PDF file straight into WhatsApp.
      if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: waText })
        } catch (err) {
          // A user dismissing the share sheet throws AbortError - not a
          // failure, leave it. Anything else: fall back to download + text.
          if ((err as Error)?.name !== 'AbortError') {
            downloadBlob(blob, filename)
            window.open(waUrl, '_blank', 'noopener')
          }
        }
      } else {
        // Desktop / no file-share support: download the PDF and open the wa.me
        // text link, so nothing regresses from the old text-only behaviour.
        downloadBlob(blob, filename)
        window.open(waUrl, '_blank', 'noopener')
      }
    } catch (e) {
      // PDF generation itself failed - still let them send the text message.
      // eslint-disable-next-line no-console
      console.error('Receipt PDF generation failed:', e)
      window.open(waUrl, '_blank', 'noopener')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {/* Fixed, receipt-shaped width so it reads like a receipt and rasterises
          cleanly to a standalone image, not a full-width page. print-color-adjust
          keeps the navy header and colored boxes when actually printed. */}
      <div
        ref={receiptRef}
        className="print-area card p-0 overflow-hidden w-full max-w-[400px] mx-auto"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        {/* header band */}
        <div className="bg-navy-800 text-cream-50 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <SocietyBadge society={society} size={38} dark />
            <div className="min-w-0">
              <div className="font-bold text-[16.5px] leading-tight truncate">{society.name}</div>
              <div className="text-[12px] text-cream-200/90 truncate">{society.address}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
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
          {/* Line-items slot: when the charges feature lands, a maintenance +
              charges breakdown (label/amount rows, each using .num) renders
              here, above the total box, and the box below becomes the sum row.
              Kept as the single "amount received" line for now so adding that
              section later is additive, not a rewrite. */}
          <div className="flex items-center justify-between bg-cream-100 border border-cream-200 rounded-xl px-4 py-3">
            <span className="text-navy-500 text-[14px]">મળેલ રકમ</span>
            <span className="num tabular-nums text-[26px] font-bold text-navy-900">{inr(payment.amount)}</span>
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
          <div className="text-[10px] text-navy-300 mt-0.5 flex items-center justify-center"><PoweredByPrangan /></div>
        </div>
      </div>

      <div className="no-print w-full max-w-[400px] mx-auto mt-4 space-y-2">
        <div className="flex gap-2">
          <Button full onClick={downloadReceipt} disabled={busy !== null}>
            {busy === 'download'
              ? <><Loader2 size={17} className="animate-spin" /> બની રહ્યું છે...</>
              : <><Download size={17} /> PDF ડાઉનલોડ કરો</>}
          </Button>
          <Button full variant="soft" onClick={shareWhatsApp} disabled={busy !== null}>
            {busy === 'share'
              ? <><Loader2 size={17} className="animate-spin" /> બની રહ્યું છે...</>
              : <><MessageCircle size={17} /> WhatsApp પર મોકલો</>}
          </Button>
        </div>
        <button onClick={() => window.print()} disabled={busy !== null}
          className="w-full text-center text-[12.5px] text-navy-400 hover:text-navy-600 disabled:opacity-50 py-1 inline-flex items-center justify-center gap-1.5">
          <Printer size={13} /> પ્રિન્ટ કરો
        </button>
      </div>
    </div>
  )
}

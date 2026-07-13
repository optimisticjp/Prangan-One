import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { ReceiptView } from '../ReceiptView'
import type { Flat, Payment, Society } from '../../lib/types'

// Mock the heavy, lazily-imported libs so the real generation path runs
// (fonts.ready -> toPng -> jsPDF -> a real Blob/File) without a browser.
vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') }))
// A regular function (not an arrow) so `new jsPDF(...)` is constructable, while
// jsPDF itself stays a spy we can assert on.
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function () {
    return {
      addImage: vi.fn(),
      output: vi.fn(() => new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
    }
  }),
}))

const society = { id: 'soc_test', name: 'Test Society', nameEn: 'Test Society', address: 'Vesu, Surat', themeKey: 'navy-saffron' } as unknown as Society
const flat = { id: 'flat_1', number: '101', ownerName: 'Ramesh', occupancy: 'owner' } as unknown as Flat
const payment = { id: 'pay_1', receiptNo: 'TS-2026-0001', date: '2026-07-11', amount: 1200, mode: 'upi' } as unknown as Payment

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null)
  // jsdom implements neither of these; the download path needs both.
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  // Deterministic, resolved fonts.ready so generation never waits on real fonts.
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
})

const setShareSupport = (canShare: unknown, share: unknown) => {
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true })
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
}

describe('ReceiptView PDF download', () => {
  it('clicking download runs the generation path (html-to-image + jsPDF) and downloads the file', async () => {
    render(<ReceiptView payment={payment} flat={flat} society={society} month="2026-07" />)

    fireEvent.click(screen.getByRole('button', { name: /ડાઉનલોડ/ }))

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1))
    expect(jsPDF).toHaveBeenCalledTimes(1)
    // The generated blob was handed to a real browser download.
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

describe('ReceiptView WhatsApp share', () => {
  it('shares the actual PDF file via navigator.share when canShare(files) is true', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    setShareSupport(vi.fn(() => true), share)

    render(<ReceiptView payment={payment} flat={flat} society={society} />)
    fireEvent.click(screen.getByRole('button', { name: /WhatsApp/ }))

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const arg = share.mock.calls[0][0] as { files: File[]; title: string; text: string }
    expect(arg.files[0]).toBeInstanceOf(File)
    expect(arg.files[0].name).toBe('receipt-TS-2026-0001.pdf')
    // It did NOT fall back to the wa.me text link.
    expect(window.open).not.toHaveBeenCalled()
  })

  it('falls back to downloading the PDF and opening the wa.me text link when file share is unsupported', async () => {
    setShareSupport(undefined, undefined) // no Web Share Level 2 (desktop)

    render(<ReceiptView payment={payment} flat={flat} society={society} />)
    fireEvent.click(screen.getByRole('button', { name: /WhatsApp/ }))

    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    expect((window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('wa.me')
    // The PDF was still generated and downloaded as the fallback.
    expect(toPng).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

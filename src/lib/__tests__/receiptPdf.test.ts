import { afterEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the vi.mock factories (which are hoisted above imports) can see them.
const mocks = vi.hoisted(() => {
  const addImage = vi.fn()
  const output = vi.fn(() => new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
  const jsPDFCtor = vi.fn(function (_opts?: unknown) { return { addImage, output } })
  const toPng = vi.fn()
  return { addImage, output, jsPDFCtor, toPng }
})

vi.mock('jspdf', () => ({ jsPDF: mocks.jsPDFCtor }))
vi.mock('html-to-image', () => ({ toPng: mocks.toPng }))

// A data URL whose PNG IHDR header encodes exactly w x h. readPngPixelSize only
// reads bytes 16-23, so a real image body isn't needed - just the header.
function fakePngDataUrl(w: number, h: number): string {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0) // PNG signature
  bytes.set([0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52], 8) // IHDR length + type
  const dv = new DataView(bytes.buffer)
  dv.setUint32(16, w)
  dv.setUint32(20, h)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return 'data:image/png;base64,' + btoa(bin)
}

afterEach(() => vi.clearAllMocks())

describe('generateReceiptPdf sizes the PDF page to the captured image, so it never clips', () => {
  it('derives the jsPDF page format and image placement from the captured PNG, not the DOM node size', async () => {
    // The node measures 380x600, but the captured image is 900x1400 - a
    // deliberately different aspect ratio than node*pixelRatio (380*2.5=950),
    // so a page sized from the node would be wrong and crop. The page must
    // follow the IMAGE.
    mocks.toPng.mockResolvedValue(fakePngDataUrl(900, 1400))
    const { generateReceiptPdf } = await import('../receiptPdf')

    const node = {
      scrollWidth: 380,
      scrollHeight: 600,
      getBoundingClientRect: () => ({ width: 380, height: 600 }),
    } as unknown as HTMLElement

    const { file, filename } = await generateReceiptPdf(node, 'TS-2026-0001')

    // Page format is the captured image's real pixels, so the page is never
    // narrower than the image: the receipt can't be cropped.
    expect(mocks.jsPDFCtor).toHaveBeenCalledTimes(1)
    const opts = mocks.jsPDFCtor.mock.calls[0][0] as { format: [number, number]; orientation: string }
    expect(opts.format).toEqual([900, 1400])
    expect(opts.orientation).toBe('portrait')

    // The image is placed at the full page size (0,0 -> imageW x imageH): scale
    // to fit, never crop.
    expect(mocks.addImage).toHaveBeenCalledWith(expect.any(String), 'PNG', 0, 0, 900, 1400)

    expect(filename).toBe('receipt-TS-2026-0001.pdf')
    expect(file).toBeInstanceOf(File)
  })
})

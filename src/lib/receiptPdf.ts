/**
 * Turns a rendered receipt DOM node into a real, downloadable PDF.
 *
 * The Gujarati matters here: jsPDF's own text APIs don't shape Gujarati
 * conjuncts correctly, so we never draw text with jsPDF. Instead we let the
 * browser draw the receipt (it already shapes the script correctly), rasterise
 * that exact DOM node to a high-resolution PNG with html-to-image, and drop
 * the PNG into a PDF page sized to the receipt's own aspect ratio - no A4
 * whitespace, and the Gujarati stays pixel-perfect.
 *
 * Both html-to-image and jsPDF are heavy, and only needed the moment someone
 * actually downloads or shares. They are dynamically imported HERE, inside the
 * generation call, so neither the receipt page nor the main bundle carries
 * their weight until then.
 */

/**
 * Reads a PNG's true pixel dimensions straight from its IHDR header in the data
 * URL - no Image decode, so it works in every environment (including jsdom).
 * The PDF page is sized from THIS, not from the DOM node's measured size, so the
 * page is guaranteed to match the image and can never crop it. Returns null if
 * the data isn't a parseable PNG (then we fall back to the capture size).
 */
function readPngPixelSize(dataUrl: string): { width: number; height: number } | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  let bin: string
  try {
    // 8-byte signature + 8-byte IHDR length/type + width(4) + height(4) = the
    // first 24 bytes, i.e. 32 base64 chars; decode a little extra to be safe.
    bin = atob(dataUrl.slice(comma + 1, comma + 1 + 44))
  } catch { return null }
  if (bin.length < 24) return null
  const u32 = (o: number) =>
    ((bin.charCodeAt(o) << 24) | (bin.charCodeAt(o + 1) << 16) | (bin.charCodeAt(o + 2) << 8) | bin.charCodeAt(o + 3)) >>> 0
  const width = u32(16)
  const height = u32(20)
  return width && height ? { width, height } : null
}

/** Loads the heavy libs on demand and renders `node` into a receipt PDF file. */
export async function generateReceiptPdf(
  node: HTMLElement,
  receiptNo: string,
): Promise<{ blob: Blob; file: File; filename: string }> {
  // Wait for the self-hosted Gujarati/Inter fonts to be ready before we
  // rasterise, otherwise the PNG can capture a fallback font mid-load.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try { await document.fonts.ready } catch { /* older browsers - proceed anyway */ }
  }

  const [{ toPng }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ])

  const pixelRatio = 2.5
  // The receipt's FULL rendered size. scrollWidth/scrollHeight include the whole
  // content even where an ancestor might otherwise clip it; getBoundingClientRect
  // is the fallback, and a sane default covers a not-yet-laid-out node.
  const rect = node.getBoundingClientRect()
  const width = Math.ceil(node.scrollWidth || rect.width || 400)
  const height = Math.ceil(node.scrollHeight || rect.height || 560)

  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width,
    height,
    // Force the clone to render at exactly the measured box. Without this, the
    // receipt's own `mx-auto` centering and `max-w-[400px]` cap can reflow the
    // detached clone narrower than intended and clip its right edge during
    // capture (the header, amount box, and treasurer line ran off the page).
    style: { margin: '0', maxWidth: 'none', width: `${width}px`, height: `${height}px` },
  })

  // Size the PDF page to the CAPTURED IMAGE's own pixels - never the DOM node's
  // measured size - so the page can never be narrower than the image and the
  // whole receipt always fits. Fall back to capture-size * pixelRatio (same
  // aspect ratio) only if the PNG header somehow can't be read.
  const img = readPngPixelSize(dataUrl) ?? { width: Math.round(width * pixelRatio), height: Math.round(height * pixelRatio) }

  // A PDF page the exact shape (and pixel size) of the captured receipt, not A4
  // with whitespace. Page width == image width, page height == image height *
  // (pageWidth / imageWidth) == image height: scale to fit, never crop.
  const pdf = new jsPDF({
    orientation: img.height >= img.width ? 'portrait' : 'landscape',
    unit: 'px',
    format: [img.width, img.height],
    compress: true,
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height)

  const filename = `receipt-${receiptNo}.pdf`
  const blob = pdf.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  return { blob, file, filename }
}

/** Triggers a browser download of a blob under the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

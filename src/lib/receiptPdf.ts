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

  // Capture at the node's own rendered size (so nothing is clipped) but at a
  // high pixel ratio so the raster is crisp on retina screens and in print.
  const width = node.offsetWidth || 400
  const height = node.offsetHeight || 560
  const dataUrl = await toPng(node, {
    pixelRatio: 2.5,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width,
    height,
  })

  // A PDF page the exact shape of the receipt, not A4 with whitespace.
  const pdf = new jsPDF({
    orientation: height >= width ? 'portrait' : 'landscape',
    unit: 'px',
    format: [width, height],
    compress: true,
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)

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

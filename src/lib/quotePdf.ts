/**
 * Produces a real PDF download from a formatted quotation DOM node.
 * Browser rendering preserves conjuncts in Gujarati and Hindi; jsPDF's text
 * drawing does not. One full-height page avoids clipped text. PDF is raster.
 * Large libraries are loaded only after clicking Download PDF.
 */
export async function generateQuotePdf(node: HTMLElement, business: string): Promise<{blob: Blob; filename:string}> {
  if (document.fonts?.ready) {
    try { await document.fonts.ready } catch { /* render with available fonts */ }
  }
  const [{toPng},{jsPDF}] = await Promise.all([import('html-to-image'),import('jspdf')])
  const rect = node.getBoundingClientRect()
  const width = Math.ceil(node.scrollWidth || rect.width || 720)
  const height = Math.ceil(node.scrollHeight || rect.height || 960)
  if (width < 100 || height < 100 || width > 2000 || height > 5500)
    throw new Error('The quotation is too large for one PDF page. Shorten the draft.')
  const data = await toPng(node, {
    pixelRatio: 2, cacheBust: true, backgroundColor:'#ffffff',
    width, height,
    style:{margin:'0',maxWidth:'none',width:width+'px',height:height+'px'},
  })
  const pageWidth = 210 // A4 width in millimeters
  const imageHeight = pageWidth * height / width
  const pageHeight = Math.max(297, imageHeight)
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:[pageWidth,pageHeight],compress:true})
  pdf.addImage(data,'PNG',0,0,pageWidth,imageHeight)
  const safe = business.normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30) || 'draft'
  return {blob:pdf.output('blob'),filename:'quotation-'+safe+'.pdf'}
}

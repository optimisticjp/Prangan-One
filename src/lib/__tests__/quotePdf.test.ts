import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>{
  const toPng=vi.fn().mockResolvedValue('data:image/png;base64,AAAA')
  const addImage=vi.fn()
  const output=vi.fn(()=>new Blob(['%PDF-1.4'],{type:'application/pdf'}))
  const Ctor=vi.fn(function(_opts: unknown){return {addImage,output}})
  return {toPng,addImage,output,Ctor}
})
vi.mock('html-to-image',()=>({toPng:mocks.toPng}))
vi.mock('jspdf',()=>({jsPDF:mocks.Ctor}))
afterEach(()=>vi.clearAllMocks())
describe('quotation PDF generation',()=>{
  it('creates a proper PDF-sized page without losing long Gujarati text',async()=>{
    const {generateQuotePdf}=await import('../quotePdf')
    const node={scrollWidth:700,scrollHeight:1100,getBoundingClientRect:()=>({width:700,height:1100})} as unknown as HTMLElement
    const result=await generateQuotePdf(node,'AC & Repairs')
    expect(mocks.toPng).toHaveBeenCalledWith(node,expect.objectContaining({pixelRatio:2}))
    expect(mocks.Ctor).toHaveBeenCalledWith(expect.objectContaining({unit:'mm',format:[210,330]}))
    expect(mocks.addImage).toHaveBeenCalledWith(expect.any(String),'PNG',0,0,210,330)
    expect(result.filename).toBe('quotation-AC-Repairs.pdf')
    expect(result.blob.type).toBe('application/pdf')
  })
  it('rejects unusually large pages instead of cropping',async()=>{
    const {generateQuotePdf}=await import('../quotePdf')
    const huge={scrollWidth:700,scrollHeight:9000,getBoundingClientRect:()=>({width:700,height:9000})} as unknown as HTMLElement
    await expect(generateQuotePdf(huge,'Big')).rejects.toThrow('too large')
  })
})

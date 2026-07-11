import { describe, expect, it } from 'vitest'
import { validateUpload, safeExtension, UPLOAD_RULES } from '../uploadValidation'

// A file of an exact byte size without allocating that many bytes for real -
// only file.size and file.type matter to the validator.
function fileOf(bytes: number, type: string, name = 'f'): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: bytes })
  return f
}

const MB = 1024 * 1024

describe('validateUpload accepts the allowed types under each bucket limit', () => {
  it('accepts jpeg/png/webp within limit for every image bucket', () => {
    for (const bucket of ['society-logos', 'complaint-photos', 'payment-proof'] as const) {
      for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
        expect(validateUpload(bucket, fileOf(1024, type))).toEqual({ ok: true })
      }
    }
  })

  it('documents additionally accepts application/pdf', () => {
    expect(validateUpload('documents', fileOf(1024, 'application/pdf'))).toEqual({ ok: true })
    expect(validateUpload('documents', fileOf(1024, 'image/png'))).toEqual({ ok: true })
  })
})

describe('validateUpload rejects the wrong type', () => {
  it('rejects a PDF in an image-only bucket', () => {
    const r = validateUpload('society-logos', fileOf(1024, 'application/pdf'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('JPG')
  })

  it('rejects an svg everywhere - the deliberate stored-XSS guard', () => {
    for (const bucket of ['society-logos', 'complaint-photos', 'payment-proof', 'documents'] as const) {
      expect(validateUpload(bucket, fileOf(1024, 'image/svg+xml')).ok).toBe(false)
    }
  })

  it('rejects a file with no MIME type at all', () => {
    expect(validateUpload('complaint-photos', fileOf(1024, '')).ok).toBe(false)
  })

  it('rejects a disguised type like text/html', () => {
    expect(validateUpload('documents', fileOf(1024, 'text/html')).ok).toBe(false)
  })
})

describe('validateUpload rejects oversized files at each bucket limit', () => {
  it('rejects just over 2MB for society-logos but accepts just under', () => {
    expect(validateUpload('society-logos', fileOf(2 * MB + 1, 'image/png')).ok).toBe(false)
    expect(validateUpload('society-logos', fileOf(2 * MB, 'image/png')).ok).toBe(true)
  })

  it('rejects just over 5MB for complaint-photos and payment-proof', () => {
    expect(validateUpload('complaint-photos', fileOf(5 * MB + 1, 'image/jpeg')).ok).toBe(false)
    expect(validateUpload('payment-proof', fileOf(5 * MB + 1, 'image/jpeg')).ok).toBe(false)
  })

  it('rejects just over 10MB for documents', () => {
    expect(validateUpload('documents', fileOf(10 * MB + 1, 'application/pdf')).ok).toBe(false)
    expect(validateUpload('documents', fileOf(10 * MB, 'application/pdf')).ok).toBe(true)
  })

  it('the reason names the limit in MB', () => {
    const r = validateUpload('documents', fileOf(10 * MB + 1, 'application/pdf'))
    if (!r.ok) expect(r.reason).toContain('10 MB')
  })
})

describe('safeExtension derives the extension from MIME, not the filename', () => {
  it('maps each known MIME to its safe extension', () => {
    expect(safeExtension(fileOf(1, 'image/jpeg', 'evil.exe'), 'png')).toBe('jpg')
    expect(safeExtension(fileOf(1, 'image/png', 'x.gif'), 'png')).toBe('png')
    expect(safeExtension(fileOf(1, 'image/webp'), 'png')).toBe('webp')
    expect(safeExtension(fileOf(1, 'application/pdf'), 'jpg')).toBe('pdf')
  })

  it('ignores a misleading filename extension entirely', () => {
    // filename says .svg, but the real MIME is png - the stored extension
    // follows the MIME, so the path can never end up as .svg
    expect(safeExtension(fileOf(1, 'image/png', 'logo.svg'), 'png')).toBe('png')
  })

  it('falls back only when the MIME is unknown', () => {
    expect(safeExtension(fileOf(1, ''), 'jpg')).toBe('jpg')
    expect(safeExtension(fileOf(1, 'application/octet-stream'), 'png')).toBe('png')
  })
})

describe('rules stay in sync with the documented bucket limits', () => {
  it('has the exact byte limits the schema/migration set', () => {
    expect(UPLOAD_RULES['society-logos'].maxBytes).toBe(2097152)
    expect(UPLOAD_RULES['complaint-photos'].maxBytes).toBe(5242880)
    expect(UPLOAD_RULES['payment-proof'].maxBytes).toBe(5242880)
    expect(UPLOAD_RULES.documents.maxBytes).toBe(10485760)
  })

  it('never allows svg in any bucket', () => {
    for (const bucket of Object.keys(UPLOAD_RULES) as (keyof typeof UPLOAD_RULES)[]) {
      expect(UPLOAD_RULES[bucket].mimeTypes).not.toContain('image/svg+xml')
    }
  })
})

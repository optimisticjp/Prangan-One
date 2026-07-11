/**
 * Shared file-upload rules, kept in ONE place so the bucket-level limits in
 * supabase/schema.sql (and the migration alongside it) and the client-side
 * checks here can never quietly drift apart. The database is the real
 * boundary - it enforces these on every upload no matter what the client
 * does; this module is the immediate, human-friendly feedback in front of it.
 *
 * image/svg+xml is deliberately not allowed anywhere: an SVG can carry
 * script, and society-logos is public and rendered in an <img>, which would
 * make it a stored-XSS vector. Raster images only, plus PDF for documents.
 */

export type UploadBucket = 'society-logos' | 'complaint-photos' | 'payment-proof' | 'documents'

const MB = 1024 * 1024

interface BucketRule {
  maxBytes: number
  mimeTypes: readonly string[]
}

// Must match file_size_limit and allowed_mime_types on each bucket in
// supabase/schema.sql. If you change one side, change the other.
export const UPLOAD_RULES: Record<UploadBucket, BucketRule> = {
  'society-logos': { maxBytes: 2 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'complaint-photos': { maxBytes: 5 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'payment-proof': { maxBytes: 5 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  documents: { maxBytes: 10 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
}

// MIME -> safe stored extension. The stored path's extension is derived from
// this, never from the user's filename, so a mislabeled name can't decide
// what the file is saved as.
export const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export type UploadValidation = { ok: true } | { ok: false; reason: string }

/**
 * Checks a file against its bucket's size and type rules, returning a short
 * Gujarati reason on failure, in the same tone as the rest of the app's copy.
 * The database enforces these limits regardless of this check.
 */
export function validateUpload(bucket: UploadBucket, file: File): UploadValidation {
  const rule = UPLOAD_RULES[bucket]
  if (!rule.mimeTypes.includes(file.type)) {
    const allowsPdf = rule.mimeTypes.includes('application/pdf')
    return { ok: false, reason: allowsPdf ? 'ફક્ત JPG, PNG, WebP કે PDF ફાઈલ ચાલશે.' : 'ફક્ત JPG, PNG કે WebP ઈમેજ ચાલશે.' }
  }
  if (file.size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / MB)
    return { ok: false, reason: `ફાઈલ બહુ મોટી છે. ${mb} MB થી નાની ફાઈલ મૂકો.` }
  }
  return { ok: true }
}

/**
 * The safe stored extension for a file, taken from its MIME type. Falls back
 * to the given default only when the MIME type is unknown (which, after
 * validateUpload has passed, it never is - the fallback is pure safety net).
 */
export function safeExtension(file: File, fallback: string): string {
  return MIME_EXTENSION[file.type] ?? fallback
}

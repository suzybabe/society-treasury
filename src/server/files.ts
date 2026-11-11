import 'server-only'
import { createHash } from 'node:crypto'
import { ApiError } from './http'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = /^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/

export interface Upload {
  fileName: string
  mimeType: string
  sizeBytes: number
  sha256: string
  data: Buffer
}

/** Reads and validates an uploaded image or PDF (max 5 MB) from a form field. */
export async function readUpload(form: FormData | null, field = 'file'): Promise<Upload> {
  const file = form?.get(field)
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, 'Attach a file.')
  if (!ALLOWED.test(file.type)) throw new ApiError(400, 'Files must be an image (PNG, JPG, WebP, HEIC) or a PDF.')
  if (file.size > MAX_BYTES) throw new ApiError(400, 'Files must be 5 MB or smaller.')
  const data = Buffer.from(await file.arrayBuffer())
  return {
    fileName: file.name.slice(0, 200) || 'upload',
    mimeType: file.type,
    sizeBytes: file.size,
    sha256: createHash('sha256').update(data).digest('hex'),
    data,
  }
}

/** Serves a stored file inline, privately cached. */
export function fileResponse(f: { data: Buffer; mimeType: string; sizeBytes: number; fileName: string }) {
  return new Response(new Uint8Array(f.data), {
    headers: {
      'Content-Type': f.mimeType,
      'Content-Length': String(f.sizeBytes),
      'Content-Disposition': `inline; filename="${encodeURIComponent(f.fileName)}"`,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

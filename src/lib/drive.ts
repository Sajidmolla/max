// Extracts a Google Drive file ID from common share-link formats.
export function extractDriveId(input: string): string | null {
  const s = input.trim()
  const m = s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/) || s.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([A-Za-z0-9_-]{10,})/)
  return m ? m[1] : null
}
export const embedUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`
export const driveThumb = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w640`
export const FALLBACK_THUMB = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%2313131a'/><text x='50%' y='50%' fill='%23555' font-family='sans-serif' font-size='40' text-anchor='middle'>MAX</text></svg>"

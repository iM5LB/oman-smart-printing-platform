/**
 * Multer/busboy read multipart filenames as latin1. UTF-8 names (Arabic, etc.)
 * arrive as mojibake unless re-decoded.
 * Uses Uint8Array + TextDecoder so it works in both Node and the browser
 * (no Node `Buffer` / `buffer` package required on the client).
 */
export function decodeMultipartFilename(name: string): string {
  if (!name) return name;

  // Already valid Unicode (e.g. Arabic from a correct parser).
  if (/[\u0600-\u06FF]/.test(name)) return name;

  const bytes = new Uint8Array(name.length);
  for (let i = 0; i < name.length; i++) {
    bytes[i] = name.charCodeAt(i) & 0xff;
  }
  const decoded = new TextDecoder('utf-8').decode(bytes);
  if (decoded.includes('\uFFFD') || decoded === name) return name;

  // Mojibake pattern: high latin bytes in source, proper script after decode.
  const looksMojibake = /[\u0080-\u00FF]/.test(name);
  const decodedBetter =
    /[\u0600-\u06FF]/.test(decoded) ||
    (looksMojibake && !/[\u0080-\u00FF]/.test(decoded));

  return decodedBetter ? decoded : name;
}

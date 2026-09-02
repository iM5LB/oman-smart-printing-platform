/**
 * Multer/busboy read multipart filenames as latin1. UTF-8 names (Arabic, etc.)
 * arrive as mojibake unless re-decoded.
 */
export function decodeMultipartFilename(name: string): string {
  if (!name) return name;

  // Already valid Unicode (e.g. Arabic from a correct parser).
  if (/[\u0600-\u06FF]/.test(name)) return name;

  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  if (decoded.includes('\uFFFD') || decoded === name) return name;

  // Mojibake pattern: high latin bytes in source, proper script after decode.
  const looksMojibake = /[\u0080-\u00FF]/.test(name);
  const decodedBetter =
    /[\u0600-\u06FF]/.test(decoded) ||
    (looksMojibake && !/[\u0080-\u00FF]/.test(decoded));

  return decodedBetter ? decoded : name;
}

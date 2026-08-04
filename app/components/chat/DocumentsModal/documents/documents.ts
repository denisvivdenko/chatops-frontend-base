export const ACCEPTED_TYPE = 'application/pdf';
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (file.type !== ACCEPTED_TYPE) return `${file.name} isn't a PDF.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `${file.name} is too large (max 20MB).`;
  return null;
}

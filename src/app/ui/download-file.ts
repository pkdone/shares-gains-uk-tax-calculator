/**
 * Trigger a browser download of bytes with the given MIME type (client-only).
 */
export function downloadFile(bytes: Uint8Array, filename: string, mimeType: string): void {
  const bufferCopy = new Uint8Array(bytes.byteLength);
  bufferCopy.set(bytes);
  const blob = new Blob([bufferCopy], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

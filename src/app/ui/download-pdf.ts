import { downloadFile } from '@/app/ui/download-file';

/**
 * Trigger a browser download of PDF bytes (client-only).
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  downloadFile(bytes, filename, 'application/pdf');
}

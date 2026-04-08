import { downloadFile } from '@/app/ui/download-file';

/**
 * Trigger a browser download of JSON bytes (client-only).
 */
export function downloadJson(bytes: Uint8Array, filename: string): void {
  downloadFile(bytes, filename, 'application/json;charset=utf-8');
}

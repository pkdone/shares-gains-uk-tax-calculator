/**
 * jsPDF ships `splitTextToSize` as `any`; jspdf-autotable adds `lastAutoTable` at runtime.
 * Narrow typings here so application code does not rely on `unknown` / local intersections.
 */
export {};

declare module 'jspdf' {
  interface jsPDF {
    /** Set by jspdf-autotable after each table draw. */
    lastAutoTable?: {
      readonly finalY: number;
    };

    splitTextToSize(text: string, maxlen: number, options?: unknown): string | string[];
  }
}

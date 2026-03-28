import { z } from 'zod';

/** ISO calendar date only, UTC-interpreted (YYYY-MM-DD). */
export const dateOnlyStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime());
  }, 'Invalid calendar date');

export type DateOnlyString = z.infer<typeof dateOnlyStringSchema>;

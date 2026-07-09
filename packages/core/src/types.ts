import { z } from 'zod';

/** Dónde se muestra un feature. Es la fuente de verdad del reparto web/escritorio. */
export type Surface = 'desktop' | 'web' | 'both';

/** Estado de un trabajo pesado del motor. */
export const JobStatus = z.enum(['queued', 'running', 'done', 'error']);
export type JobStatus = z.infer<typeof JobStatus>;

export const Job = z.object({
  id: z.string(),
  module: z.string(),
  status: JobStatus,
  progress: z.number().min(0).max(100),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
});
export type Job = z.infer<typeof Job>;

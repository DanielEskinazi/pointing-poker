import { z } from 'zod';

export const GetStatisticsSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  })
});

export const ExportSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format'),
    format: z.enum(['csv', 'json', 'pdf'], {
      errorMap: () => ({ message: 'Format must be csv, json, or pdf' })
    })
  })
});

export const GetVelocitySchema = z.object({
  params: z.object({
    teamId: z.string().min(1, 'Team ID is required')
  }),
  query: z.object({
    days: z.string()
      .transform(Number)
      .pipe(z.number().min(1).max(365))
      .optional()
  })
});

// Type exports for TypeScript
export type GetStatisticsInput = z.infer<typeof GetStatisticsSchema>;
export type ExportSessionInput = z.infer<typeof ExportSessionSchema>;
export type GetVelocityInput = z.infer<typeof GetVelocitySchema>;
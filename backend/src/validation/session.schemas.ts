import { z } from 'zod';

// Removed card value restrictions - users can now input any values

// Emoji validation - comprehensive regex for emojis including ZWJ sequences
const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;

export const CreateSessionSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Session name is required')
      .max(100, 'Session name must be 100 characters or less')
      .trim(),
    hostName: z.string()
      .min(1, 'Host name is required')
      .max(50, 'Host name must be 50 characters or less')
      .trim(),
    hostAvatar: z.string()
      .regex(emojiRegex, 'Avatar must be a single emoji')
      .optional()
      .default('👤'),
    password: z.string()
      .min(4, 'Password must be at least 4 characters')
      .max(50, 'Password must be 50 characters or less')
      .optional(),
    config: z.object({
      cardValues: z.array(z.string())
        .min(2, 'At least 2 card values required')
        .max(20, 'Maximum 20 card values allowed')
        .default(['1', '2', '3', '5', '8', '13', '?']),
      allowSpectators: z.boolean().default(true),
      autoRevealCards: z.boolean().default(false),
      timerSeconds: z.number()
        .min(0, 'Timer cannot be negative')
        .max(3600, 'Timer cannot exceed 1 hour')
        .default(60)
    }).default({})
  })
});

export const GetSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID format')
  })
});

export const JoinSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID format')
  }),
  body: z.object({
    playerName: z.string()
      .min(1, 'Player name is required')
      .max(50, 'Player name must be 50 characters or less')
      .trim(),
    avatar: z.string()
      .regex(emojiRegex, 'Avatar must be a single emoji')
      .default('👤'),
    password: z.string()
      .min(4, 'Password must be at least 4 characters')
      .optional(),
    asSpectator: z.boolean().default(false)
  })
});

export const UpdateSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID format')
  }),
  body: z.object({
    name: z.string()
      .min(1, 'Session name is required')
      .max(100, 'Session name must be 100 characters or less')
      .trim()
      .optional(),
    config: z.object({
      cardValues: z.array(z.string())
        .min(2, 'At least 2 card values required')
        .max(20, 'Maximum 20 card values allowed')
        .optional(),
      allowSpectators: z.boolean().optional(),
      autoRevealCards: z.boolean().optional(),
      timerSeconds: z.number()
        .min(0, 'Timer cannot be negative')
        .max(3600, 'Timer cannot exceed 1 hour')
        .optional()
    }).optional()
  }).refine(
    (data) => data.name !== undefined || data.config !== undefined,
    'At least one field must be provided for update'
  )
});

export const DeleteSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID format')
  })
});

// Type exports for TypeScript
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type GetSessionInput = z.infer<typeof GetSessionSchema>;
export type JoinSessionInput = z.infer<typeof JoinSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type DeleteSessionInput = z.infer<typeof DeleteSessionSchema>;
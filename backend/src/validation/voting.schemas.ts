import { z } from 'zod';

// Removed card value restrictions - users can now input any values

// Emoji validation (basic check for single emoji)
const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u;

export const SubmitVoteSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  }),
  body: z.object({
    storyId: z.string().min(1, 'Story ID is required'), // Allow any string, not just UUID
    value: z.string()
      .min(1, 'Vote value is required')
      .max(10, 'Vote value must be 10 characters or less'),
    confidence: z.number()
      .min(1, 'Confidence must be between 1-5')
      .max(5, 'Confidence must be between 1-5')
      .optional(),
    playerId: z.string().min(1, 'Player ID is required') // Add playerId since we're not using auth
  })
});

export const GetVotesSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  }),
  query: z.object({
    storyId: z.string().uuid('Invalid story ID format').optional()
  })
});

export const RevealCardsSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  })
});

export const ResetGameSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  }),
  body: z.object({
    newStory: z.object({
      title: z.string()
        .min(1, 'Story title is required')
        .max(200, 'Story title must be 200 characters or less')
        .trim(),
      description: z.string()
        .max(1000, 'Story description must be 1000 characters or less')
        .trim()
        .optional()
    }).optional()
  })
});

export const UpdatePlayerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid player ID format')
  }),
  body: z.object({
    name: z.string()
      .min(1, 'Player name is required')
      .max(50, 'Player name must be 50 characters or less')
      .trim()
      .optional(),
    avatar: z.string()
      .regex(emojiRegex, 'Avatar must be a single emoji')
      .optional(),
    isSpectator: z.boolean().optional()
  }).refine(
    (data) => data.name !== undefined || data.avatar !== undefined || data.isSpectator !== undefined,
    'At least one field must be provided for update'
  )
});

export const GetSessionPlayersSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  })
});

export const RemovePlayerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid player ID format')
  })
});

// Type exports for TypeScript
export type SubmitVoteInput = z.infer<typeof SubmitVoteSchema>;
export type GetVotesInput = z.infer<typeof GetVotesSchema>;
export type RevealCardsInput = z.infer<typeof RevealCardsSchema>;
export type ResetGameInput = z.infer<typeof ResetGameSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type GetSessionPlayersInput = z.infer<typeof GetSessionPlayersSchema>;
export type RemovePlayerInput = z.infer<typeof RemovePlayerSchema>;
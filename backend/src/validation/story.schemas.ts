import { z } from 'zod';

export const CreateStorySchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters'),
    description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
  })
});

export const GetStorySchema = z.object({
  params: z.object({
    storyId: z.string().uuid('Invalid story ID format')
  })
});

export const GetSessionStoriesSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  })
});

export const UpdateStorySchema = z.object({
  params: z.object({
    storyId: z.string().uuid('Invalid story ID format')
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title cannot be empty')
      .max(255, 'Title must be less than 255 characters')
      .optional(),
    description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional(),
    isActive: z.boolean().optional(),
    finalEstimate: z.string()
      .max(10, 'Final estimate must be less than 10 characters')
      .optional()
  })
});

export const DeleteStorySchema = z.object({
  params: z.object({
    storyId: z.string().uuid('Invalid story ID format')
  })
});

export const SetActiveStorySchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format'),
    storyId: z.string().uuid('Invalid story ID format')
  })
});

export const CompleteStorySchema = z.object({
  params: z.object({
    storyId: z.string().uuid('Invalid story ID format')
  }),
  body: z.object({
    finalEstimate: z.string()
      .min(1, 'Final estimate is required')
      .max(10, 'Final estimate must be less than 10 characters')
  })
});

// Type exports for TypeScript
export type CreateStoryInput = z.infer<typeof CreateStorySchema>;
export type GetStoryInput = z.infer<typeof GetStorySchema>;
export type GetSessionStoriesInput = z.infer<typeof GetSessionStoriesSchema>;
export type UpdateStoryInput = z.infer<typeof UpdateStorySchema>;
export type DeleteStoryInput = z.infer<typeof DeleteStorySchema>;
export type SetActiveStoryInput = z.infer<typeof SetActiveStorySchema>;
export type CompleteStoryInput = z.infer<typeof CompleteStorySchema>;
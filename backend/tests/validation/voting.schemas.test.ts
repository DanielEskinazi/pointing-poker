import { 
  SubmitVoteSchema,
  GetVotesSchema,
  RevealCardsSchema,
  ResetGameSchema,
  UpdatePlayerSchema,
  GetSessionPlayersSchema,
  RemovePlayerSchema
} from '../../src/validation/voting.schemas';

describe('Voting Validation Schemas', () => {
  describe('SubmitVoteSchema', () => {
    const validData = {
      params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
      body: { storyId: '550e8400-e29b-41d4-a716-446655440001', value: '5', confidence: 3 }
    };

    it('should validate correct vote submission', () => {
      const result = SubmitVoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate vote without confidence', () => {
      const dataWithoutConfidence = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { storyId: '550e8400-e29b-41d4-a716-446655440001', value: '8' }
      };
      const result = SubmitVoteSchema.safeParse(dataWithoutConfidence);
      expect(result.success).toBe(true);
    });

    it('should reject invalid session ID format', () => {
      const invalidData = {
        ...validData,
        params: { sessionId: 'invalid-uuid' }
      };
      const result = SubmitVoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid story ID format', () => {
      const invalidData = {
        ...validData,
        body: { ...validData.body, storyId: 'invalid-uuid' }
      };
      const result = SubmitVoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid vote values', () => {
      const invalidValues = ['invalid', '100', 'xyz', ''];
      
      invalidValues.forEach(value => {
        const invalidData = {
          ...validData,
          body: { ...validData.body, value }
        };
        const result = SubmitVoteSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid vote values', () => {
      const validValues = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
      
      validValues.forEach(value => {
        const validValueData = {
          ...validData,
          body: { ...validData.body, value }
        };
        const result = SubmitVoteSchema.safeParse(validValueData);
        expect(result.success).toBe(true);
      });
    });

    it('should reject confidence values outside 1-5 range', () => {
      const invalidConfidences = [0, 6, 10, -1];
      
      invalidConfidences.forEach(confidence => {
        const invalidData = {
          ...validData,
          body: { ...validData.body, confidence }
        };
        const result = SubmitVoteSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    it('should accept confidence values in 1-5 range', () => {
      const validConfidences = [1, 2, 3, 4, 5];
      
      validConfidences.forEach(confidence => {
        const validConfidenceData = {
          ...validData,
          body: { ...validData.body, confidence }
        };
        const result = SubmitVoteSchema.safeParse(validConfidenceData);
        expect(result.success).toBe(true);
      });
    });

    it('should reject missing required fields', () => {
      const missingValue = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { storyId: '550e8400-e29b-41d4-a716-446655440001' }
      };
      const result = SubmitVoteSchema.safeParse(missingValue);
      expect(result.success).toBe(false);
    });
  });

  describe('GetVotesSchema', () => {
    it('should validate correct get votes request', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        query: { storyId: '550e8400-e29b-41d4-a716-446655440001' }
      };
      const result = GetVotesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate request without storyId query param', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        query: {}
      };
      const result = GetVotesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid session ID', () => {
      const invalidData = {
        params: { sessionId: 'invalid-uuid' },
        query: {}
      };
      const result = GetVotesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid story ID in query', () => {
      const invalidData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        query: { storyId: 'invalid-uuid' }
      };
      const result = GetVotesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('RevealCardsSchema', () => {
    it('should validate correct reveal cards request', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' }
      };
      const result = RevealCardsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid session ID', () => {
      const invalidData = {
        params: { sessionId: 'invalid-uuid' }
      };
      const result = RevealCardsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ResetGameSchema', () => {
    it('should validate reset without new story', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {}
      };
      const result = ResetGameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate reset with new story', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          newStory: {
            title: 'New Story Title',
            description: 'New story description'
          }
        }
      };
      const result = ResetGameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate new story without description', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          newStory: {
            title: 'New Story Title'
          }
        }
      };
      const result = ResetGameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid session ID', () => {
      const invalidData = {
        params: { sessionId: 'invalid-uuid' },
        body: {}
      };
      const result = ResetGameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty story title', () => {
      const invalidData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          newStory: {
            title: '',
            description: 'Valid description'
          }
        }
      };
      const result = ResetGameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject story title too long', () => {
      const invalidData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          newStory: {
            title: 'x'.repeat(201), // Over 200 character limit
            description: 'Valid description'
          }
        }
      };
      const result = ResetGameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject story description too long', () => {
      const invalidData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          newStory: {
            title: 'Valid Title',
            description: 'x'.repeat(1001) // Over 1000 character limit
          }
        }
      };
      const result = ResetGameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdatePlayerSchema', () => {
    it('should validate player name update', () => {
      const validData = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Updated Name' }
      };
      const result = UpdatePlayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate player avatar update', () => {
      const validData = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { avatar: '🚀' }
      };
      const result = UpdatePlayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate spectator status update', () => {
      const validData = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { isSpectator: true }
      };
      const result = UpdatePlayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate multiple field update', () => {
      const validData = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { 
          name: 'New Name',
          avatar: '👤',
          isSpectator: false
        }
      };
      const result = UpdatePlayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid player ID', () => {
      const invalidData = {
        params: { id: 'invalid-uuid' },
        body: { name: 'Valid Name' }
      };
      const result = UpdatePlayerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty body', () => {
      const invalidData = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {}
      };
      const result = UpdatePlayerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid name length', () => {
      const invalidNames = ['', 'x'.repeat(51)]; // Empty and too long
      
      invalidNames.forEach(name => {
        const invalidData = {
          params: { id: '550e8400-e29b-41d4-a716-446655440000' },
          body: { name }
        };
        const result = UpdatePlayerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    it('should reject invalid avatar format', () => {
      const invalidAvatars = ['not-emoji', 'abc', 'toolong']; // Not single emoji
      
      invalidAvatars.forEach(avatar => {
        const invalidData = {
          params: { id: '550e8400-e29b-41d4-a716-446655440000' },
          body: { avatar }
        };
        const result = UpdatePlayerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('GetSessionPlayersSchema', () => {
    it('should validate correct request', () => {
      const validData = {
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' }
      };
      const result = GetSessionPlayersSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid session ID', () => {
      const invalidData = {
        params: { sessionId: 'invalid-uuid' }
      };
      const result = GetSessionPlayersSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('RemovePlayerSchema', () => {
    it('should validate correct request', () => {
      const validData = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' }
      };
      const result = RemovePlayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid player ID', () => {
      const invalidData = {
        params: { id: 'invalid-uuid' }
      };
      const result = RemovePlayerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
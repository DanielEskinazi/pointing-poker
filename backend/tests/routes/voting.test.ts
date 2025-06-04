import request from 'supertest';
import { createApp } from '../../src/app';
import { TestDataFactory } from '../utils/test-helpers';
import { Application } from 'express';

describe('Voting Routes', () => {
  let app: Application;
  let sessionId: string;
  let storyId: string;
  let hostToken: string;
  let playerId: string;
  let playerToken: string;
  let spectatorToken: string;

  beforeEach(async () => {
    app = createApp();
    
    // Create test session with different user types
    const { session, hostToken: hToken } = await TestDataFactory.createHostSession();
    const { player, playerToken: pToken } = await TestDataFactory.createPlayerSession();
    const { spectatorToken: sToken } = await TestDataFactory.createSpectatorSession();
    const story = await TestDataFactory.createTestStory(session.id);
    
    sessionId = session.id;
    storyId = story.id;
    hostToken = hToken;
    playerId = player.id;
    playerToken = pToken;
    spectatorToken = sToken;
  });

  describe('POST /api/sessions/:sessionId/vote', () => {
    it('should allow player to submit vote', async () => {
      const voteData = {
        storyId,
        value: '5',
        confidence: 80
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(voteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voteId).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should allow player to update existing vote', async () => {
      const initialVote = {
        storyId,
        value: '3',
        confidence: 70
      };

      // Submit initial vote
      await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(initialVote)
        .expect(200);

      // Update vote
      const updatedVote = {
        storyId,
        value: '8',
        confidence: 90
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updatedVote)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject vote from spectator', async () => {
      const voteData = {
        storyId,
        value: '5'
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${spectatorToken}`)
        .send(voteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Spectators cannot vote');
    });

    it('should reject vote without authentication', async () => {
      const voteData = {
        storyId,
        value: '5'
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .send(voteData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication token required');
    });

    it('should reject invalid vote value', async () => {
      const voteData = {
        storyId,
        value: 'invalid-value' // Not in valid card values
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(voteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid confidence value', async () => {
      const voteData = {
        storyId,
        value: '5',
        confidence: 10 // Outside 1-5 range
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(voteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid story ID format', async () => {
      const voteData = {
        storyId: 'invalid-uuid',
        value: '5'
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(voteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const voteData = {
        // Missing storyId and value
        confidence: 80
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(voteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sessions/:sessionId/votes', () => {
    beforeEach(async () => {
      // Create some votes
      await TestDataFactory.createTestVote(storyId, playerId, sessionId, '5');
      const anotherPlayer = await TestDataFactory.createTestPlayer(sessionId, { name: 'Another Player' });
      await TestDataFactory.createTestVote(storyId, anotherPlayer.id, sessionId, '8');
    });

    it('should return votes for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.votes).toBeInstanceOf(Array);
      expect(response.body.data.votes.length).toBeGreaterThan(0);
      expect(response.body.data.revealed).toBe(false);
    });

    it('should hide vote values when cards not revealed', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.data.revealed).toBe(false);
      response.body.data.votes.forEach((vote: { value: string | null; confidence: number | null; hasVoted: boolean }) => {
        expect(vote.value).toBeNull();
        expect(vote.confidence).toBeNull();
        expect(vote.hasVoted).toBe(true);
      });
    });

    it('should show vote values when cards are revealed', async () => {
      // First reveal cards
      await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      const response = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.data.revealed).toBe(true);
      expect(response.body.data.consensus).toBeDefined();
      response.body.data.votes.forEach((vote: { value: string | null }) => {
        expect(vote.value).not.toBeNull();
      });
    });

    it('should filter votes by storyId when provided', async () => {
      const anotherStory = await TestDataFactory.createTestStory(sessionId, { title: 'Another Story' });
      
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/votes?storyId=${anotherStory.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.data.votes).toHaveLength(0); // No votes for new story
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid session ID format', async () => {
      const response = await request(app)
        .get('/api/sessions/invalid-uuid/votes')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sessions/:sessionId/reveal', () => {
    beforeEach(async () => {
      // Create some votes before revealing
      await TestDataFactory.createTestVote(storyId, playerId, sessionId, '5');
      const anotherPlayer = await TestDataFactory.createTestPlayer(sessionId, { name: 'Another Player' });
      await TestDataFactory.createTestVote(storyId, anotherPlayer.id, sessionId, '5');
    });

    it('should allow host to reveal cards', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.votes).toBeInstanceOf(Array);
      expect(response.body.data.consensus).toBeDefined();
      expect(response.body.data.statistics).toBeDefined();
    });

    it('should calculate consensus correctly', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      const consensus = response.body.data.consensus;
      expect(consensus.value).toBe('5'); // Most common vote
      expect(consensus.agreement).toBe(1.0); // 100% agreement
      expect(consensus.totalVotes).toBe(2);
    });

    it('should calculate statistics for numeric votes', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      const statistics = response.body.data.statistics;
      expect(statistics.min).toBe(5);
      expect(statistics.max).toBe(5);
      expect(statistics.median).toBe(5);
      expect(statistics.standardDeviation).toBe(0); // All same value
    });

    it('should reject reveal from non-host', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Host authorization required');
    });

    it('should reject unauthenticated reveal', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid session ID format', async () => {
      const response = await request(app)
        .post('/api/sessions/invalid-uuid/reveal')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sessions/:sessionId/reset', () => {
    it('should allow host to reset game', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('New round started');
    });

    it('should allow host to reset with new story', async () => {
      const newStoryData = {
        newStory: {
          title: 'New Round Story',
          description: 'Story for the next round'
        }
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send(newStoryData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject reset from non-host', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({})
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Host authorization required');
    });

    it('should reject unauthenticated reset', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid new story data', async () => {
      const invalidStoryData = {
        newStory: {
          title: '', // Empty title
          description: 'Valid description'
        }
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send(invalidStoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject new story with description too long', async () => {
      const invalidStoryData = {
        newStory: {
          title: 'Valid Title',
          description: 'x'.repeat(1001) // Over 1000 character limit
        }
      };

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send(invalidStoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid session ID format', async () => {
      const response = await request(app)
        .post('/api/sessions/invalid-uuid/reset')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Voting Flow Integration', () => {
    it('should complete full voting cycle', async () => {
      // 1. Submit votes
      await request(app)
        .post(`/api/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ storyId, value: '5', confidence: 80 })
        .expect(200);

      // 2. Check votes are hidden
      const votesBeforeReveal = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(votesBeforeReveal.body.data.revealed).toBe(false);
      expect(votesBeforeReveal.body.data.votes[0].value).toBeNull();

      // 3. Reveal cards
      const revealResponse = await request(app)
        .post(`/api/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(revealResponse.body.data.consensus).toBeDefined();

      // 4. Check votes are now visible
      const votesAfterReveal = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(votesAfterReveal.body.data.revealed).toBe(true);
      expect(votesAfterReveal.body.data.votes[0].value).toBe('5');

      // 5. Reset round
      await request(app)
        .post(`/api/sessions/${sessionId}/reset`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({})
        .expect(200);

      // 6. Verify reset worked
      const votesAfterReset = await request(app)
        .get(`/api/sessions/${sessionId}/votes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(votesAfterReset.body.data.revealed).toBe(false);
    });
  });
});
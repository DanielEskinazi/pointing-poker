import request from 'supertest';
import { createApp } from '../../src/app';
import { TestDataFactory } from '../utils/test-helpers';
import { Application } from 'express';

describe('Player Routes', () => {
  let app: Application;
  let sessionId: string;
  let hostId: string;
  let hostToken: string;
  let playerId: string;
  let playerToken: string;

  beforeEach(async () => {
    app = createApp();
    
    // Create test session with host
    const { session, host, hostToken: hToken } = await TestDataFactory.createHostSession();
    const { player, playerToken: pToken } = await TestDataFactory.createPlayerSession();
    
    sessionId = session.id;
    hostId = host.id;
    hostToken = hToken;
    playerId = player.id;
    playerToken = pToken;
  });

  describe('GET /api/sessions/:sessionId/players', () => {
    it('should return all players in session', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/players`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include player vote status', async () => {
      // Create a story and vote
      const story = await TestDataFactory.createTestStory(sessionId);
      await TestDataFactory.createTestVote(story.id, playerId, sessionId, '5');

      const response = await request(app)
        .get(`/api/sessions/${sessionId}/players`)
        .expect(200);

      const playerData = response.body.data.find((p: any) => p.id === playerId);
      expect(playerData.hasVoted).toBe(true);
    });

    it('should return 404 for invalid session ID', async () => {
      const response = await request(app)
        .get('/api/sessions/invalid-uuid/players')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return empty array for session with no players', async () => {
      const emptySession = await TestDataFactory.createTestSession();
      
      const response = await request(app)
        .get(`/api/sessions/${emptySession.id}/players`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/players/:id', () => {
    it('should update player name with valid token', async () => {
      const updateData = {
        name: 'Updated Player Name'
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Player Name');
    });

    it('should update player avatar', async () => {
      const updateData = {
        avatar: '🚀'
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.avatar).toBe('🚀');
    });

    it('should update spectator status', async () => {
      const updateData = {
        isSpectator: true
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isSpectator).toBe(true);
    });

    it('should reject update without authentication', async () => {
      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication token required');
    });

    it('should reject update of another player', async () => {
      const anotherPlayer = await TestDataFactory.createTestPlayer(sessionId, { name: 'Another Player' });
      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/players/${anotherPlayer.id}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Can only modify your own player data');
    });

    it('should reject invalid player ID format', async () => {
      const updateData = {
        name: 'Valid Name'
      };

      const response = await request(app)
        .put('/api/players/invalid-uuid')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject empty update', async () => {
      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid name length', async () => {
      const updateData = {
        name: '' // Empty name
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid avatar format', async () => {
      const updateData = {
        avatar: 'not-an-emoji'
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle name conflict', async () => {
      // Create another player with a specific name
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Taken Name' });
      
      const updateData = {
        name: 'Taken Name'
      };

      const response = await request(app)
        .put(`/api/players/${playerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Player name already taken');
    });
  });

  describe('DELETE /api/players/:id', () => {
    let targetPlayerId: string;

    beforeEach(async () => {
      const targetPlayer = await TestDataFactory.createTestPlayer(sessionId, { name: 'Target Player' });
      targetPlayerId = targetPlayer.id;
    });

    it('should remove player with host token', async () => {
      const response = await request(app)
        .delete(`/api/players/${targetPlayerId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Player removed');
    });

    it('should reject removal without authentication', async () => {
      const response = await request(app)
        .delete(`/api/players/${targetPlayerId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication token required');
    });

    it('should reject removal with non-host token', async () => {
      const response = await request(app)
        .delete(`/api/players/${targetPlayerId}`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Host authorization required');
    });

    it('should reject removal of host player', async () => {
      const response = await request(app)
        .delete(`/api/players/${hostId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(500); // Internal error due to business logic

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid player ID format', async () => {
      const response = await request(app)
        .delete('/api/players/invalid-uuid')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent player', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      
      const response = await request(app)
        .delete(`/api/players/${nonExistentId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Player not found');
    });
  });
});
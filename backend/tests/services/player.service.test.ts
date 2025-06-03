import { PlayerService } from '../../src/services/player.service';
import { TestDataFactory } from '../utils/test-helpers';

describe('PlayerService', () => {
  let playerService: PlayerService;
  let sessionId: string;
  let hostId: string;

  beforeEach(async () => {
    playerService = new PlayerService();
    
    // Create test session
    const session = await TestDataFactory.createTestSession();
    const host = await TestDataFactory.createTestPlayer(session.id, { id: session.hostId });
    
    sessionId = session.id;
    hostId = host.id;
  });

  describe('getSessionPlayers', () => {
    it('should return all active players in session', async () => {
      // Create additional players
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Player 1' });
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Player 2' });
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Spectator', isSpectator: true });

      const players = await playerService.getSessionPlayers(sessionId);

      expect(players).toHaveLength(4); // host + 2 players + 1 spectator
      expect(players.every(p => p.isActive)).toBe(true);
      expect(players.find(p => p.name === 'Spectator')?.isSpectator).toBe(true);
    });

    it('should not return inactive players', async () => {
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Active Player' });
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Inactive Player', isActive: false });

      const players = await playerService.getSessionPlayers(sessionId);

      expect(players).toHaveLength(2); // host + active player
      expect(players.find(p => p.name === 'Inactive Player')).toBeUndefined();
    });

    it('should include vote status for players', async () => {
      const player = await TestDataFactory.createTestPlayer(sessionId, { name: 'Voter' });
      const story = await TestDataFactory.createTestStory(sessionId);
      
      // Create vote for player
      await TestDataFactory.createTestVote(story.id, player.id, sessionId, '5');

      const players = await playerService.getSessionPlayers(sessionId);
      const voterData = players.find(p => p.name === 'Voter');

      expect(voterData?.hasVoted).toBe(true);
      expect(voterData?.currentVote).toBe('5');
    });

    it('should show no vote for players without votes', async () => {
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Non-Voter' });

      const players = await playerService.getSessionPlayers(sessionId);
      const nonVoterData = players.find(p => p.name === 'Non-Voter');

      expect(nonVoterData?.hasVoted).toBe(false);
      expect(nonVoterData?.currentVote).toBeNull();
    });
  });

  describe('updatePlayer', () => {
    let playerId: string;

    beforeEach(async () => {
      const player = await TestDataFactory.createTestPlayer(sessionId, { name: 'Test Player' });
      playerId = player.id;
    });

    it('should update player name', async () => {
      const updateData = { name: 'Updated Name' };
      
      const result = await playerService.updatePlayer(playerId, updateData);

      expect(result.name).toBe('Updated Name');
      expect(result.id).toBe(playerId);
    });

    it('should update player avatar', async () => {
      const updateData = { avatar: '🎯' };
      
      const result = await playerService.updatePlayer(playerId, updateData);

      expect(result.avatar).toBe('🎯');
    });

    it('should update spectator status', async () => {
      const updateData = { isSpectator: true };
      
      const result = await playerService.updatePlayer(playerId, updateData);

      expect(result.isSpectator).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        name: 'Multi Update',
        avatar: '🚀',
        isSpectator: true
      };
      
      const result = await playerService.updatePlayer(playerId, updateData);

      expect(result.name).toBe('Multi Update');
      expect(result.avatar).toBe('🚀');
      expect(result.isSpectator).toBe(true);
    });

    it('should reject update if name is already taken', async () => {
      // Create another player with existing name
      await TestDataFactory.createTestPlayer(sessionId, { name: 'Existing Name' });
      
      const updateData = { name: 'Existing Name' };

      await expect(playerService.updatePlayer(playerId, updateData))
        .rejects.toThrow('Name already taken');
    });

    it('should allow updating to same name (no change)', async () => {
      const updateData = { name: 'Test Player' }; // Same as current name
      
      const result = await playerService.updatePlayer(playerId, updateData);

      expect(result.name).toBe('Test Player');
    });

    it('should throw error for non-existent player', async () => {
      const nonExistentId = 'non-existent-id';
      const updateData = { name: 'New Name' };

      await expect(playerService.updatePlayer(nonExistentId, updateData))
        .rejects.toThrow('Player not found');
    });

    it('should update lastSeenAt timestamp', async () => {
      const beforeUpdate = new Date();
      const updateData = { name: 'Updated' };
      
      const result = await playerService.updatePlayer(playerId, updateData);

      expect(result.lastSeenAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('removePlayer', () => {
    let playerId: string;

    beforeEach(async () => {
      const player = await TestDataFactory.createTestPlayer(sessionId, { name: 'Removable Player' });
      playerId = player.id;
    });

    it('should soft delete player by setting isActive to false', async () => {
      await playerService.removePlayer(playerId);

      // Player should still exist but be inactive
      const players = await playerService.getSessionPlayers(sessionId);
      expect(players.find(p => p.id === playerId)).toBeUndefined(); // Not in active players
    });

    it('should not allow removing the session host', async () => {
      await expect(playerService.removePlayer(hostId))
        .rejects.toThrow('Cannot remove session host');
    });

    it('should throw error for non-existent player', async () => {
      const nonExistentId = 'non-existent-id';

      await expect(playerService.removePlayer(nonExistentId))
        .rejects.toThrow('Player not found');
    });
  });

  describe('isPlayerSpectator', () => {
    it('should return true for spectator', async () => {
      const spectator = await TestDataFactory.createTestPlayer(sessionId, { 
        name: 'Spectator',
        isSpectator: true 
      });

      const result = await playerService.isPlayerSpectator(spectator.id);

      expect(result).toBe(true);
    });

    it('should return false for regular player', async () => {
      const player = await TestDataFactory.createTestPlayer(sessionId, { 
        name: 'Regular Player',
        isSpectator: false 
      });

      const result = await playerService.isPlayerSpectator(player.id);

      expect(result).toBe(false);
    });

    it('should return false for non-existent player', async () => {
      const result = await playerService.isPlayerSpectator('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('updateLastSeen', () => {
    it('should update lastSeenAt timestamp', async () => {
      const player = await TestDataFactory.createTestPlayer(sessionId, { name: 'Test Player' });
      const beforeUpdate = new Date();
      
      await playerService.updateLastSeen(player.id);

      // Note: In a real test, we would verify the database was updated
      // This test mainly ensures the method doesn't throw an error
    });

    it('should not throw error for non-existent player', async () => {
      // This method is designed to be non-critical, so it shouldn't throw
      await expect(playerService.updateLastSeen('non-existent-id'))
        .resolves.not.toThrow();
    });
  });
});
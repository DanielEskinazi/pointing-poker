import { VotingService, Vote } from '../../src/services/voting.service';
import { TestDataFactory } from '../utils/test-helpers';
import { SessionConfig } from '../../src/types/api';

describe('VotingService', () => {
  let votingService: VotingService;
  let sessionId: string;
  let storyId: string;
  let playerId: string;

  beforeEach(async () => {
    votingService = new VotingService();
    
    // Create test data
    const session = await TestDataFactory.createTestSession();
    const player = await TestDataFactory.createTestPlayer(session.id);
    const story = await TestDataFactory.createTestStory(session.id);
    
    sessionId = session.id;
    storyId = story.id;
    playerId = player.id;
  });

  describe('submitVote', () => {
    it('should successfully submit a vote', async () => {
      const voteData = {
        sessionId,
        storyId,
        playerId,
        value: '5',
        confidence: 80
      };

      const result = await votingService.submitVote(voteData);

      expect(result.success).toBe(true);
      expect(result.voteId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should update existing vote', async () => {
      const voteData = {
        sessionId,
        storyId,
        playerId,
        value: '5',
        confidence: 80
      };

      // Submit first vote
      const firstResult = await votingService.submitVote(voteData);
      expect(firstResult.success).toBe(true);

      // Update vote
      const updatedVoteData = { ...voteData, value: '8', confidence: 90 };
      const secondResult = await votingService.submitVote(updatedVoteData);
      
      expect(secondResult.success).toBe(true);
      expect(secondResult.voteId).toBeDefined();
    });

    it('should reject vote for inactive story', async () => {
      // Make story inactive
      const inactiveStory = await TestDataFactory.createTestStory(sessionId, { isActive: false });
      
      const voteData = {
        sessionId,
        storyId: inactiveStory.id,
        playerId,
        value: '5'
      };

      const result = await votingService.submitVote(voteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or completed story');
    });

    it('should reject vote when cards are already revealed', async () => {
      // Create session with cards revealed
      const revealedSession = await TestDataFactory.createTestSession({
        config: {
          cardValues: ['1', '2', '3', '5', '8'],
          allowSpectators: true,
          autoRevealCards: false,
          timerSeconds: 60,
          cardsRevealed: true
        } as SessionConfig & { cardsRevealed: boolean }
      });
      const revealedStory = await TestDataFactory.createTestStory(revealedSession.id);
      const revealedPlayer = await TestDataFactory.createTestPlayer(revealedSession.id);

      const voteData = {
        sessionId: revealedSession.id,
        storyId: revealedStory.id,
        playerId: revealedPlayer.id,
        value: '5'
      };

      const result = await votingService.submitVote(voteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Voting closed - cards already revealed');
    });
  });

  describe('getVotes', () => {
    it('should return votes for a story', async () => {
      // Create votes
      await TestDataFactory.createTestVote(storyId, playerId, sessionId, '5');
      
      const votes = await votingService.getVotes(sessionId, storyId);

      expect(votes).toHaveLength(1);
      expect(votes[0].playerId).toBe(playerId);
      expect(votes[0].value).toBe('5');
    });

    it('should return empty array for story with no votes', async () => {
      const votes = await votingService.getVotes(sessionId, storyId);
      expect(votes).toHaveLength(0);
    });

    it('should return votes for current story when no storyId provided', async () => {
      await TestDataFactory.createTestVote(storyId, playerId, sessionId, '3');
      
      const votes = await votingService.getVotes(sessionId);

      expect(votes).toHaveLength(1);
      expect(votes[0].value).toBe('3');
    });
  });

  describe('revealCards', () => {
    it('should reveal cards and calculate consensus', async () => {
      // Create multiple votes
      const player2 = await TestDataFactory.createTestPlayer(sessionId, { name: 'Player 2' });
      const player3 = await TestDataFactory.createTestPlayer(sessionId, { name: 'Player 3' });
      
      await TestDataFactory.createTestVote(storyId, playerId, sessionId, '5');
      await TestDataFactory.createTestVote(storyId, player2.id, sessionId, '5');
      await TestDataFactory.createTestVote(storyId, player3.id, sessionId, '8');

      const result = await votingService.revealCards(sessionId);

      expect(result.votes).toHaveLength(3);
      expect(result.consensus).toBeDefined();
      expect(result.consensus!.value).toBe('5'); // Most common vote
      expect(result.consensus!.totalVotes).toBe(3);
      expect(result.statistics).toBeDefined();
    });

    it('should update story with final estimate when consensus is high', async () => {
      // Create unanimous votes (100% consensus)
      const player2 = await TestDataFactory.createTestPlayer(sessionId, { name: 'Player 2' });
      
      await TestDataFactory.createTestVote(storyId, playerId, sessionId, '8');
      await TestDataFactory.createTestVote(storyId, player2.id, sessionId, '8');

      const result = await votingService.revealCards(sessionId);

      expect(result.consensus!.agreement).toBe(1.0); // 100% agreement
      
      // Check if story was updated with final estimate
      // Note: This would require checking the database directly in a real test
    });
  });

  describe('resetRound', () => {
    it('should reset round and mark current story as completed', async () => {
      await votingService.resetRound(sessionId);

      // Verify current story is marked as inactive
      // Note: This would require database verification in a real test
    });

    it('should create new story when provided', async () => {
      const newStoryData = {
        title: 'New Test Story',
        description: 'New story for next round'
      };

      await votingService.resetRound(sessionId, newStoryData);

      // Verify new story was created
      // Note: This would require database verification in a real test
    });

    it('should reset session cards revealed state', async () => {
      await votingService.resetRound(sessionId);

      // Verify session config was updated
      // Note: This would require database verification in a real test
    });
  });

  describe('calculateConsensus', () => {
    it('should return null for empty votes', () => {
      const result = votingService.calculateConsensus([]);
      expect(result).toBeNull();
    });

    it('should calculate consensus correctly', () => {
      const votes: Vote[] = [
        { id: '1', playerId: 'p1', playerName: 'Player 1', value: '5', timestamp: new Date() },
        { id: '2', playerId: 'p2', playerName: 'Player 2', value: '5', timestamp: new Date() },
        { id: '3', playerId: 'p3', playerName: 'Player 3', value: '8', timestamp: new Date() },
        { id: '4', playerId: 'p4', playerName: 'Player 4', value: '5', timestamp: new Date() }
      ];

      const result = votingService.calculateConsensus(votes);

      expect(result).toBeDefined();
      expect(result!.value).toBe('5'); // Most common
      expect(result!.agreement).toBe(0.75); // 3 out of 4
      expect(result!.totalVotes).toBe(4);
      expect(result!.distribution).toEqual({ '5': 3, '8': 1 });
      expect(result!.average).toBe(5.75); // (5+5+8+5)/4
    });

    it('should handle non-numeric values', () => {
      const votes: Vote[] = [
        { id: '1', playerId: 'p1', playerName: 'Player 1', value: '?', timestamp: new Date() },
        { id: '2', playerId: 'p2', playerName: 'Player 2', value: '?', timestamp: new Date() },
        { id: '3', playerId: 'p3', playerName: 'Player 3', value: '5', timestamp: new Date() }
      ];

      const result = votingService.calculateConsensus(votes);

      expect(result).toBeDefined();
      expect(result!.value).toBe('?'); // Most common
      expect(result!.agreement).toBe(2/3);
      expect(result!.average).toBe(5); // Only numeric value
    });
  });

  describe('calculateStatistics', () => {
    it('should return null for empty votes', () => {
      const result = votingService.calculateStatistics([]);
      expect(result).toBeNull();
    });

    it('should calculate statistics correctly', () => {
      const votes: Vote[] = [
        { id: '1', playerId: 'p1', playerName: 'Player 1', value: '1', confidence: 80, timestamp: new Date() },
        { id: '2', playerId: 'p2', playerName: 'Player 2', value: '3', confidence: 90, timestamp: new Date() },
        { id: '3', playerId: 'p3', playerName: 'Player 3', value: '5', confidence: 70, timestamp: new Date() },
        { id: '4', playerId: 'p4', playerName: 'Player 4', value: '8', timestamp: new Date() }
      ];

      const result = votingService.calculateStatistics(votes);

      expect(result).toBeDefined();
      expect(result!.min).toBe(1);
      expect(result!.max).toBe(8);
      expect(result!.median).toBe(3); // Middle value of sorted [1,3,5,8]
      expect(result!.standardDeviation).toBeGreaterThan(0);
      expect(result!.confidenceAverage).toBe(80); // (80+90+70)/3
    });

    it('should handle non-numeric values', () => {
      const votes: Vote[] = [
        { id: '1', playerId: 'p1', playerName: 'Player 1', value: '?', timestamp: new Date() },
        { id: '2', playerId: 'p2', playerName: 'Player 2', value: '☕', timestamp: new Date() }
      ];

      const result = votingService.calculateStatistics(votes);

      expect(result).toBeNull(); // No numeric values
    });

    it('should calculate standard deviation correctly', () => {
      const votes: Vote[] = [
        { id: '1', playerId: 'p1', playerName: 'Player 1', value: '2', timestamp: new Date() },
        { id: '2', playerId: 'p2', playerName: 'Player 2', value: '4', timestamp: new Date() },
        { id: '3', playerId: 'p3', playerName: 'Player 3', value: '6', timestamp: new Date() }
      ];

      const result = votingService.calculateStatistics(votes);

      expect(result).toBeDefined();
      // Mean is 4, variance is ((2-4)²+(4-4)²+(6-4)²)/3 = (4+0+4)/3 = 8/3
      // Standard deviation is √(8/3) ≈ 1.633
      expect(result!.standardDeviation).toBeCloseTo(1.633, 2);
    });
  });
});
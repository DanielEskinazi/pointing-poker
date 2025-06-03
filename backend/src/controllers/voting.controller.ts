import { Request, Response } from 'express';
import { VotingService } from '../services/voting.service';
import { SessionService } from '../services/session.service';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

export class VotingController {
  private votingService = new VotingService();
  private sessionService = new SessionService();

  submitVote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { storyId, value, confidence } = req.body;
      const { playerId } = req.user!;

      const result = await this.votingService.submitVote({
        sessionId,
        storyId,
        playerId,
        value,
        confidence
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          voteId: result.voteId,
          timestamp: result.timestamp
        }
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to submit vote');
    }
  };

  getVotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { storyId } = req.query;

      const votes = await this.votingService.getVotes(
        sessionId,
        storyId as string
      );

      // Hide vote values if not revealed
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      const sanitizedVotes = votes.map(v => ({
        playerId: v.playerId,
        playerName: v.playerName,
        hasVoted: true,
        value: session.cardsRevealed ? v.value : null,
        confidence: session.cardsRevealed ? v.confidence : null,
        timestamp: v.timestamp
      }));

      const response: ApiResponse = {
        success: true,
        data: {
          votes: sanitizedVotes,
          revealed: session.cardsRevealed,
          consensus: session.cardsRevealed 
            ? this.votingService.calculateConsensus(votes)
            : null
        }
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to get votes');
    }
  };

  revealCards = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const result = await this.votingService.revealCards(sessionId);
      
      const response: ApiResponse = {
        success: true,
        data: {
          votes: result.votes,
          consensus: result.consensus,
          statistics: result.statistics
        }
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to reveal cards');
    }
  };

  resetGame = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { newStory } = req.body;

      await this.votingService.resetRound(sessionId, newStory);

      const response: ApiResponse = {
        success: true,
        data: { message: 'New round started' }
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to reset game');
    }
  };

  private handleError(error: any, res: Response, defaultMessage: string): void {
    logger.error(defaultMessage, { error: error.message, stack: error.stack });
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details
      });
      return;
    }

    if (error.message === 'Invalid or completed story') {
      res.status(400).json({
        success: false,
        error: 'Cannot vote on inactive story'
      });
      return;
    }

    if (error.message === 'Voting closed - cards already revealed') {
      res.status(400).json({
        success: false,
        error: 'Voting is closed for this round'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: defaultMessage
    });
  }
}
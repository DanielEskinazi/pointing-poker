import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database';
import { 
  GetStatisticsSchema,
  ExportSessionSchema,
  GetVelocitySchema
} from '../validation/statistics.schemas';

const router = Router();

/**
 * Get session statistics
 */
router.get('/sessions/:sessionId/statistics', 
  authenticate,
  validateRequest(GetStatisticsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    
    try {
      // Verify session exists and user has access
      const session = await db.getPrisma().session.findFirst({
        where: {
          id: sessionId,
          isActive: true,
          OR: [
            { hostId: req.user?.playerId },
            { players: { some: { id: req.user?.playerId } } }
          ]
        },
        include: {
          stories: {
            include: {
              votes: true
            }
          },
          players: true
        }
      });

      if (!session) {
        res.status(404).json({ 
          success: false, 
          message: 'Session not found or access denied' 
        });
        return;
      }

      // Calculate session statistics
      const statistics = calculateSessionStatistics(session);
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * Export session data
 */
router.get('/sessions/:sessionId/export/:format',
  authenticate,
  validateRequest(ExportSessionSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId, format } = req.params;
    
    try {
      // Verify session exists and user has access (host only for exports)
      const session = await db.getPrisma().session.findFirst({
        where: {
          id: sessionId,
          hostId: req.user?.playerId, // Only hosts can export
          isActive: true
        },
        include: {
          stories: {
            include: {
              votes: {
                include: {
                  player: true
                }
              }
            }
          },
          players: true
        }
      });

      if (!session) {
        res.status(404).json({ 
          success: false, 
          message: 'Session not found or export not allowed' 
        });
        return;
      }

      // Generate export data
      const exportData = generateExportData(session, format as 'csv' | 'json' | 'pdf');
      
      // Set appropriate headers based on format
      const contentTypes = {
        csv: 'text/csv',
        json: 'application/json',
        pdf: 'application/pdf'
      } as const;
      
      const fileExtensions = {
        csv: 'csv',
        json: 'json', 
        pdf: 'pdf'
      } as const;

      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes]);
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="planning-poker-${sessionId}.${fileExtensions[format as keyof typeof fileExtensions]}"`
      );
      
      res.send(exportData);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * Get team velocity data
 */
router.get('/teams/:teamId/velocity',
  authenticate,
  validateRequest(GetVelocitySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { days = 30 } = req.query;
    
    try {
      // For now, use sessionId as teamId (in a real app, you'd have team management)
      const sessions = await db.getPrisma().session.findMany({
        where: {
          hostId: req.user?.playerId, // User's sessions
          createdAt: {
            gte: new Date(Date.now() - (days as number) * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          stories: {
            where: {
              finalEstimate: { not: null }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const velocityData = sessions.map(session => ({
        date: session.createdAt.toISOString().split('T')[0],
        sessionId: session.id,
        sessionName: session.name,
        storiesCompleted: session.stories.length,
        totalPoints: session.stories.reduce((sum: number, story: any) => {
          const points = parseFloat(story.finalEstimate || '0');
          return sum + (isNaN(points) ? 0 : points);
        }, 0)
      }));

      res.json({
        success: true,
        data: {
          period: `${days} days`,
          sessions: velocityData,
          totalSessions: sessions.length,
          totalStories: velocityData.reduce((sum: number, d: any) => sum + d.storiesCompleted, 0),
          totalPoints: velocityData.reduce((sum: number, d: any) => sum + d.totalPoints, 0),
          averageVelocity: velocityData.length > 0 
            ? velocityData.reduce((sum: number, d: any) => sum + d.totalPoints, 0) / velocityData.length 
            : 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * Calculate comprehensive session statistics
 */
function calculateSessionStatistics(session: any) {
  const stories = session.stories || [];
  const completedStories = stories.filter((s: any) => s.finalEstimate);
  const allVotes = stories.flatMap((s: any) => s.votes || []);
  
  // Basic metrics
  const totalStories = completedStories.length;
  const totalPoints = completedStories.reduce((sum: number, story: any) => {
    const points = parseFloat(story.finalEstimate || '0');
    return sum + (isNaN(points) ? 0 : points);
  }, 0);
  
  const averagePoints = totalStories > 0 ? totalPoints / totalStories : 0;
  
  // Consensus rate calculation
  const consensusCount = stories.filter((story: any) => {
    const storyVotes = story.votes || [];
    if (storyVotes.length === 0) return false;
    
    const uniqueValues = new Set(storyVotes.map((v: any) => v.value));
    return uniqueValues.size === 1;
  }).length;
  
  const consensusRate = stories.length > 0 ? (consensusCount / stories.length) * 100 : 0;
  
  // Participation statistics
  const participation = session.players.map((player: any) => {
    const playerVotes = allVotes.filter((v: any) => v.playerId === player.id);
    const numericVotes = playerVotes
      .map((v: any) => parseFloat(v.value))
      .filter((v: number) => !isNaN(v));
    
    return {
      playerId: player.id,
      playerName: player.name,
      votesCount: playerVotes.length,
      participationRate: stories.length > 0 ? (playerVotes.length / stories.length) * 100 : 0,
      averageVote: numericVotes.length > 0 
        ? numericVotes.reduce((sum: number, val: number) => sum + val, 0) / numericVotes.length 
        : 0
    };
  });
  
  // Vote distribution
  const distribution: Record<string, number> = {};
  allVotes.forEach((vote: any) => {
    const value = vote.value.toString();
    distribution[value] = (distribution[value] || 0) + 1;
  });
  
  // Complexity distribution
  const complexity = {
    'Simple (1-3)': 0,
    'Medium (5-8)': 0,
    'Complex (13+)': 0,
    'Unknown': 0
  };
  
  completedStories.forEach((story: any) => {
    const estimate = parseFloat(story.finalEstimate || '0');
    if (isNaN(estimate) || estimate === 0) {
      complexity['Unknown']++;
    } else if (estimate <= 3) {
      complexity['Simple (1-3)']++;
    } else if (estimate <= 8) {
      complexity['Medium (5-8)']++;
    } else {
      complexity['Complex (13+)']++;
    }
  });
  
  return {
    totalStories,
    totalPoints,
    averagePoints: Math.round(averagePoints * 10) / 10,
    consensusRate: Math.round(consensusRate * 10) / 10,
    velocityTrend: 0, // Would need historical data for trend calculation
    timePerStory: 300, // Default 5 minutes - would calculate from timestamps in real app
    participation,
    distribution,
    complexity,
    velocityHistory: [] // Would populate with historical session data
  };
}

/**
 * Generate export data in specified format
 */
function generateExportData(session: any, format: 'csv' | 'json' | 'pdf'): string {
  const data = {
    session: {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      hostId: session.hostId
    },
    stories: session.stories.map((story: any) => ({
      id: story.id,
      title: story.title,
      description: story.description,
      finalEstimate: story.finalEstimate,
      createdAt: story.createdAt,
      votes: story.votes.map((vote: any) => ({
        playerId: vote.playerId,
        playerName: vote.player?.name || 'Unknown',
        value: vote.value,
        createdAt: vote.createdAt
      }))
    })),
    players: session.players,
    statistics: calculateSessionStatistics(session),
    exportedAt: new Date().toISOString()
  };
  
  switch (format) {
    case 'csv':
      return generateCSV(data);
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'pdf':
      // For PDF, return JSON for now - in production you'd use a PDF library
      return JSON.stringify(data, null, 2);
    default:
      return JSON.stringify(data, null, 2);
  }
}

/**
 * Generate CSV format from session data
 */
function generateCSV(data: any) {
  const lines = [];
  
  // Session header
  lines.push('Session Summary');
  lines.push(`Session ID,${data.session.id}`);
  lines.push(`Session Name,${data.session.name}`);
  lines.push(`Created At,${new Date(data.session.createdAt).toLocaleString()}`);
  lines.push('');
  
  // Statistics
  lines.push('Statistics');
  lines.push(`Total Stories,${data.statistics.totalStories}`);
  lines.push(`Total Points,${data.statistics.totalPoints}`);
  lines.push(`Average Points,${data.statistics.averagePoints}`);
  lines.push(`Consensus Rate,${data.statistics.consensusRate}%`);
  lines.push('');
  
  // Stories header
  lines.push('Stories');
  lines.push('Title,Description,Final Estimate,Vote Count,Average Vote');
  
  // Stories data
  data.stories.forEach((story: any) => {
    const numericVotes = story.votes
      .map((v: any) => parseFloat(v.value))
      .filter((v: number) => !isNaN(v));
    const avgVote = numericVotes.length > 0 
      ? (numericVotes.reduce((sum: number, val: number) => sum + val, 0) / numericVotes.length).toFixed(1)
      : 'N/A';
    
    lines.push([
      `"${story.title}"`,
      `"${story.description || ''}"`,
      story.finalEstimate || 'N/A',
      story.votes.length,
      avgVote
    ].join(','));
  });
  
  return lines.join('\n');
}

export default router;
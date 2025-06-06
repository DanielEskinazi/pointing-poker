import type { Session, Story, Vote, Player, CardValue } from '../../types';
import type { SessionStatistics, ParticipationStats, VelocityPoint } from '../export';

export interface RealTimeStats {
  mean: number;
  median: number;
  mode: CardValue[];
  standardDeviation: number;
  consensus: boolean;
  distribution: Record<string, number>;
  outliers: number[];
  voteCount: number;
  participationRate: number;
}

export class StatisticsCalculator {
  /**
   * Calculate comprehensive session statistics
   */
  calculateSessionStats(
    session: Session,
    stories: Story[],
    votes: Record<string, Vote[]>,
    players: Player[]
  ): SessionStatistics {
    const completedStories = stories.filter(s => s.finalEstimate);
    
    return {
      totalStories: completedStories.length,
      totalPoints: this.calculateTotalPoints(completedStories),
      averagePoints: this.calculateAveragePoints(completedStories),
      consensusRate: this.calculateConsensusRate(stories, votes),
      velocityTrend: this.calculateVelocityTrend(completedStories),
      timePerStory: this.calculateTimePerStory(completedStories),
      participation: this.calculateParticipation(players, votes),
      distribution: this.calculateDistribution(stories, votes),
      complexity: this.calculateComplexityDistribution(completedStories),
      velocityHistory: this.calculateVelocityHistory(completedStories)
    };
  }

  /**
   * Calculate real-time statistics for current voting round
   */
  calculateRealTimeStats(votes: Record<string, CardValue>, totalPlayers: number): RealTimeStats {
    const voteValues = Object.values(votes);
    const numericVotes = voteValues.filter(v => typeof v === 'number') as number[];
    
    if (numericVotes.length === 0) {
      return {
        mean: 0,
        median: 0,
        mode: [],
        standardDeviation: 0,
        consensus: false,
        distribution: {},
        outliers: [],
        voteCount: voteValues.length,
        participationRate: totalPlayers > 0 ? (voteValues.length / totalPlayers) * 100 : 0
      };
    }

    const mean = this.calculateMean(numericVotes);
    const median = this.calculateMedian(numericVotes);
    const mode = this.calculateMode(voteValues);
    const standardDeviation = this.calculateStdDev(numericVotes);
    const consensus = this.checkConsensus(numericVotes);
    const distribution = this.getDistribution(voteValues);
    const outliers = this.detectOutliers(numericVotes);

    return {
      mean,
      median,
      mode,
      standardDeviation,
      consensus,
      distribution,
      outliers,
      voteCount: voteValues.length,
      participationRate: totalPlayers > 0 ? (voteValues.length / totalPlayers) * 100 : 0
    };
  }

  private calculateTotalPoints(stories: Story[]): number {
    return stories.reduce((total, story) => {
      const estimate = parseFloat(story.finalEstimate || '0');
      return total + (isNaN(estimate) ? 0 : estimate);
    }, 0);
  }

  private calculateAveragePoints(stories: Story[]): number {
    if (stories.length === 0) return 0;
    return this.calculateTotalPoints(stories) / stories.length;
  }

  private calculateConsensusRate(stories: Story[], votes: Record<string, Vote[]>): number {
    if (stories.length === 0) return 0;

    const consensusCount = stories.filter(story => {
      const storyVotes = votes[story.id] || [];
      if (storyVotes.length === 0) return false;

      const uniqueValues = new Set(storyVotes.map(v => v.value));
      return uniqueValues.size === 1;
    }).length;

    return (consensusCount / stories.length) * 100;
  }

  private calculateVelocityTrend(stories: Story[]): number {
    if (stories.length < 2) return 0;

    // Simple velocity trend: compare first half vs second half
    const midPoint = Math.floor(stories.length / 2);
    const firstHalf = stories.slice(0, midPoint);
    const secondHalf = stories.slice(midPoint);

    const firstHalfPoints = this.calculateTotalPoints(firstHalf);
    const secondHalfPoints = this.calculateTotalPoints(secondHalf);

    if (firstHalfPoints === 0) return 0;
    return ((secondHalfPoints - firstHalfPoints) / firstHalfPoints) * 100;
  }

  private calculateTimePerStory(stories: Story[]): number {
    if (stories.length === 0) return 0;

    // Estimate average time per story based on creation gaps
    const completedStories = stories
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (completedStories.length < 2) return 300; // Default 5 minutes

    let totalTime = 0;
    for (let i = 1; i < completedStories.length; i++) {
      const prevTime = new Date(completedStories[i - 1].completedAt!).getTime();
      const currTime = new Date(completedStories[i].completedAt!).getTime();
      totalTime += (currTime - prevTime) / 1000; // Convert to seconds
    }

    return totalTime / (completedStories.length - 1);
  }

  private calculateParticipation(players: Player[], votes: Record<string, Vote[]>): ParticipationStats[] {
    return players.map(player => {
      const playerVotes = Object.values(votes).flat().filter(v => v.playerId === player.id);
      const totalPossibleVotes = Object.keys(votes).length;
      
      const numericVotes = playerVotes
        .map(v => v.value)
        .filter(v => typeof v === 'number') as number[];

      const averageVote = numericVotes.length > 0
        ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length
        : 0;

      return {
        playerId: player.id,
        playerName: player.name,
        votesCount: playerVotes.length,
        participationRate: totalPossibleVotes > 0 ? (playerVotes.length / totalPossibleVotes) * 100 : 0,
        averageVote
      };
    });
  }

  private calculateDistribution(stories: Story[], votes: Record<string, Vote[]>): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    Object.values(votes).flat().forEach(vote => {
      const value = vote.value.toString();
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return distribution;
  }

  private calculateComplexityDistribution(stories: Story[]): Record<string, number> {
    const complexity: Record<string, number> = {
      'Simple (1-3)': 0,
      'Medium (5-8)': 0,
      'Complex (13+)': 0,
      'Unknown': 0
    };

    stories.forEach(story => {
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

    return complexity;
  }

  private calculateVelocityHistory(stories: Story[]): VelocityPoint[] {
    const completedStories = stories
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    const velocityPoints: VelocityPoint[] = [];
    const groupedByDate: Record<string, Story[]> = {};

    // Group stories by completion date
    completedStories.forEach(story => {
      const date = new Date(story.completedAt!).toDateString();
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(story);
    });

    // Calculate velocity for each day
    Object.entries(groupedByDate).forEach(([date, dayStories]) => {
      const velocity = this.calculateTotalPoints(dayStories);
      velocityPoints.push({
        date: new Date(date).toLocaleDateString(),
        velocity,
        storiesCompleted: dayStories.length
      });
    });

    return velocityPoints;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateMode(values: CardValue[]): CardValue[] {
    if (values.length === 0) return [];
    
    const frequency: Record<string, number> = {};
    values.forEach(value => {
      const key = value.toString();
      frequency[key] = (frequency[key] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(frequency));
    return Object.entries(frequency)
      .filter(([_, freq]) => freq === maxFreq)
      .map(([value, _]) => isNaN(Number(value)) ? value : Number(value)) as CardValue[];
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private checkConsensus(values: number[]): boolean {
    if (values.length === 0) return false;
    const median = this.calculateMedian(values);
    const tolerance = 1;
    const consensusVotes = values.filter(v => Math.abs(v - median) <= tolerance);
    return (consensusVotes.length / values.length) >= 0.8;
  }

  private getDistribution(values: CardValue[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    values.forEach(value => {
      const key = value.toString();
      distribution[key] = (distribution[key] || 0) + 1;
    });
    return distribution;
  }

  private detectOutliers(values: number[]): number[] {
    if (values.length < 4) return [];

    const q1 = this.percentile(values, 25);
    const q3 = this.percentile(values, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(v => v < lowerBound || v > upperBound);
  }

  private percentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }
}

export const statisticsCalculator = new StatisticsCalculator();
import type { Vote, CardValue } from '../types';

export interface VoteDistributionData {
  value: string;
  count: number;
  percentage: number;
  isMode: boolean;
  isMedian: boolean;
  spreadColor: string;
}

export interface VotingStatistics {
  average: number;
  median: number;
  min: number;
  max: number;
  range: number;
  spread: number;
  mode: CardValue[];
}

/**
 * Calculate comprehensive voting statistics
 */
export function calculateVotingStatistics(votes: Vote[]): VotingStatistics | null {
  if (votes.length === 0) return null;

  // Filter numeric votes for statistical calculations  
  const numericVotes = votes
    .map(v => {
      // Handle both number and string representations
      if (typeof v.value === 'number') return v.value;
      if (typeof v.value === 'string' && !isNaN(Number(v.value))) return Number(v.value);
      return null;
    })
    .filter((v): v is number => v !== null);

  if (numericVotes.length === 0) {
    // Handle non-numeric votes
    const valueCount = new Map<CardValue, number>();
    votes.forEach(vote => {
      valueCount.set(vote.value, (valueCount.get(vote.value) || 0) + 1);
    });

    const maxCount = Math.max(...valueCount.values());
    const mode = Array.from(valueCount.entries())
      .filter(([_, count]) => count === maxCount)
      .map(([value, _]) => value);

    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      range: 0,
      spread: 0,
      mode
    };
  }

  // Calculate statistics for numeric votes
  const sorted = [...numericVotes].sort((a, b) => a - b);
  const sum = numericVotes.reduce((a, b) => a + b, 0);
  const average = sum / numericVotes.length;
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const min = Math.min(...numericVotes);
  const max = Math.max(...numericVotes);
  const range = max - min;
  
  // Calculate spread (standard deviation)
  const variance = numericVotes.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / numericVotes.length;
  const spread = Math.sqrt(variance);

  // Calculate mode
  const valueCount = new Map<number, number>();
  numericVotes.forEach(vote => {
    valueCount.set(vote, (valueCount.get(vote) || 0) + 1);
  });

  const maxCount = Math.max(...valueCount.values());
  const mode = Array.from(valueCount.entries())
    .filter(([_, count]) => count === maxCount)
    .map(([value, _]) => value as CardValue);

  return {
    average,
    median,
    min,
    max,
    range,
    spread,
    mode
  };
}

/**
 * Determine color based on vote spread
 */
export function getSpreadColor(spread: number): string {
  if (spread <= 1) return '#10B981'; // green - consensus
  if (spread <= 2) return '#F59E0B'; // amber - small spread
  return '#EF4444'; // red - large spread
}

/**
 * Calculate distribution data for visualization
 */
export function calculateVoteDistribution(votes: Vote[]): VoteDistributionData[] {
  if (votes.length === 0) return [];

  const voteMap = new Map<string, number>();
  
  // Count votes
  votes.forEach(vote => {
    // Ensure consistent string representation
    const valueStr = typeof vote.value === 'string' ? vote.value : vote.value.toString();
    voteMap.set(valueStr, (voteMap.get(valueStr) || 0) + 1);
  });

  // Calculate statistics
  const stats = calculateVotingStatistics(votes);
  const maxCount = Math.max(...voteMap.values());
  
  // Build distribution data
  return Array.from(voteMap.entries())
    .sort(([a], [b]) => {
      // Sort by numeric value if possible, otherwise alphabetically
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    })
    .map(([value, count]) => {
      const percentage = Math.round((count / votes.length) * 100);
      const numericValue = Number(value);
      
      return {
        value,
        count,
        percentage,
        isMode: count === maxCount,
        isMedian: !isNaN(numericValue) && stats && numericValue === stats.median,
        spreadColor: stats ? getSpreadColor(stats.spread) : '#6B7280'
      };
    });
}

/**
 * Calculate the position of median indicator as a percentage
 */
export function calculateMedianPosition(votes: Vote[], distributionData: VoteDistributionData[]): number {
  const stats = calculateVotingStatistics(votes);
  if (!stats || distributionData.length === 0) return 0;

  const median = stats.median;
  
  // Sort distribution by numeric value
  const sortedDistribution = distributionData
    .filter(item => !isNaN(Number(item.value)))
    .sort((a, b) => Number(a.value) - Number(b.value));
  
  if (sortedDistribution.length === 0) return 0;

  // Find the position to place the median line
  let cumulativePercentage = 0;
  
  for (let i = 0; i < sortedDistribution.length; i++) {
    const currentValue = Number(sortedDistribution[i].value);
    const nextValue = i < sortedDistribution.length - 1 ? Number(sortedDistribution[i + 1].value) : null;
    
    // If median equals current value exactly
    if (currentValue === median) {
      return cumulativePercentage + (sortedDistribution[i].percentage / 2);
    }
    
    // If median falls between current and next value
    if (nextValue !== null && median > currentValue && median < nextValue) {
      // Position proportionally between the two bars
      const totalPercentage = sortedDistribution[i].percentage + sortedDistribution[i + 1].percentage;
      const medianRatio = (median - currentValue) / (nextValue - currentValue);
      return cumulativePercentage + sortedDistribution[i].percentage + (sortedDistribution[i + 1].percentage * medianRatio);
    }
    
    // If median is less than first value
    if (i === 0 && median < currentValue) {
      return 0;
    }
    
    // If median is greater than last value
    if (i === sortedDistribution.length - 1 && median > currentValue) {
      return cumulativePercentage + sortedDistribution[i].percentage;
    }
    
    cumulativePercentage += sortedDistribution[i].percentage;
  }

  return 0;
}

/**
 * Format percentage display (no decimals unless necessary)
 */
export function formatPercentage(value: number): string {
  if (value === Math.floor(value)) {
    return `${value}%`;
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Format metrics display string
 */
export function formatMetricsDisplay(stats: VotingStatistics): string {
  if (!stats) return '';
  
  const median = Number.isInteger(stats.median) ? stats.median.toString() : stats.median.toFixed(1);
  const average = stats.average.toFixed(1);
  const range = stats.range;
  const min = stats.min;
  const max = stats.max;
  
  return `Median: ${median} | Average: ${average} | Range: ${range} (${min}-${max})`;
}
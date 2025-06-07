import { motion } from 'framer-motion';
import { useGameStore } from '../store';
import type { Story, VotingHistoryData, ConsensusData, Vote } from '../types';

interface StoryVotingResultsProps {
  story: Story;
  isCurrentlyRevealing?: boolean;
}

export const StoryVotingResults = ({ story, isCurrentlyRevealing = false }: StoryVotingResultsProps) => {
  const { voting, players } = useGameStore();

  // Use current voting data if story is currently being revealed, otherwise use historical data
  const votingData: VotingHistoryData | null = isCurrentlyRevealing && story.isActive
    ? {
        votes: voting.votingResults,
        consensus: voting.consensus,
        revealedAt: new Date().toISOString()
      }
    : story.votingHistory || null;

  if (!votingData || votingData.votes.length === 0) {
    return null;
  }

  const { votes, consensus } = votingData;

  // Group votes by value for statistics
  const votesByValue = votes.reduce((acc, vote) => {
    const value = vote.value.toString();
    if (!acc[value]) {
      acc[value] = [];
    }
    acc[value].push(vote);
    return acc;
  }, {} as Record<string, Vote[]>);

  // Calculate statistics for numeric votes
  const numericVotes = votes
    .map(v => v.value)
    .filter(v => typeof v === 'number') as number[];

  const hasNumericVotes = numericVotes.length > 0;
  
  let statistics = votingData.statistics || null;
  if (hasNumericVotes && !statistics) {
    const sum = numericVotes.reduce((a, b) => a + b, 0);
    const average = sum / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...numericVotes);
    const max = Math.max(...numericVotes);

    statistics = { average, median, min, max };
  }

  const isHistorical = !isCurrentlyRevealing;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className={`p-6 border-b border-gray-200 ${
        isHistorical 
          ? 'bg-gradient-to-r from-green-50 to-blue-50' 
          : 'bg-gradient-to-r from-blue-50 to-purple-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="section-title text-gray-900 mb-2">
              {isHistorical ? 'Previous Voting Results' : 'Voting Results'}
            </h3>
            <p className="body-text text-gray-600">
              {votes.length} {votes.length === 1 ? 'vote' : 'votes'} revealed
              {story.finalEstimate && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Final: {story.finalEstimate} points
                </span>
              )}
            </p>
          </div>
          {isHistorical && (
            <div className="text-xs text-gray-500">
              Completed {new Date(story.completedAt || votingData.revealedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Individual Votes */}
        <div className="mb-6">
          <h4 className="section-title text-gray-800 mb-4">Individual Votes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {votes.map((vote) => {
              const player = players.find(p => p.id === vote.playerId);
              const playerName = player?.name || 'Unknown Player';
              
              return (
                <motion.div
                  key={vote.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 text-white rounded-full flex items-center justify-center font-medium"
                      style={{ backgroundColor: 'var(--primary-blue)' }}
                    >
                      {player?.avatar || playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{playerName}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                    {vote.value}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Vote Distribution */}
        <div className="mb-6">
          <h4 className="section-title text-gray-800 mb-4">Vote Distribution</h4>
          <div className="space-y-3">
            {Object.entries(votesByValue)
              .sort(([a], [b]) => {
                // Sort by numeric value if possible, otherwise alphabetically
                const numA = Number(a);
                const numB = Number(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                  return numA - numB;
                }
                return a.localeCompare(b);
              })
              .map(([value, valueVotes]) => {
                const percentage = (valueVotes.length / votes.length) * 100;
                
                return (
                  <div key={value} className="flex items-center gap-4">
                    <div className="w-16 text-xl font-bold text-gray-700 text-center">
                      {value}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="body-text text-gray-600">
                          {valueVotes.length} {valueVotes.length === 1 ? 'vote' : 'votes'}
                        </span>
                        <span className="body-text font-medium text-gray-700">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full"
                          style={{ backgroundColor: 'var(--primary-blue)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Consensus & Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consensus */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border">
            <h4 className="section-title text-gray-800 mb-3">
              📊 Consensus Analysis
            </h4>
            {consensus?.hasConsensus ? (
              <div>
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{ color: 'var(--success-green)' }}
                >
                  {consensus.suggestedValue} points
                </div>
                <div className="body-text" style={{ color: 'var(--success-green)' }}>
                  ✅ Team reached consensus!
                </div>
                {consensus.deviation !== undefined && (
                  <div className="text-xs text-gray-600 mt-1">
                    Low deviation: {consensus.deviation.toFixed(1)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div 
                  className="text-2xl font-bold mb-2"
                  style={{ color: 'var(--warning-amber)' }}
                >
                  No Consensus
                </div>
                <div className="body-text" style={{ color: 'var(--warning-amber)' }}>
                  ⚠️ Consider discussing the differences
                </div>
                {consensus?.averageValue && (
                  <div className="text-xs text-gray-600 mt-1">
                    Average: {consensus.averageValue.toFixed(1)} points
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border">
              <h4 className="section-title text-gray-800 mb-3">
                📈 Statistics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="body-text text-gray-600">Average:</span>
                  <span className="body-text font-medium">{statistics.average.toFixed(1)} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="body-text text-gray-600">Median:</span>
                  <span className="body-text font-medium">{statistics.median} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="body-text text-gray-600">Range:</span>
                  <span className="body-text font-medium">
                    {statistics.min} - {statistics.max} points
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
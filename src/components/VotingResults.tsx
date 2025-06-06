import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { useGameStore } from '../store';
import { useRealtimeStats } from '../hooks/useRealtimeStats';
import { VoteDistributionChart } from './charts';

export const VotingResults = () => {
  const { 
    voting, 
    players, 
    isRevealing
  } = useGameStore();
  
  const realtimeStats = useRealtimeStats();

  if (!isRevealing || !voting.isRevealed || voting.votingResults.length === 0) {
    return null;
  }

  const { votingResults, consensus } = voting;

  // Group votes by value for statistics
  const votesByValue = votingResults.reduce((acc, vote) => {
    const value = vote.value.toString();
    if (!acc[value]) {
      acc[value] = [];
    }
    acc[value].push(vote);
    return acc;
  }, {} as Record<string, typeof votingResults>);

  // Calculate statistics for numeric votes
  const numericVotes = votingResults
    .map(v => v.value)
    .filter(v => typeof v === 'number') as number[];

  const hasNumericVotes = numericVotes.length > 0;
  
  let statistics = null;
  if (hasNumericVotes) {
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Voting Results</h3>
        <p className="text-gray-600">
          {votingResults.length} {votingResults.length === 1 ? 'vote' : 'votes'} revealed
        </p>
      </div>

      <div className="p-6">
        {/* Individual Votes */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Individual Votes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {votingResults.map((vote) => {
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
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
                      {player?.avatar || playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{playerName}</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {vote.value}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Vote Distribution */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Vote Distribution</h4>
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
              .map(([value, votes]) => {
                const percentage = (votes.length / votingResults.length) * 100;
                
                return (
                  <div key={value} className="flex items-center gap-4">
                    <div className="w-16 text-xl font-bold text-gray-700 text-center">
                      {value}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          {votes.length} {votes.length === 1 ? 'vote' : 'votes'}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-blue-500 h-2 rounded-full"
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

        {/* Real-time Statistics Summary */}
        {realtimeStats && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Real-time Analysis
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{realtimeStats.mean.toFixed(1)}</div>
                <div className="text-sm text-blue-700">Average</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{realtimeStats.median}</div>
                <div className="text-sm text-green-700">Median</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{realtimeStats.standardDeviation.toFixed(1)}</div>
                <div className="text-sm text-purple-700">Std Dev</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{realtimeStats.participationRate.toFixed(0)}%</div>
                <div className="text-sm text-orange-700">Participation</div>
              </div>
            </div>
          </div>
        )}

        {/* Vote Distribution Chart */}
        {Object.keys(votesByValue).length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Vote Distribution Chart</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <VoteDistributionChart 
                data={Object.fromEntries(
                  Object.entries(votesByValue).map(([key, votes]) => [key, votes.length])
                )} 
              />
            </div>
          </div>
        )}

        {/* Consensus & Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consensus */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              {consensus?.hasConsensus ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              Consensus Analysis
            </h4>
            {consensus?.hasConsensus ? (
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {consensus.suggestedValue} points
                </div>
                <div className="text-sm text-green-700">
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
                <div className="text-2xl font-bold text-orange-600 mb-2">
                  No Consensus
                </div>
                <div className="text-sm text-orange-700">
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

          {/* Enhanced Statistics */}
          {statistics && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Vote Statistics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average:</span>
                  <span className="text-sm font-medium">{statistics.average.toFixed(1)} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Median:</span>
                  <span className="text-sm font-medium">{statistics.median} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Range:</span>
                  <span className="text-sm font-medium">
                    {statistics.min} - {statistics.max} points
                  </span>
                </div>
                {realtimeStats && realtimeStats.outliers.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Outliers:</span>
                    <span className="text-sm font-medium text-red-600">
                      {realtimeStats.outliers.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
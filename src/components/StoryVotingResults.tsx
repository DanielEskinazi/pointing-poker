import { motion } from "framer-motion";
import { useGameStore } from "../store";
import type { Story, VotingHistoryData, ConsensusData, Vote } from "../types";
import { 
  calculateVoteDistribution, 
  calculateVotingStatistics, 
  calculateMedianPosition,
  formatMetricsDisplay,
  type VoteDistributionData 
} from "../utils/votingStats";

interface StoryVotingResultsProps {
  story: Story;
  isCurrentlyRevealing?: boolean;
}

export const StoryVotingResults = ({
  story,
  isCurrentlyRevealing = false,
}: StoryVotingResultsProps) => {
  const { voting, players, resetVoting } = useGameStore();

  // Use current voting data if story is currently being revealed, otherwise use historical data
  const votingData: VotingHistoryData | null =
    isCurrentlyRevealing && story.isActive
      ? {
          votes: voting.votingResults,
          consensus: voting.consensus,
          revealedAt: new Date().toISOString(),
        }
      : story.votingHistory || null;

  if (!votingData || votingData.votes.length === 0) {
    return null;
  }

  const { votes, consensus } = votingData;

  // Calculate enhanced distribution and statistics
  const distributionData = calculateVoteDistribution(votes);
  const statistics = calculateVotingStatistics(votes) || votingData.statistics || null;
  const medianPosition = calculateMedianPosition(votes, distributionData);

  const isHistorical = !isCurrentlyRevealing;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div
        className={`p-6 border-b border-gray-200 ${
          isHistorical
            ? "bg-gradient-to-r from-green-50 to-blue-50"
            : "bg-gradient-to-r from-blue-50 to-purple-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="section-title text-gray-900 mb-2">
              {isHistorical ? "Previous Voting Results" : "Voting Results"}
            </h3>
            <p className="body-text text-gray-600">
              {votes.length} {votes.length === 1 ? "vote" : "votes"} revealed
              {story.finalEstimate && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Final: {story.finalEstimate} points
                </span>
              )}
            </p>
          </div>
          {isHistorical && (
            <div className="text-xs text-gray-500">
              Completed{" "}
              {new Date(
                story.completedAt || votingData.revealedAt
              ).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Individual Votes */}
        <div className="mb-6">
          <h4 className="section-title text-gray-800 mb-4">Individual Votes</h4>
          <div className="flex flex-col gap-0.5 max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {votes.map((vote, index) => {
              const player = players.find((p) => p.id === vote.playerId);
              const playerName = player?.name || "Unknown Player";

              return (
                <motion.div
                  key={vote.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between px-3 py-2 min-h-[48px] transition-colors duration-200 hover:bg-gray-100 ${
                    index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {player?.avatar || playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 text-sm truncate max-w-[120px] md:max-w-none">
                      {playerName}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 flex-shrink-0">
                    {vote.value}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Vote Distribution */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="section-title text-gray-800">Vote Distribution</h4>
            {statistics && (
              <div className="text-xs text-gray-600 font-mono">
                {formatMetricsDisplay(statistics)}
              </div>
            )}
          </div>
          
          <div className="relative">
            {/* Median indicator line */}
            {medianPosition >= 0 && statistics && statistics.median > 0 && (
              <div 
                className="absolute top-0 w-0.5 bg-indigo-500 z-10 rounded-full"
                style={{ 
                  left: `${medianPosition}%`,
                  height: `${distributionData.length * 48 + 16}px`,
                  transform: 'translateX(-50%)'
                }}
                title={`Median: ${statistics.median} points`}
              />
            )}
            
            <div className="space-y-2">
              {distributionData.map((item, index) => (
                <motion.div
                  key={item.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`distribution-row grid grid-cols-[40px_1fr_40px_50px] gap-3 items-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50 ${
                    item.isMode ? 'bg-indigo-100 border border-indigo-300 shadow-sm' : ''
                  }`}
                >
                  {/* Vote Value */}
                  <div className="text-xl font-bold text-gray-700 text-center">
                    {item.value}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-lg h-6 overflow-hidden">
                      <motion.div
                        className="h-full rounded-lg transition-all duration-300"
                        style={{ backgroundColor: item.spreadColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      />
                    </div>
                    {item.isMedian && (
                      <div className="absolute top-0 right-0 text-xs text-indigo-600 font-medium">
                        M
                      </div>
                    )}
                  </div>
                  
                  {/* Count */}
                  <div className="text-sm font-medium text-gray-900 text-center">
                    {item.count}
                  </div>
                  
                  {/* Percentage */}
                  <div className="text-sm font-medium text-gray-700 text-right">
                    {item.percentage}%
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Consensus</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span>Small spread</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Large spread</span>
            </div>
            {medianPosition >= 0 && statistics && statistics.median > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-indigo-500 rounded"></div>
                <span>Median</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-50 border border-indigo-200 rounded"></div>
              <span>Most common</span>
            </div>
          </div>
        </div>

        {/* Consensus & Statistics */}
        <div className="grid grid-cols-1 gap-6">
          {/* Consensus */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border">
            <h4 className="section-title text-gray-800 mb-3">
              📊 Consensus Analysis
            </h4>
            {consensus?.hasConsensus ? (
              <div>
                <div
                  className="text-3xl font-bold mb-2"
                  style={{ color: "var(--success-green)" }}
                >
                  {consensus.suggestedValue} points
                </div>
                <div
                  className="body-text"
                  style={{ color: "var(--success-green)" }}
                >
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
                  style={{ color: "var(--warning-amber)" }}
                >
                  No Consensus
                </div>
                <div
                  className="body-text"
                  style={{ color: "var(--warning-amber)" }}
                >
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
                  <span className="body-text font-medium">
                    {statistics.average.toFixed(1)} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="body-text text-gray-600">Median:</span>
                  <span className="body-text font-medium">
                    {statistics.median} points
                  </span>
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

        {/* Additional reset button outside cards for better visibility */}
        {isCurrentlyRevealing && story.isActive && !consensus?.hasConsensus && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              No consensus was reached. Would you like to vote again?
            </p>
            <button
              onClick={() => resetVoting()}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Vote Again
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

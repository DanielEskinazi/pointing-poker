import { motion } from 'framer-motion';
import { useGameStore } from '../store';

export const VotingProgress = () => {
  const { 
    players, 
    voting, 
    getVoteProgress, 
    sessionId 
  } = useGameStore();
  
  const { votedCount, totalCount } = getVoteProgress();
  const votingPlayers = players.filter(p => !p.isSpectator);
  
  if (votingPlayers.length === 0 || !sessionId) {
    return null;
  }

  const progressPercentage = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Voting Progress</h3>
        <span className="text-sm text-gray-500">
          {votedCount} of {totalCount} voted
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Player Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Players</h4>
        <div className="grid gap-2">
          {votingPlayers.map((player) => {
            const hasPlayerVoted = !!voting.votes[player.id] || !!player.selectedCard;
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  hasPlayerVoted 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    hasPlayerVoted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {hasPlayerVoted ? '✓' : player.avatar || player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{player.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasPlayerVoted ? (
                    <span className="text-sm text-green-600 font-medium">Voted</span>
                  ) : (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      Waiting
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary Message - Simple and focused */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-center"
      >
        <div className="text-sm text-gray-600">
          {votedCount === totalCount && totalCount > 0 ? (
            <span className="text-green-600 font-medium">✅ Voting complete</span>
          ) : (
            <>
              <span className="font-medium">{totalCount - votedCount}</span> 
              {totalCount - votedCount === 1 ? ' player' : ' players'} remaining
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
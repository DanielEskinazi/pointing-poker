import { motion } from "framer-motion";
import { useGameStore } from "../store";

export const VotingProgress = () => {
  const {
    players,
    voting,
    getVoteProgress,
    sessionId,
    getCurrentStory,
    isRevealing,
  } = useGameStore();

  const { votedCount, totalCount } = getVoteProgress();
  const hasActiveStory = !!getCurrentStory();

  if (players.length === 0 || !sessionId) {
    return null;
  }

  const progressPercentage =
    totalCount > 0 ? (votedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title text-gray-900">Players</h3>
        <span className="body-text text-gray-500">
          {hasActiveStory && !isRevealing
            ? `${votedCount} of ${totalCount} voted`
            : `${players.filter((p) => p.isOnline !== false).length} online`}
        </span>
      </div>

      {/* Progress Bar - only show during active voting */}
      {hasActiveStory && !isRevealing && (
        <div className="mb-6">
          <div className="flex items-center justify-between body-text text-gray-600 mb-2">
            <span>Voting Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full transition-all duration-500 ease-out"
              style={{ backgroundColor: "var(--primary-blue)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Player Status */}
      <div className="space-y-3">
        <div className="grid gap-2">
          {players.map((player) => {
            const hasPlayerVoted =
              !!voting.votes[player.id] || !!player.selectedCard;
            const isOnline = player.isOnline !== false;
            const isVotingPlayer = !player.isSpectator;
            const showVotingStatus =
              hasActiveStory && !isRevealing && isVotingPlayer;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  showVotingStatus && hasPlayerVoted
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium`}
                      style={{
                        backgroundColor:
                          showVotingStatus && hasPlayerVoted
                            ? "var(--success-green)"
                            : "#D1D5DB",
                        color:
                          showVotingStatus && hasPlayerVoted
                            ? "white"
                            : "#4B5563",
                      }}
                    >
                      {showVotingStatus && hasPlayerVoted
                        ? "✓"
                        : player.avatar || player.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Online indicator */}
                    {isOnline && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: "var(--success-green)" }}
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {player.name}
                    </span>
                    {player.isHost && (
                      <span className="text-xs text-blue-600 font-medium">
                        Host
                      </span>
                    )}
                    {player.isSpectator && (
                      <span className="text-xs text-gray-500">Spectator</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {showVotingStatus ? (
                    hasPlayerVoted ? (
                      <span
                        className="body-text font-medium"
                        style={{ color: "var(--success-green)" }}
                      >
                        Voted
                      </span>
                    ) : (
                      <div
                        className="flex items-center gap-1 body-text"
                        style={{ color: "var(--waiting-gray)" }}
                      >
                        <div
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: "var(--warning-amber)" }}
                        />
                        Waiting
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-gray-500">
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary Message - only show during voting */}
      {hasActiveStory && !isRevealing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center"
        >
          <div className="body-text text-gray-600">
            {votedCount === totalCount && totalCount > 0 ? (
              <span
                className="font-medium"
                style={{ color: "var(--success-green)" }}
              >
                ✅ Voting complete
              </span>
            ) : (
              <>
                <span className="font-medium">{totalCount - votedCount}</span>
                {totalCount - votedCount === 1 ? " player" : " players"}{" "}
                remaining
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

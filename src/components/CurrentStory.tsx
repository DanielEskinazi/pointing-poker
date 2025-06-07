import { motion } from "framer-motion";
import { useGameStore } from "../store";
import { EmptyState } from "./EmptyState";

interface CurrentStoryProps {
  hasStories?: boolean;
}

export const CurrentStory = ({
  hasStories = false,
}: CurrentStoryProps) => {
  const { 
    getCurrentStory, 
    currentStory, 
    players, 
    voting, 
    isRevealing 
  } = useGameStore();

  const activeStory = getCurrentStory();

  // Show consolidated empty state when no stories or no active story
  if (!activeStory && !currentStory) {
    return (
      <EmptyState
        icon={
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        title="Ready to start estimating?"
        description={
          hasStories
            ? "Choose a story from the sidebar to begin estimation"
            : "Create your first story to begin the planning session"
        }
        variant="subtle"
      />
    );
  }

  // Use structured story if available, otherwise fall back to string
  const storyTitle = activeStory?.title || currentStory;
  const storyDescription = activeStory?.description;
  const storyStatus = activeStory
    ? activeStory.completedAt
      ? "completed"
      : "active"
    : "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Story Information */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                storyStatus === "completed" ? "bg-green-500" : "bg-blue-500"
              }`}
            />
            <div>
              <h3 className="section-title text-gray-900">
                Current Story
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  storyStatus === "completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {storyStatus === "completed" ? "Completed" : "Voting"}
              </span>
            </div>
          </div>

          {activeStory?.finalEstimate && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {activeStory.finalEstimate}
              </div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="section-title text-gray-900 mb-1">{storyTitle}</h4>
            {storyDescription && (
              <p className="body-text text-gray-600 whitespace-pre-wrap">
                {storyDescription}
              </p>
            )}
          </div>

          {/* Interactive Voting Progress Tracker */}
          {activeStory && !isRevealing && storyStatus === "active" && (
            <div className="pt-3">
              {(() => {
                const votingPlayers = players.filter((player) => !player.isSpectator);
                const votedPlayers = votingPlayers.filter((player) => {
                  return !!voting.votes[player.id] || !!player.selectedCard;
                });
                const pendingPlayers = votingPlayers.filter((player) => {
                  return !(!!voting.votes[player.id] || !!player.selectedCard);
                });
                const votedPercentage = votingPlayers.length > 0 
                  ? (votedPlayers.length / votingPlayers.length) * 100 
                  : 0;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Voting Progress</span>
                      <span className="text-gray-500">
                        {votedPlayers.length}/{votingPlayers.length} voted
                      </span>
                    </div>
                    
                    {/* Interactive Voting Box */}
                    <div 
                      className="relative h-16 rounded-lg border-2 border-gray-200 overflow-hidden transition-all duration-500"
                      style={{
                        background: `linear-gradient(to right, 
                          var(--success-green) 0%, 
                          var(--success-green) ${votedPercentage}%, 
                          #F3F4F6 ${votedPercentage}%, 
                          #F3F4F6 100%)`
                      }}
                    >
                      {/* Voted Players (Left Side) */}
                      <div className="absolute left-0 top-0 h-full flex items-center gap-1 px-2">
                        {votedPlayers.map((player, index) => (
                          <motion.div
                            key={player.id}
                            initial={{ x: 200, scale: 0.8 }}
                            animate={{ x: 0, scale: 1 }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 150, 
                              damping: 20,
                              delay: index * 0.1 
                            }}
                            className="relative"
                          >
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium shadow-sm"
                              style={{
                                backgroundColor: "white",
                                color: "var(--success-green)",
                              }}
                              title={`${player.name} has voted`}
                            >
                              {player.avatar || player.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Checkmark overlay */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Pending Players (Right Side) */}
                      <div className="absolute right-0 top-0 h-full flex items-center gap-1 px-2">
                        {pendingPlayers.map((player, index) => (
                          <motion.div
                            key={player.id}
                            initial={{ x: 0 }}
                            animate={{ x: 0 }}
                            className="relative"
                          >
                            <div
                              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-medium"
                              style={{
                                backgroundColor: "#E5E7EB",
                                color: "#6B7280",
                              }}
                              title={`${player.name} hasn't voted yet`}
                            >
                              {player.avatar || player.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Waiting indicator */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse">
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Center divider line */}
                      {votedPlayers.length > 0 && pendingPlayers.length > 0 && (
                        <motion.div
                          className="absolute top-0 h-full w-0.5 bg-white/50"
                          initial={{ left: '50%' }}
                          animate={{ left: `${votedPercentage}%` }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                      )}

                      {/* Completion celebration */}
                      {votedPlayers.length === votingPlayers.length && votingPlayers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="text-white font-semibold text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            All votes in!
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeStory && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
              <span>
                Created {new Date(activeStory.createdAt).toLocaleDateString()}
              </span>
              {activeStory.completedAt && (
                <span>
                  Completed{" "}
                  {new Date(activeStory.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
};

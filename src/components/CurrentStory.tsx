import { motion } from 'framer-motion';
import { useGameStore } from '../store';
import { EmptyState } from './EmptyState';

interface CurrentStoryProps {
  showEstimationPrompt?: boolean;
  hasVoted?: boolean;
  isWaitingForVotes?: boolean;
}

export const CurrentStory = ({ 
  showEstimationPrompt = false, 
  hasVoted = false,
  isWaitingForVotes = false 
}: CurrentStoryProps) => {
  const { getCurrentStory, currentStory, getVoteProgress } = useGameStore();
  
  const activeStory = getCurrentStory();
  const { votedCount, totalCount } = getVoteProgress();

  // Fallback to old currentStory string if no structured story
  if (!activeStory && !currentStory) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="No story selected"
        description="Choose a story from the list or create a new one to start estimating"
        variant="default"
      />
    );
  }

  // Use structured story if available, otherwise fall back to string
  const storyTitle = activeStory?.title || currentStory;
  const storyDescription = activeStory?.description;
  const storyStatus = activeStory ? (activeStory.completedAt ? 'completed' : 'active') : 'active';

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
            <div className={`w-3 h-3 rounded-full ${
              storyStatus === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Story</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                storyStatus === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {storyStatus === 'completed' ? 'Completed' : 'Voting'}
              </span>
            </div>
          </div>
          
          {activeStory?.finalEstimate && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{activeStory.finalEstimate}</div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">{storyTitle}</h4>
            {storyDescription && (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {storyDescription}
              </p>
            )}
          </div>

          {activeStory && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
              <span>Created {new Date(activeStory.createdAt).toLocaleDateString()}</span>
              {activeStory.completedAt && (
                <span>Completed {new Date(activeStory.completedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estimation Prompt - Prominent CTA */}
      {showEstimationPrompt && storyStatus !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-lg border-2 ${
            hasVoted 
              ? 'bg-green-50 border-green-200' 
              : isWaitingForVotes
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="text-center">
            {hasVoted ? (
              <>
                <div className="text-2xl mb-2">✅</div>
                <h2 className="text-xl font-bold text-green-700 mb-2">
                  Your vote is submitted!
                </h2>
                <p className="text-green-600">
                  Waiting for {totalCount - votedCount} more {totalCount - votedCount === 1 ? 'player' : 'players'}
                </p>
              </>
            ) : isWaitingForVotes ? (
              <>
                <div className="text-2xl mb-2">🎉</div>
                <h2 className="text-xl font-bold text-yellow-700 mb-2">
                  All players have voted!
                </h2>
                <p className="text-yellow-600">
                  Ready to reveal cards
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-3">🗳️</div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">
                  Select your estimate
                </h2>
                <p className="text-lg text-blue-600 mb-4">
                  Choose a card below to submit your vote
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-blue-500">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span>Cards are below</span>
                  <motion.svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={{ y: [0, 4, 0] }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </motion.svg>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
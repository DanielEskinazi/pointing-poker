import { motion } from 'framer-motion';
import { useGameStore } from '../store';

export const CurrentStory = () => {
  const { getCurrentStory, currentStory } = useGameStore();
  
  const activeStory = getCurrentStory();

  // Fallback to old currentStory string if no structured story
  if (!activeStory && !currentStory) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300"
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Story</h3>
          <p className="text-sm text-gray-500">Create a story to start estimating</p>
        </div>
      </motion.div>
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
      className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
    >
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
    </motion.div>
  );
};
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import { useToast } from './toast';
import { getStoryErrorMessage } from '../utils/errorHandling';
import type { Story } from '../types';

interface StoryItemProps {
  story: Story;
  onSelect: (storyId: string) => void;
  onEdit?: (story: Story) => void;
  onDelete?: (storyId: string) => void;
  isActive: boolean;
}

const StoryItem = ({ story, onSelect, onEdit, onDelete, isActive }: StoryItemProps) => {
  const handleSelect = () => {
    if (!isActive) {
      onSelect(story.id);
    }
  };

  const getStatusInfo = () => {
    if (story.completedAt) {
      return {
        label: 'Complete',
        color: 'bg-green-100 text-green-800',
        icon: '✓',
        estimate: story.finalEstimate || '-'
      };
    }
    if (isActive) {
      return {
        label: 'Active',
        color: 'bg-blue-100 text-blue-800',
        icon: '🟢',
        estimate: '-'
      };
    }
    return {
      label: 'Pending',
      color: 'bg-gray-100 text-gray-800',
      icon: '⭕',
      estimate: '-'
    };
  };

  const status = getStatusInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 rounded-lg border transition-all cursor-pointer ${
        isActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={handleSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.icon}</span>
          <h4 className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
            {story.title}
          </h4>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(story);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit story"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          
          {onDelete && !story.completedAt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(story.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete story"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {story.description && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {story.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Est: {status.estimate} points</span>
        <span>#{story.orderIndex + 1}</span>
      </div>
    </motion.div>
  );
};

interface StoryListProps {
  onEdit?: (story: Story) => void;
  showManagementActions?: boolean;
}

export const StoryList = ({ onEdit, showManagementActions = true }: StoryListProps) => {
  const { 
    stories, 
    setActiveStory, 
    deleteStory, 
    setIsCreatingStory,
    getCurrentStory 
  } = useGameStore();
  const { showToast } = useToast();

  const activeStory = getCurrentStory();
  const sortedStories = [...stories].sort((a, b) => a.orderIndex - b.orderIndex);

  const handleSetActiveStory = async (storyId: string) => {
    try {
      await setActiveStory(storyId);
    } catch (error: any) {
      console.error('Error setting active story:', error);
      const errorMessage = getStoryErrorMessage(error, 'activate');
      showToast(errorMessage.title, 'error', {
        message: errorMessage.message
      });
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (window.confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      try {
        await deleteStory(storyId);
        showToast('Story deleted successfully', 'success');
      } catch (error: any) {
        console.error('Error deleting story:', error);
        const errorMessage = getStoryErrorMessage(error, 'delete');
        showToast(errorMessage.title, 'error', {
          message: errorMessage.message
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stories</h3>
          <p className="text-sm text-gray-500">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            {activeStory && ` • ${activeStory.title} is active`}
          </p>
        </div>
        
        {showManagementActions && (
          <button
            onClick={() => setIsCreatingStory(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Story
          </button>
        )}
      </div>

      <div className="p-4">
        {stories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Stories Yet</h4>
            <p className="text-gray-500 mb-4">Create your first story to start the estimation process</p>
            {showManagementActions && (
              <button
                onClick={() => setIsCreatingStory(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Story
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sortedStories.map((story) => (
                <StoryItem
                  key={story.id}
                  story={story}
                  isActive={story.id === activeStory?.id}
                  onSelect={handleSetActiveStory}
                  onEdit={showManagementActions ? onEdit : undefined}
                  onDelete={showManagementActions ? handleDeleteStory : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
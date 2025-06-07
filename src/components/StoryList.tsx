import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import { useToast } from './toast';
import { getStoryErrorMessage } from '../utils/errorHandling';
import { EmptyState } from './EmptyState';
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
        label: 'Estimated',
        color: 'bg-green-100 text-green-800',
        icon: '✓',
        estimate: story.finalEstimate || '-'
      };
    }
    if (story.votingHistory && !isActive) {
      return {
        label: 'Previously Voted',
        color: 'bg-purple-100 text-purple-800',
        icon: '📊',
        estimate: story.finalEstimate || 'See Results'
      };
    }
    if (isActive) {
      return {
        label: 'Voting Now',
        color: 'bg-blue-100 text-blue-800',
        icon: '🗳️',
        estimate: '-'
      };
    }
    return {
      label: 'Ready to Vote',
      color: 'bg-gray-100 text-gray-800',
      icon: '📝',
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
      className={`p-4 rounded-lg border transition-all cursor-pointer relative ${
        isActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={handleSelect}
    >
      {/* Story Points Badge */}
      {story.finalEstimate && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg">
            {story.finalEstimate}
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.icon}</span>
          <h4 className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
            {story.title}
          </h4>
        </div>
        
        <div className="flex items-center gap-2 mr-8">
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
        <p className="body-text text-gray-600 mb-2 line-clamp-2">
          {story.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Story #{story.orderIndex + 1}</span>
        {!story.finalEstimate && (
          <span style={{ color: 'var(--waiting-gray)' }}>Not estimated</span>
        )}
      </div>
    </motion.div>
  );
};

interface StoryListProps {
  onEdit?: (story: Story) => void;
  showManagementActions?: boolean;
  isVotingActive?: boolean;
}

export const StoryList = ({ onEdit, showManagementActions = true, isVotingActive = false }: StoryListProps) => {
  const [isExpanded, setIsExpanded] = useState(!isVotingActive);
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
    } catch (error) {
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
      } catch (error) {
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
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left flex-1 hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
        >
          <div className="flex-1">
            <h3 className="section-title text-gray-900">Stories</h3>
            {stories.length > 0 && (
              <p className="body-text text-gray-500">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                {activeStory && ` • Voting on "${activeStory.title}"`}
              </p>
            )}
          </div>
          <motion.svg 
            className="w-5 h-5 text-gray-500"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>
        
        {showManagementActions && isExpanded && (
          <button
            onClick={() => setIsCreatingStory(true)}
            className="flex items-center gap-2 px-3 py-2 text-white rounded-md transition-colors ml-2"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-blue)'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Story
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {stories.length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  title="Ready to start estimating?"
                  description="Create stories for your team to estimate together"
                  action={showManagementActions ? {
                    label: "Create First Story",
                    onClick: () => setIsCreatingStory(true)
                  } : undefined}
                  variant="subtle"
                />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
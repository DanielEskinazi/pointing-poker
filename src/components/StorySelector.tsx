import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import type { Story } from '../types';

interface StorySelectorProps {
  compact?: boolean;
}

export const StorySelector = ({ compact = false }: StorySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { stories, getCurrentStory, setActiveStory } = useGameStore();
  
  const activeStory = getCurrentStory();
  const availableStories = stories.filter(story => !story.completedAt);

  const handleSelectStory = (story: Story) => {
    setActiveStory(story.id);
    setIsOpen(false);
  };

  if (availableStories.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-700">
            {activeStory ? activeStory.title : 'Select Story'}
          </span>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10"
            >
              <div className="py-1 max-h-60 overflow-y-auto">
                {availableStories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => handleSelectStory(story)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      story.id === activeStory?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {story.id === activeStory?.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <span className="truncate">{story.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Select Active Story</h3>
        <span className="text-sm text-gray-500">
          {availableStories.length} available
        </span>
      </div>

      <div className="space-y-2">
        {availableStories.map((story) => {
          const isActive = story.id === activeStory?.id;
          
          return (
            <motion.button
              key={story.id}
              onClick={() => handleSelectStory(story)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    <h4 className={`font-medium truncate ${
                      isActive ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {story.title}
                    </h4>
                  </div>
                  
                  {story.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {story.description}
                    </p>
                  )}
                </div>
                
                <div className="ml-3 flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isActive ? 'Active' : 'Available'}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {availableStories.length === 0 && (
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No stories available for voting</p>
        </div>
      )}
    </div>
  );
};
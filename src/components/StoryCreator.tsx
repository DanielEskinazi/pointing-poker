import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';

interface StoryCreatorProps {
  onClose?: () => void;
}

export const StoryCreator = ({ onClose }: StoryCreatorProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { addStory, setIsCreatingStory } = useGameStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    addStory({
      title: title.trim(),
      description: description.trim() || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setIsCreatingStory(false);
    onClose?.();
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setIsCreatingStory(false);
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Add New Story</h3>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="story-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="story-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., US-123: User Login"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="story-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="story-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="As a user, I want to..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Story
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export const StoryCreatorModal = () => {
  const { isCreatingStory, setIsCreatingStory } = useGameStore();

  return (
    <AnimatePresence>
      {isCreatingStory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsCreatingStory(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <StoryCreator onClose={() => setIsCreatingStory(false)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';

export function StoryEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const { currentStory, setCurrentStory } = useGameStore();
  const [story, setStory] = useState(currentStory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStory(story);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Current Story</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Edit2 size={20} className="text-gray-600" />
        </button>
      </div>
      
      {isEditing ? (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter story description..."
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setStory(currentStory);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.form>
      ) : (
        <p className="text-gray-600">
          {currentStory || 'No story selected'}
        </p>
      )}
    </div>
  );
}
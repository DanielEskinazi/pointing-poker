import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import { ValidatedInput } from './forms';
import { LoadingButton } from './loading';
import { useToast } from './toast';
import { useFormValidation } from '../hooks/useFormValidation';
import { storyValidationSchema } from '../validation/schemas';

interface StoryCreatorProps {
  onClose?: () => void;
}

export const StoryCreator = ({ onClose }: StoryCreatorProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addStory, setIsCreatingStory } = useGameStore();
  const { showToast } = useToast();
  const validation = useFormValidation(storyValidationSchema);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isValid = validation.validateForm({ title, description });
    if (!isValid) {
      showToast('Please fix the errors below', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      addStory({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      showToast('Story created successfully!', 'success');

      // Reset form
      setTitle('');
      setDescription('');
      validation.clearAllErrors();
      setIsCreatingStory(false);
      onClose?.();
    } catch (error) {
      console.error('Error creating story:', error);
      showToast('Failed to create story', 'error', {
        message: 'Please try again'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    validation.clearAllErrors();
    setIsCreatingStory(false);
    onClose?.();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    validation.validateField('title', value);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    validation.validateField('description', value);
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
        <ValidatedInput
          label="Title"
          name="title"
          value={title}
          onChange={handleTitleChange}
          error={validation.getFieldError('title')}
          placeholder="e.g., US-123: User Login"
          required
        />

        <ValidatedInput
          label="Description"
          name="description"
          type="textarea"
          value={description}
          onChange={handleDescriptionChange}
          error={validation.getFieldError('description')}
          placeholder="As a user, I want to..."
          rows={3}
        />

        <div className="flex gap-3 pt-4">
          <LoadingButton
            type="button"
            onClick={handleCancel}
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            type="submit"
            disabled={!validation.isValid || !title.trim()}
            isLoading={isSubmitting}
            loadingText="Creating..."
            variant="primary"
            className="flex-1"
          >
            Add Story
          </LoadingButton>
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
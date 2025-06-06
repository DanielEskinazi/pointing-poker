import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';
import { LoadingSpinner } from './loading';
import { useToast } from './toast';
import type { CardValue } from '../types';

interface CardProps {
  value: CardValue;
  isSelected?: boolean;
  isRevealed?: boolean;
  onClick?: () => void;
  playerId?: string;
  disabled?: boolean;
}

export function Card({ value, isSelected, isRevealed, onClick, playerId, disabled }: CardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitVote, voting, getCurrentStory, stories } = useGameStore();
  const { showToast } = useToast();
  
  // Enhanced voting eligibility check
  const activeStory = getCurrentStory();
  const hasStories = stories.length > 0;
  const hasActiveStory = !!activeStory;
  const canVote = !disabled && !voting.isRevealed && !isSubmitting && playerId && hasActiveStory;
  const variants = {
    hidden: { 
      scale: 1,
      opacity: 1
    },
    revealed: { 
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  };

  const handleClick = async () => {
    // Enhanced validation before attempting to vote
    if (!playerId) {
      showToast('Unable to vote', 'error', {
        message: 'You need to join the session first'
      });
      onClick?.();
      return;
    }

    if (!canVote) {
      if (voting.isRevealed) {
        showToast('Voting is closed', 'error', {
          message: 'Cards have already been revealed for this round'
        });
      } else if (disabled) {
        showToast('Cannot vote right now', 'error', {
          message: 'Voting is currently disabled'
        });
      }
      onClick?.();
      return;
    }

    // Check if there's an active story to vote on
    const { getCurrentStory, stories } = useGameStore.getState();
    const activeStory = getCurrentStory();
    
    if (!activeStory && stories.length === 0) {
      showToast('No story to vote on', 'error', {
        message: 'Create a story first before voting'
      });
      onClick?.();
      return;
    }

    if (!activeStory && stories.length > 0) {
      showToast('No story selected', 'error', {
        message: 'Select a story from the sidebar to start voting'
      });
      onClick?.();
      return;
    }

    setIsSubmitting(true);
    try {
      await submitVote(playerId, value);
      showToast('Vote submitted!', 'success');
      onClick?.();
    } catch (error) {
      console.error('Error submitting vote:', error);
      
      // Enhanced error message handling
      let errorTitle = 'Failed to submit vote';
      let errorMessage = 'Please try again';
      
      if (error && typeof error === 'object' && 'message' in error) {
        if ((error as any).message.includes('No story available')) {
          errorTitle = 'No story to vote on';
          errorMessage = 'Create or select a story first';
        } else if ((error as any).message.includes('already revealed')) {
          errorTitle = 'Voting is closed';
          errorMessage = 'Cards have been revealed for this round';
        } else if ((error as any).message.includes('network') || (error as any).message.includes('fetch')) {
          errorTitle = 'Connection error';
          errorMessage = 'Check your internet connection and try again';
        } else if ((error as any).message.includes('Invalid vote')) {
          errorTitle = 'Invalid vote';
          errorMessage = 'This card value is not allowed';
        } else {
          errorMessage = (error as any).message;
        }
      }
      
      showToast(
        errorTitle, 
        'error',
        {
          message: errorMessage,
          action: {
            label: 'Retry',
            onClick: () => handleClick()
          }
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      whileHover={canVote ? { scale: 1.05 } : {}}
      whileTap={canVote ? { scale: 0.95 } : {}}
      initial="hidden"
      animate={isRevealed ? "revealed" : "hidden"}
      variants={variants}
      className={`
        relative w-24 h-36 rounded-xl transition-all duration-300 shadow-lg
        ${canVote 
          ? 'cursor-pointer' 
          : 'cursor-not-allowed opacity-60'
        }
        ${isSelected 
          ? 'ring-4 ring-blue-500 bg-blue-500 text-white' 
          : canVote 
            ? 'bg-white hover:bg-gray-50 hover:shadow-xl' 
            : 'bg-gray-100'
        }
        ${isSubmitting ? 'animate-pulse' : ''}
      `}
      onClick={handleClick}
    >
      <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
        {isSubmitting ? (
          <LoadingSpinner size="sm" color={isSelected ? 'white' : 'primary'} />
        ) : (
          value
        )}
      </div>
      
      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
        >
          ✓
        </motion.div>
      )}
      
      {/* Disabled overlay */}
      {!canVote && !isSubmitting && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-75 rounded-xl flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600 text-center px-2">
            {voting.isRevealed ? 'Revealed' : 
             !playerId ? 'Join Session' :
             !hasActiveStory && !hasStories ? 'Create Story' :
             !hasActiveStory ? 'Select Story' :
             disabled ? 'Disabled' : 'Cannot Vote'}
          </span>
        </div>
      )}
    </motion.div>
  );
}
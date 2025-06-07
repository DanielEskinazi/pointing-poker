import { useState, useEffect } from 'react';
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
        const errorObj = error as { message: string };
        if (errorObj.message.includes('No story available')) {
          errorTitle = 'No story to vote on';
          errorMessage = 'Create or select a story first';
        } else if (errorObj.message.includes('already revealed')) {
          errorTitle = 'Voting is closed';
          errorMessage = 'Cards have been revealed for this round';
        } else if (errorObj.message.includes('network') || errorObj.message.includes('fetch')) {
          errorTitle = 'Connection error';
          errorMessage = 'Check your internet connection and try again';
        } else if (errorObj.message.includes('Invalid vote')) {
          errorTitle = 'Invalid vote';
          errorMessage = 'This card value is not allowed';
        } else {
          errorMessage = errorObj.message;
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
  
  // Keyboard navigation support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement;
        if (target.getAttribute('data-card-value') === String(value)) {
          e.preventDefault();
          handleClick();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [value, handleClick]);

  return (
    <motion.div
      whileHover={canVote ? { scale: 1.05 } : {}}
      whileTap={canVote ? { scale: 0.95 } : {}}
      initial="hidden"
      animate={isRevealed ? "revealed" : "hidden"}
      variants={variants}
      className={`
        relative w-24 h-36 rounded-xl transition-all duration-200 shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center
        ${canVote 
          ? 'cursor-pointer' 
          : 'cursor-not-allowed'
        }
        ${isSelected 
          ? 'text-white transform scale-105 shadow-xl' 
          : canVote 
            ? 'bg-white hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1' 
            : 'bg-gray-100 opacity-50'
        }
        ${isSubmitting ? 'animate-pulse' : ''}
      `}
      style={{
        backgroundColor: isSelected ? 'var(--primary-blue)' : undefined,
        borderColor: isSelected ? 'var(--primary-blue)' : canVote ? '#E5E7EB' : '#E5E7EB',
        borderWidth: '2px',
        borderStyle: 'solid'
      }}
      onClick={handleClick}
      role="button"
      aria-label={`Vote ${value} story points`}
      aria-pressed={isSelected}
      aria-disabled={!canVote}
      tabIndex={!canVote ? -1 : 0}
      data-card-value={value}
    >
      <div className="card-value">
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
      
      {/* Disabled overlay - removed to clean up UI, disabled state shown through styling */}
    </motion.div>
  );
}
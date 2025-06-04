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
  const { submitVote, voting, getCurrentStory } = useGameStore();
  const { showToast } = useToast();
  
  const currentStory = getCurrentStory();
  const canVote = !disabled && !voting.isRevealed && !isSubmitting;
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
    if (!canVote || !playerId) {
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
      showToast(
        'Failed to submit vote', 
        'error',
        {
          message: 'Please try again',
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
        <div className="absolute inset-0 bg-gray-200 bg-opacity-50 rounded-xl flex items-center justify-center">
          {voting.isRevealed && (
            <span className="text-xs font-medium text-gray-600">Revealed</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';

interface HostControlsProps {
  currentPlayerId?: string;
  isHost?: boolean;
}

export const HostControls = ({ currentPlayerId, isHost = true }: HostControlsProps) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const { 
    voting, 
    isRevealing: cardsRevealed,
    revealVotes, 
    resetVoting, 
    getVoteProgress,
    setIsCreatingStory
  } = useGameStore();

  const { votedCount, totalCount } = getVoteProgress();
  const canReveal = votedCount > 0 && !cardsRevealed;
  const canReset = cardsRevealed || votedCount > 0;

  // Don't show host controls if not host
  if (!isHost) {
    return null;
  }

  const handleReveal = async () => {
    if (!canReveal || isRevealing) return;
    
    setIsRevealing(true);
    try {
      await revealVotes();
    } catch (error) {
      console.error('Error revealing votes:', error);
      // Could add toast notification here
    } finally {
      setIsRevealing(false);
    }
  };

  const handleReset = async () => {
    if (!canReset || isResetting) return;
    
    setIsResetting(true);
    try {
      await resetVoting();
    } catch (error) {
      console.error('Error resetting voting:', error);
      // Could add toast notification here
    } finally {
      setIsResetting(false);
    }
  };

  const handleNewStory = () => {
    setIsCreatingStory(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Host Controls</h3>
        <span className="text-sm text-gray-500">
          You are the session host
        </span>
      </div>

      {/* Voting Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Voting Status</span>
          <span className="text-sm text-gray-600">
            {votedCount} / {totalCount} votes
          </span>
        </div>
        
        {cardsRevealed ? (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Cards Revealed</span>
          </div>
        ) : votedCount === totalCount && totalCount > 0 ? (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Ready to reveal</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Waiting for votes</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Reveal Cards Button */}
        <motion.button
          whileHover={canReveal ? { scale: 1.02 } : {}}
          whileTap={canReveal ? { scale: 0.98 } : {}}
          onClick={handleReveal}
          disabled={!canReveal || isRevealing}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
            canReveal
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isRevealing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Revealing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Reveal Cards
              {votedCount < totalCount && ` (${votedCount}/${totalCount})`}
            </>
          )}
        </motion.button>

        {/* Reset Voting Button */}
        <motion.button
          whileHover={canReset ? { scale: 1.02 } : {}}
          whileTap={canReset ? { scale: 0.98 } : {}}
          onClick={handleReset}
          disabled={!canReset || isResetting}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
            canReset
              ? 'bg-gray-600 hover:bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isResetting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Voting
            </>
          )}
        </motion.button>

        {/* New Story Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewStory}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Story
        </motion.button>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-blue-700">
          <div className="font-medium mb-1">💡 Tip:</div>
          {cardsRevealed ? (
            <p>Review the results, discuss if needed, then reset to start the next round.</p>
          ) : votedCount === totalCount && totalCount > 0 ? (
            <p>All players have voted! Click "Reveal Cards" to show the results.</p>
          ) : (
            <p>Wait for players to vote, or reveal cards early if you have enough votes.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
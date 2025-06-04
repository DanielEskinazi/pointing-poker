import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';
import { LoadingButton } from './loading';
import { useToast } from './toast';
import type { Player } from '../types';

interface HostControlsProps {
  currentPlayerId?: string;
  isHost?: boolean;
  players?: Player[];
  onRemovePlayer?: (playerId: string) => void;
  onPromotePlayer?: (playerId: string) => void;
  onToggleSpectator?: (playerId: string) => void;
}

export const HostControls = ({ 
  currentPlayerId, 
  isHost = false, 
  players = [],
  onRemovePlayer,
  onPromotePlayer,
  onToggleSpectator
}: HostControlsProps) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  const { 
    isRevealing: cardsRevealed,
    revealVotes, 
    resetVoting, 
    getVoteProgress,
    setIsCreatingStory
  } = useGameStore();
  
  const { showToast } = useToast();

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
      showToast('Cards revealed!', 'info');
    } catch (error) {
      console.error('Error revealing votes:', error);
      showToast('Failed to reveal cards', 'error', {
        message: 'Please try again',
        action: {
          label: 'Retry',
          onClick: handleReveal
        }
      });
    } finally {
      setIsRevealing(false);
    }
  };

  const handleReset = async () => {
    if (!canReset || isResetting) return;
    
    setIsResetting(true);
    try {
      await resetVoting();
      showToast('Voting reset', 'info');
    } catch (error) {
      console.error('Error resetting voting:', error);
      showToast('Failed to reset voting', 'error', {
        message: 'Please try again',
        action: {
          label: 'Retry',
          onClick: handleReset
        }
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleNewStory = () => {
    setIsCreatingStory(true);
  };

  const handlePlayerAction = (action: string, playerId: string) => {
    switch (action) {
      case 'remove':
        onRemovePlayer?.(playerId);
        break;
      case 'promote':
        onPromotePlayer?.(playerId);
        break;
      case 'spectator':
        onToggleSpectator?.(playerId);
        break;
    }
    setSelectedPlayer(null);
  };

  const otherPlayers = players.filter(p => p.id !== currentPlayerId);

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
        <LoadingButton
          onClick={handleReveal}
          disabled={!canReveal}
          isLoading={isRevealing}
          loadingText="Revealing..."
          className="w-full"
          variant={canReveal ? "primary" : "secondary"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Reveal Cards
          {votedCount < totalCount && ` (${votedCount}/${totalCount})`}
        </LoadingButton>

        {/* Reset Voting Button */}
        <LoadingButton
          onClick={handleReset}
          disabled={!canReset}
          isLoading={isResetting}
          loadingText="Resetting..."
          className="w-full"
          variant="secondary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Voting
        </LoadingButton>

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

      {/* Player Management */}
      {isHost && otherPlayers.length > 0 && (
        <div className="border-t pt-4 mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Player Management</h4>
          
          {!selectedPlayer ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">Select a player to manage:</div>
              {otherPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{player.avatar}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{player.name}</span>
                          {player.isHost && <span className="text-xs">👑</span>}
                          {player.isSpectator && <span className="text-xs">👁️</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.votedInCurrentRound ? 'Has voted ✅' : 'Not voted ⏳'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        player.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-gray-500">
                        {player.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">{selectedPlayer.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{selectedPlayer.name}</span>
                      {selectedPlayer.isHost && <span className="text-xs">👑</span>}
                      {selectedPlayer.isSpectator && <span className="text-xs">👁️</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedPlayer.isOnline ? 'Online' : 'Offline'} • 
                      {selectedPlayer.isSpectator ? ' Spectator' : ' Voter'} • 
                      {selectedPlayer.votedInCurrentRound ? ' Has voted' : ' Not voted'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {!selectedPlayer.isHost && (
                  <button
                    onClick={() => handlePlayerAction('promote', selectedPlayer.id)}
                    className="py-2 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    👑 Make Host
                  </button>
                )}
                
                <button
                  onClick={() => handlePlayerAction('spectator', selectedPlayer.id)}
                  className="py-2 px-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  {selectedPlayer.isSpectator ? '🗳️ Make Voter' : '👁️ Make Spectator'}
                </button>
                
                {!selectedPlayer.isHost && (
                  <button
                    onClick={() => handlePlayerAction('remove', selectedPlayer.id)}
                    className="py-2 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    ❌ Remove
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="py-2 px-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
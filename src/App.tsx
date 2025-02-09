import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { Card } from './components/Card';
import { PlayerAvatar } from './components/PlayerAvatar';
import { Timer } from './components/Timer';
import { JoinGame } from './components/JoinGame';
import { GameConfig } from './components/GameConfig';
import { SessionManager } from './components/SessionManager';
import { StoryEditor } from './components/StoryEditor';
import { useGameStore } from './store';
import type { CardValue } from './types';

export default function App() {
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const { players, isRevealing, timer, cardValues, isConfigured, selectCard, revealCards, resetGame, sessionId, joinSession } = useGameStore();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);

  const currentPlayer = players.find(p => p.id === playerId);
  const shareUrl = sessionId ? `${window.location.origin}?session=${sessionId}` : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Planning Poker Session',
          text: 'Join my Planning Poker session!',
          url: shareUrl
        });
      } catch (err) {
        navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    // Check for session ID in URL
    const params = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = params.get('session');
    if (sessionIdFromUrl && !sessionId) {
      joinSession(sessionIdFromUrl);
    }
  }, []);

  const handleCardSelect = (value: CardValue) => {
    if (playerId && !isRevealing) {
      setSelectedCard(value);
      selectCard(playerId, value);
    }
  };

  const handleReveal = () => {
    if (!isRevealing) {
      revealCards();
      setTimerKey(prev => prev + 1);
    }
  };

  const handleReset = () => {
    resetGame();
    setSelectedCard(null);
    setTimerKey(prev => prev + 1);
  };

  useEffect(() => {
    const lastPlayer = players[players.length - 1];
    if (lastPlayer && !playerId) {
      setPlayerId(lastPlayer.id);
    }
  }, [players, playerId]);

  if (!isConfigured) {
    return <GameConfig />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-gray-800">Planning Poker</h1>
            {sessionId && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Share2 size={20} />
                Share Session
              </button>
            )}
          </div>
          {currentPlayer && !isRevealing && (
            <Timer 
              key={timerKey}
              duration={timer} 
              onComplete={handleReveal} 
            />
          )}
        </div>

        {!currentPlayer && <JoinGame />}

        <StoryEditor />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
          {players.map((player) => (
            <PlayerAvatar key={player.id} player={player} />
          ))}
        </div>

        {currentPlayer && (
          <motion.div 
            className="grid grid-cols-4 md:grid-cols-8 gap-4"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            initial="hidden"
            animate="show"
          >
            {cardValues.map((value) => (
              <Card
                key={value}
                value={value}
                isSelected={selectedCard === value}
                isRevealed={isRevealing}
                onClick={() => handleCardSelect(value)}
              />
            ))}
          </motion.div>
        )}

        <div className="flex justify-center mt-8 gap-4">
          {!isRevealing && (
            <button
              onClick={handleReveal}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Reveal Cards
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            New Round
          </button>
        </div>
      </div>
    </div>
  );
}
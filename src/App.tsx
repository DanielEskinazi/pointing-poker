import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { Card } from './components/Card';
import { PlayerAvatar } from './components/PlayerAvatar';
import { Timer } from './components/Timer';
import { JoinGame } from './components/JoinGame';
import { GameConfig } from './components/GameConfig';
import { StoryEditor } from './components/StoryEditor';
import { ConnectionStatus } from './components/ConnectionStatus';
import { RecoveryScreen, ErrorScreen } from './components/RecoveryScreen';
import { ApiError } from './components/ApiError';
import { useGameStore } from './store';
import { useWebSocket } from './hooks/useWebSocket';
import { useSessionRecovery } from './hooks/useSessionRecovery';
import { useSession } from './hooks/api/useSession';
import { authActions } from './store/actions/auth';
import { ClientEvents } from './types/websocket';
import type { CardValue } from './types';

export default function App() {
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const { 
    players, 
    isRevealing, 
    timer, 
    cardValues, 
    isConfigured, 
    selectCard, 
    revealCards, 
    resetGame, 
    sessionId, 
    joinSession,
    setCardValues,
    setIsConfigured,
    syncState
  } = useGameStore();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // Session recovery
  const { recovering, error } = useSessionRecovery();
  
  // Fetch session data from API
  const { data: sessionData, isLoading: isSessionLoading, error: sessionError } = useSession(sessionId || '');
  
  // Initialize WebSocket connection with playerId
  const { connected, emit } = useWebSocket(playerId);

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
      } catch {
        navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    // Initialize cleanup on app start
    authActions.initCleanup();
    
    // Check for session ID in URL
    const params = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = params.get('session');
    if (sessionIdFromUrl && !sessionId) {
      setIsLoadingSession(true);
      joinSession(sessionIdFromUrl);
    }
  }, [sessionId, joinSession]);

  // Sync session data from API
  useEffect(() => {
    if (sessionData && sessionId) {
      // sessionData is already the session object (not wrapped in .data)
      const session = sessionData;
      
      // Set card values from session config
      if (session.config?.cardValues && session.config.cardValues.length > 0) {
        const values = session.config.cardValues.map((v: string) => 
          isNaN(Number(v)) ? v : Number(v)
        ) as CardValue[];
        setCardValues(values);
        setIsConfigured(true);
      }
      
      // Sync players from session
      if (session.players) {
        syncState({
          players: session.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            selectedCard: null,
            isSpectator: p.isSpectator
          }))
        });
      }
      
      setIsLoadingSession(false);
    }
  }, [sessionData, sessionId, setCardValues, setIsConfigured, syncState]);

  const handleCardSelect = (value: CardValue) => {
    if (playerId && !isRevealing && sessionId) {
      setSelectedCard(value);
      // Update local state immediately for responsiveness
      selectCard(playerId, value);
      
      // Emit to server if connected
      if (connected) {
        emit(ClientEvents.VOTE_SUBMIT, {
          storyId: sessionId, // Using sessionId as storyId for now
          value: value?.toString() || '',
          confidence: 1
        });
      }
    }
  };

  const handleReveal = () => {
    if (!isRevealing && sessionId) {
      // Update local state immediately
      revealCards();
      setTimerKey(prev => prev + 1);
      
      // Emit to server if connected
      if (connected) {
        emit(ClientEvents.CARDS_REVEAL, {
          storyId: sessionId // Using sessionId as storyId for now
        });
      }
    }
  };

  const handleReset = () => {
    if (sessionId) {
      // Update local state immediately
      resetGame();
      setSelectedCard(null);
      setTimerKey(prev => prev + 1);
      
      // Emit to server if connected
      if (connected) {
        emit(ClientEvents.GAME_RESET, {
          storyId: sessionId // Using sessionId as storyId for now
        });
      }
    }
  };

  useEffect(() => {
    // Get the current player ID from localStorage if available
    const storedPlayerId = localStorage.getItem(`player_${sessionId}`);
    console.log('Checking player ID for session:', sessionId, 'stored:', storedPlayerId);
    if (storedPlayerId && sessionId) {
      console.log('Setting stored player ID:', storedPlayerId);
      setPlayerId(storedPlayerId);
    } else if (sessionId) {
      console.log('No stored player ID, ensuring null for join form');
      // Ensure playerId is null so join form shows
      setPlayerId(null);
    }
  }, [sessionId]);

  // Show recovery screen while restoring session
  if (recovering || isLoadingSession || isSessionLoading) {
    return <RecoveryScreen />;
  }
  
  // Show error screen if recovery failed
  if (error) {
    return <ErrorScreen message={error} />;
  }
  
  // Show error if session fetch failed
  if (sessionError) {
    return <ApiError error={sessionError} />;
  }

  // Show config only if we don't have a session or it's not configured
  if (!isConfigured && !sessionId) {
    return <GameConfig />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <ConnectionStatus />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-gray-800">Planning Poker</h1>
            {sessionId && (
              <>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Share2 size={20} />
                  Share Session
                </button>
                <button
                  onClick={authActions.logout}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Leave Session
                </button>
              </>
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

        {sessionId && !playerId && <JoinGame sessionId={sessionId} onJoin={setPlayerId} />}
        
        {currentPlayer && sessionId && (
          <div className="text-center mb-4">
            <button
              onClick={() => {
                // Clear current player to allow joining as different player
                localStorage.removeItem(`player_${sessionId}`);
                setPlayerId(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Join as Different Player
            </button>
          </div>
        )}

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
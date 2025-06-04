import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { Card } from "./components/Card";
import { PlayerAvatar } from "./components/PlayerAvatar";
import { Timer } from "./components/Timer";
import { JoinGame } from "./components/JoinGame";
import { GameConfig } from "./components/GameConfig";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { RecoveryScreen, ErrorScreen } from "./components/RecoveryScreen";
import { ApiError } from "./components/ApiError";
import { CurrentStory } from "./components/CurrentStory";
import {
  ErrorBoundary,
  SessionErrorBoundary,
  VotingErrorBoundary,
} from "./components/errors";
import { ToastProvider } from "./components/toast";
import { StoryList } from "./components/StoryList";
import { StoryCreatorModal } from "./components/StoryCreator";
import { VotingProgress } from "./components/VotingProgress";
import { VotingResults } from "./components/VotingResults";
import { HostControls } from "./components/HostControls";
import { useGameStore } from "./store";
import { useWebSocket } from "./hooks/useWebSocket";
import { useSessionRecovery } from "./hooks/useSessionRecovery";
import { useSession } from "./hooks/api/useSession";
import { authActions } from "./store/actions/auth";
import { ClientEvents } from "./types/websocket";
import type { CardValue } from "./types";

export default function App() {
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const {
    players,
    isRevealing,
    timer,
    cardValues,
    isConfigured,
    revealCards,
    sessionId,
    joinSession,
    setCardValues,
    setIsConfigured,
    syncState,
    isCurrentUserHost,
  } = useGameStore();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // Generate unique tab ID to allow multiple tabs with different players
  const [tabId] = useState(() => crypto.randomUUID());

  // Session recovery
  const { recovering, error } = useSessionRecovery();

  // Fetch session data from API
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useSession(sessionId || "");

  // Initialize WebSocket connection with playerId
  const { connected, emit } = useWebSocket(playerId);

  // Ensure consistent player identification across tabs and re-renders
  const currentPlayer = useMemo(() => {
    return playerId ? players.find((p) => p.id === playerId) || null : null;
  }, [players, playerId]);
  const shareUrl = sessionId
    ? `${window.location.origin}?session=${sessionId}`
    : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Planning Poker Session",
          text: "Join my Planning Poker session!",
          url: shareUrl,
        });
      } catch {
        navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  useEffect(() => {
    // Initialize cleanup on app start
    authActions.initCleanup();

    // Check for session ID in URL
    const params = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = params.get("session");
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
          players: session.players.map(
            (p: {
              id: string;
              name: string;
              avatar: string;
              isSpectator?: boolean;
            }) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              selectedCard: null,
              isSpectator: p.isSpectator,
              isHost: session.hostId === p.id,
            })
          ),
        });
      }

      setIsLoadingSession(false);
    }
  }, [sessionData, sessionId, setCardValues, setIsConfigured, syncState]);

  const handleCardSelect = (value: CardValue) => {
    // Just update selected card state for UI feedback
    // Actual voting is handled by the Card component's submitVote call
    setSelectedCard(value);
  };

  const handleReveal = () => {
    if (!isRevealing && sessionId) {
      // Update local state immediately
      revealCards();
      setTimerKey((prev) => prev + 1);

      // Emit to server if connected
      if (connected) {
        emit(ClientEvents.CARDS_REVEAL, {
          storyId: sessionId, // Using sessionId as storyId for now
        });
      }
    }
  };


  useEffect(() => {
    // Get the current player ID from localStorage if available
    // Use tab-specific key to allow multiple tabs with different players
    const playerKey = `player_${sessionId}_${tabId}`;
    const storedPlayerId = localStorage.getItem(playerKey);
    console.log(
      "Checking player ID for session:",
      sessionId,
      "tab:",
      tabId,
      "stored:",
      storedPlayerId
    );
    if (storedPlayerId && sessionId) {
      console.log("Setting stored player ID:", storedPlayerId);
      setPlayerId(storedPlayerId);
    } else if (sessionId) {
      console.log("No stored player ID, ensuring null for join form");
      // Ensure playerId is null so join form shows
      setPlayerId(null);
    }
  }, [sessionId, tabId]);

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
    return <GameConfig tabId={tabId} />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
          <ConnectionStatus />
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-gray-800">
                  Planning Poker
                </h1>
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

            {/* Show join form when we have a session but no current player */}
            {sessionId && !currentPlayer && (
              <JoinGame sessionId={sessionId} tabId={tabId} onJoin={setPlayerId} />
            )}

            {/* Show "Join as Different Player" option when we have an active player */}
            {currentPlayer && sessionId && (
              <div className="text-center mb-4">
                <button
                  onClick={() => {
                    // Notify server that this player is leaving the session
                    if (connected && sessionId) {
                      emit(ClientEvents.SESSION_LEAVE, { sessionId });
                    }
                    
                    // Clear current player to allow joining as different player
                    // Use tab-specific key for proper isolation
                    const playerKey = `player_${sessionId}_${tabId}`;
                    localStorage.removeItem(playerKey);
                    setPlayerId(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Join as Different Player
                </button>
              </div>
            )}

            {/* Story Management Section */}
            {currentPlayer && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                  <CurrentStory />
                </div>
                <div>
                  <StoryList />
                </div>
              </div>
            )}

            {/* Voting Section */}
            {currentPlayer && (
              <SessionErrorBoundary sessionId={sessionId}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  <div className="lg:col-span-2">
                    <VotingErrorBoundary>
                      {isRevealing ? <VotingResults /> : <VotingProgress />}
                    </VotingErrorBoundary>
                  </div>
                  <div>
                    <HostControls
                      currentPlayerId={playerId}
                      isHost={isCurrentUserHost()}
                    />
                  </div>
                </div>
              </SessionErrorBoundary>
            )}

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
                      staggerChildren: 0.1,
                    },
                  },
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
                    playerId={playerId}
                    onClick={() => handleCardSelect(value)}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Story Creator Modal */}
          <StoryCreatorModal />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

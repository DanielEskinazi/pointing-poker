import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { HiShare } from "react-icons/hi2";
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
import { StoryVotingResults } from "./components/StoryVotingResults";
import { HostControls } from "./components/HostControls";
import { useGameStore } from "./store";
import { useWebSocket } from "./hooks/useWebSocket";
import { useSessionRecovery } from "./hooks/useSessionRecovery";
import { useSession } from "./hooks/api/useSession";
import { authActions } from "./store/actions/auth";
import { ClientEvents } from "./types/websocket";
import { apiClient } from "./services/api/client";
import { authTokenManager } from "./services/auth/tokenManager";
import type { CardValue } from "./types";

export default function App() {
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [userVotedCard, setUserVotedCard] = useState<CardValue | null>(null);
  const [hasUserVoted, setHasUserVoted] = useState(false);
  
  // Use ref for immediate vote tracking without waiting for state updates
  const votedCardRef = useRef<CardValue | null>(null);
  const hasVotedRef = useRef<boolean>(false);
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
    getVoteProgress,
    voting,
    stories,
    getCurrentStory,
    getCurrentPlayerId,
  } = useGameStore();
  // Use store's getCurrentPlayerId() instead of local state to ensure consistency
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
  const currentPlayerId = getCurrentPlayerId();
  const { connected, emit } = useWebSocket(currentPlayerId);

  // Ensure consistent player identification across tabs and re-renders
  const currentPlayer = useMemo(() => {
    return currentPlayerId ? players.find((p) => p.id === currentPlayerId) || null : null;
  }, [players, currentPlayerId]);

  // Calculate voting states for UI
  const { hasVoted } = getVoteProgress();
  const currentPlayerVoted =
    hasVoted || (currentPlayer && voting.votes[currentPlayer.id]);
  const hasActiveStory = !!getCurrentStory();
  
  // Debug logging for card selection
  useEffect(() => {
    console.log('🎯 Card Selection Debug:', {
      currentPlayerId,
      currentPlayer: currentPlayer ? { id: currentPlayer.id, name: currentPlayer.name } : null,
      selectedCard,
      userVotedCard, 
      hasUserVoted,
      votedCardRef: votedCardRef.current,
      hasVotedRef: hasVotedRef.current,
      votingVotes: voting.votes,
      hasVotedCheck: hasVoted,
      currentPlayerVoted,
    });
  }, [currentPlayerId, currentPlayer, selectedCard, userVotedCard, hasUserVoted, voting.votes, hasVoted, currentPlayerVoted]);
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
    // Set session context for API client and token manager
    if (sessionId) {
      apiClient.setSessionContext(sessionId);
      authTokenManager.setSessionContext(sessionId);
    }

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
        console.log('🃏 Session card values raw:', session.config.cardValues);
        const values = session.config.cardValues.map((v: string) => {
          const converted = isNaN(Number(v)) ? v : Number(v);
          console.log(`Converting "${v}" → ${converted} (${typeof converted})`);
          return converted;
        }) as CardValue[];
        console.log('🃏 Final card values:', values);
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
    console.log('🎯 handleCardSelect called with value:', value);
    // Update selected card state for immediate UI feedback
    setSelectedCard(value);
    
    // Also set as user's voted card (will be confirmed after successful vote submission)
    setUserVotedCard(value);
    votedCardRef.current = value; // Set ref immediately
    console.log('🎯 Set userVotedCard and votedCardRef to:', value);
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

  // Player ID is now managed by the store's getCurrentPlayerId() method

  // Reset selected card when active story changes
  const activeStoryId = getCurrentStory()?.id;
  useEffect(() => {
    // Reset all card selection state when story changes
    setSelectedCard(null);
    setUserVotedCard(null);
    setHasUserVoted(false);
    // Reset refs too
    votedCardRef.current = null;
    hasVotedRef.current = false;
  }, [activeStoryId]); // Only reset when story ID changes, NOT when selectedCard changes
  
  // Also reset when cards are revealed or reset
  useEffect(() => {
    if (!isRevealing) {
      // When voting round ends (cards reset), clear the selection
      setUserVotedCard(null);
      setHasUserVoted(false);
      setSelectedCard(null);
      // Reset refs too
      votedCardRef.current = null;
      hasVotedRef.current = false;
    }
  }, [isRevealing]);

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
                <h1 className="page-title text-gray-800">
                  Planning Poker
                </h1>
                {sessionId && (
                  <>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <HiShare size={20} />
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
              <JoinGame
                sessionId={sessionId}
                tabId={tabId}
                onJoin={() => {}} // Player ID is now managed by store
              />
            )}

            {/* Integrated Story & Estimation Section */}
            {currentPlayer && (
              <SessionErrorBoundary sessionId={sessionId}>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                  {/* Main estimation workflow - takes up more space */}
                  <div className="lg:col-span-3">
                    <div className="space-y-4">
                      {/* Current Story Information */}
                      <CurrentStory hasStories={stories.length > 0} />

                      {/* Voting Cards - only show when there are stories and story is not completed */}
                      {(() => {
                        const currentStory = getCurrentStory();
                        const isStoryCompleted = currentStory && (currentStory.votingHistory || currentStory.completedAt);
                        return hasActiveStory && !isRevealing && !isStoryCompleted;
                      })() && (
                        <motion.div
                          className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="section-title text-gray-900">
                              Select Your Estimate
                            </h3>
                            {currentPlayerVoted && (
                              <div className="flex items-center gap-2 text-green-600">
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-sm font-medium">
                                  Vote Submitted
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Cards Grid */}
                          <motion.div
                            className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
                            variants={{
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.05,
                                },
                              },
                            }}
                            initial="hidden"
                            animate="show"
                          >
                            {cardValues.map((value) => {
                              // Simple selection logic using both state and refs for immediate feedback
                              const isSelected = 
                                selectedCard === value || 
                                (userVotedCard === value && hasUserVoted) ||
                                (votedCardRef.current === value && hasVotedRef.current);
                              
                              return (
                                <motion.div
                                  key={value}
                                  variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    show: { opacity: 1, y: 0 },
                                  }}
                                >
                                  <Card
                                    value={value}
                                    isSelected={isSelected}
                                    isRevealed={isRevealing}
                                    playerId={currentPlayerId || undefined}
                                    onClick={() => handleCardSelect(value)}
                                    onVoteSuccess={() => {
                                      console.log('✅ Vote success callback called! Setting hasUserVoted to true');
                                      console.log('✅ Current userVotedCard before setting hasUserVoted:', userVotedCard);
                                      console.log('✅ Current votedCardRef:', votedCardRef.current);
                                      setHasUserVoted(true);
                                      hasVotedRef.current = true; // Set ref immediately
                                      console.log('✅ hasUserVoted should now be true, refs set');
                                    }}
                                  />
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </motion.div>
                      )}

                      {/* Voting Results - show for current reveals or historical results */}
                      {(() => {
                        const currentStory = getCurrentStory();
                        const showCurrentResults = isRevealing && currentStory;
                        const showHistoricalResults = currentStory && !isRevealing && 
                          (currentStory.votingHistory || currentStory.completedAt);
                        
                        if (showCurrentResults || showHistoricalResults) {
                          return (
                            <VotingErrorBoundary>
                              <StoryVotingResults 
                                story={currentStory} 
                                isCurrentlyRevealing={isRevealing}
                              />
                            </VotingErrorBoundary>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Side panel for story management and controls */}
                  <div className="space-y-6">
                    <StoryList
                      isVotingActive={hasActiveStory && !isRevealing}
                    />
                    <HostControls
                      currentPlayerId={currentPlayerId || undefined}
                      isHost={isCurrentUserHost()}
                    />
                    <VotingErrorBoundary>
                      <VotingProgress />
                    </VotingErrorBoundary>
                  </div>
                </div>
              </SessionErrorBoundary>
            )}
          </div>

          {/* Story Creator Modal */}
          <StoryCreatorModal />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

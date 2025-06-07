import { create } from 'zustand';
import type { CardValue, GameState, Player, Story, CreateStoryDto, UpdateStoryDto, VotingFlowState, ConsensusData, Vote, TimerState, TimerConfiguration, VotingHistoryData } from './types';
import type { 
  ConnectionStatus, 
  PlayerJoinedData, 
  PlayerLeftData, 
  PlayerUpdatedData,
  VoteSubmittedData,
  CardsRevealedData,
  StoryUpdatedData,
  StoryInfo,
  TimerUpdatedData,
  SessionStateData
} from './types/websocket';
import { persist, clearPersistedState } from './store/middleware/persistence';
import { votingApi } from './services/api/voting';
import { storiesApi } from './services/api/stories';
import { wsClient } from './services/websocket/client';

interface PlayerWithExtras {
  id: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
  isHost?: boolean;
  isOnline?: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  votedInCurrentRound?: boolean;
}

interface GameStore extends GameState {
  addPlayer: (player: Player) => void;
  selectCard: (playerId: string, card: CardValue) => void;
  revealCards: () => void;
  resetGame: () => void;
  setTimer: (time: number) => void;
  setCurrentStory: (story: string) => void;
  setCardValues: (values: CardValue[]) => void;
  setIsConfigured: (value: boolean) => void;
  joinSession: (sessionId: string) => void;
  createSession: () => string;
  sessionId: string | null;
  
  // Enhanced timer management
  configureTimer: (config: TimerConfiguration) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addTime: (seconds: number) => void;
  syncTimer: (state: Partial<TimerState>) => void;
  getTimerDisplay: () => { minutes: number; seconds: number; isWarning: boolean; warningLevel: 'none' | 'low' | 'medium' | 'high' };
  
  // Story management
  addStory: (story: CreateStoryDto) => Promise<void>;
  updateStory: (storyId: string, updates: UpdateStoryDto) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  setActiveStory: (storyId: string) => Promise<void>;
  setStories: (stories: Story[]) => void;
  getCurrentStory: () => Story | null;
  isCreatingStory: boolean;
  setIsCreatingStory: (value: boolean) => void;
  preserveVotingHistory: (storyId: string) => void;
  getStoryVotingHistory: (storyId: string) => VotingHistoryData | null;
  
  // Voting management
  submitVote: (playerId: string, value: CardValue) => Promise<void>;
  revealVotes: () => Promise<void>;
  resetVoting: () => Promise<void>;
  setVotingState: (state: Partial<VotingFlowState>) => void;
  getVoteProgress: () => { votedCount: number; totalCount: number; hasVoted: boolean };
  calculateConsensus: (votes: Vote[]) => ConsensusData;
  
  // Connection management
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  lastSync: Date | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConnectionError: (error: string | null) => void;
  updateLastSync: () => void;
  
  // WebSocket event handlers
  handlePlayerJoined: (data: PlayerJoinedData) => void;
  handlePlayerLeft: (data: PlayerLeftData) => void;
  handlePlayerUpdated: (data: PlayerUpdatedData) => void;
  handleVoteSubmitted: (data: VoteSubmittedData) => void;
  handleCardsRevealed: (data: CardsRevealedData) => void;
  handleGameReset: (data?: unknown) => void;
  handleStoryCreated: (data: { story: StoryInfo }) => void;
  handleStoryUpdated: (data: StoryUpdatedData) => void;
  handleStoryDeleted: (data: { storyId: string }) => void;
  handleStoryActivated: (data: { story: StoryInfo; previousActiveStoryId?: string }) => void;
  handleTimerUpdated: (data: TimerUpdatedData) => void;
  handleSessionState: (data: SessionStateData) => void;
  
  // Player utility methods
  getCurrentPlayerId: () => string | null;
  getCurrentPlayer: () => Player | null;
  isCurrentUserHost: () => boolean;
  isCurrentUserSpectator: () => boolean;
  getPlayerById: (playerId: string) => Player | null;
  
  // Persistence methods
  clearSession: () => void;
  syncState: (data: Partial<GameState>) => void;
}

const initialTimerState: TimerState = {
  mode: 'countdown',
  duration: 300, // 5 minutes default
  remaining: 300,
  isRunning: false,
  isPaused: false,
  startedAt: null,
  pausedAt: null,
  settings: {
    autoReveal: false,
    autoSkip: false,
    audioEnabled: true,
    warningAt: [60, 30, 10] // Warning at 1 min, 30s, 10s
  }
};

const initialState: GameState = {
  players: [],
  isRevealing: false,
  timer: 60,
  timerState: initialTimerState,
  currentStory: '',
  stories: [],
  cardValues: [1, 2, 3, 5, 8, 13, '?', 'coffee'],
  isConfigured: false,
  voting: {
    votes: {},
    isRevealed: false,
    hasVoted: false,
    consensus: null,
    votingResults: [],
    currentStoryId: null,
  },
};

// Timer update interval manager
let timerInterval: NodeJS.Timeout | null = null;

const startTimerInterval = (store: { getState: () => any; setState: (update: any) => void }) => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    const state = store.getState();
    const { timerState } = state;
    
    if (!timerState.isRunning || timerState.isPaused || timerState.mode === 'none') {
      return;
    }
    
    if (timerState.startedAt) {
      const now = Date.now();
      const elapsed = (now - timerState.startedAt) / 1000;
      
      let newRemaining = timerState.remaining;
      
      if (timerState.mode === 'countdown') {
        newRemaining = Math.max(0, timerState.duration - elapsed);
        
        // Auto-stop when countdown reaches zero
        if (newRemaining === 0) {
          store.setState({
            timerState: {
              ...timerState,
              isRunning: false,
              remaining: 0
            }
          });
          return;
        }
      } else if (timerState.mode === 'stopwatch') {
        newRemaining = elapsed;
      }
      
      // Update remaining time
      if (Math.abs(newRemaining - timerState.remaining) >= 0.5) { // Update every 500ms for smooth display
        store.setState({
          timerState: {
            ...timerState,
            remaining: newRemaining
          }
        });
      }
    }
  }, 100); // Update every 100ms for smooth display
};

const stopTimerInterval = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  ...initialState,
  sessionId: null,
  isCreatingStory: false,
  
  // Connection state
  connectionStatus: 'initial',
  connectionError: null,
  lastSync: null,

  createSession: () => {
    const sessionId = crypto.randomUUID();
    set({ sessionId });
    return sessionId;
  },

  joinSession: (sessionId: string) => {
    set({ sessionId });
  },

  addPlayer: (player) => {
    set(state => ({
      players: [...state.players, player],
      lastSync: new Date()
    }));
  },

  selectCard: (playerId, card) => {
    set(state => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, selectedCard: card } : p
      ),
      lastSync: new Date()
    }));
  },

  revealCards: () => {
    set(state => {
      if (!state.isRevealing) {
        return {
          isRevealing: true,
          players: state.players.map((p) => ({ ...p, isRevealed: true })),
          lastSync: new Date()
        };
      }
      return state;
    });
  },

  resetGame: () => {
    set(state => ({
      isRevealing: false,
      timer: initialState.timer,
      timerState: {
        ...state.timerState,
        isRunning: false,
        isPaused: false,
        startedAt: null,
        pausedAt: null,
        remaining: state.timerState.duration
      },
      players: state.players.map((p) => ({
        ...p,
        selectedCard: null,
        isRevealed: false,
      })),
      lastSync: new Date()
    }));
  },

  setTimer: (time) => {
    set({ timer: time, lastSync: new Date() });
  },

  // Enhanced timer management
  configureTimer: (config: TimerConfiguration) => {
    set(state => ({
      timerState: {
        ...state.timerState,
        mode: config.mode,
        duration: config.duration,
        remaining: config.duration,
        settings: config.settings,
        isRunning: false,
        isPaused: false,
        startedAt: null,
        pausedAt: null
      },
      lastSync: new Date()
    }));
    
    // Sync with WebSocket
    const { sessionId } = get();
    if (sessionId && wsClient.isWsConnected()) {
      wsClient.configureTimer(config);
    }
  },

  startTimer: () => {
    const state = get();
    if (state.timerState.mode === 'none') return;
    
    const now = Date.now();
    let remaining = state.timerState.remaining;
    
    // If starting from paused state, maintain current remaining time but reset start time
    if (state.timerState.isPaused) {
      // Keep current remaining time, just reset timing
      remaining = state.timerState.remaining;
    } else if (!state.timerState.isRunning) {
      // Starting fresh - use duration for countdown, 0 for stopwatch
      remaining = state.timerState.mode === 'countdown' ? state.timerState.duration : 0;
    }
    
    set(state => ({
      timerState: {
        ...state.timerState,
        isRunning: true,
        isPaused: false,
        startedAt: now,
        pausedAt: null,
        remaining
      },
      lastSync: new Date()
    }));

    // Start the timer interval
    startTimerInterval({ getState: get, setState: set });

    // Sync with WebSocket
    const { sessionId } = get();
    if (sessionId && wsClient.isWsConnected()) {
      wsClient.startTimer({ ...get().timerState, startedAt: now });
    }
  },

  pauseTimer: () => {
    const state = get();
    if (!state.timerState.isRunning || state.timerState.isPaused) return;
    
    const now = Date.now();
    
    // Calculate current remaining time before pausing
    let remaining = state.timerState.remaining;
    if (state.timerState.startedAt) {
      const elapsed = (now - state.timerState.startedAt) / 1000;
      if (state.timerState.mode === 'countdown') {
        remaining = Math.max(0, state.timerState.duration - elapsed);
      } else {
        remaining = elapsed;
      }
    }
    
    set(state => ({
      timerState: {
        ...state.timerState,
        isRunning: false,
        isPaused: true,
        pausedAt: now,
        remaining
      },
      lastSync: new Date()
    }));

    // Stop the timer interval
    stopTimerInterval();

    // Sync with WebSocket
    const { sessionId } = get();
    if (sessionId && wsClient.isWsConnected()) {
      wsClient.pauseTimer();
    }
  },

  resumeTimer: () => {
    get().startTimer(); // Resume is essentially starting from current state
  },

  stopTimer: () => {
    set(state => ({
      timerState: {
        ...state.timerState,
        isRunning: false,
        isPaused: false,
        startedAt: null,
        pausedAt: null,
        remaining: state.timerState.mode === 'countdown' ? state.timerState.duration : 0
      },
      lastSync: new Date()
    }));

    // Stop the timer interval
    stopTimerInterval();

    // Sync with WebSocket
    const { sessionId } = get();
    if (sessionId && wsClient.isWsConnected()) {
      wsClient.stopTimer();
    }
  },

  resetTimer: () => {
    set(state => ({
      timerState: {
        ...state.timerState,
        isRunning: false,
        isPaused: false,
        startedAt: null,
        pausedAt: null,
        remaining: state.timerState.mode === 'countdown' ? state.timerState.duration : 0
      },
      lastSync: new Date()
    }));

    // Stop the timer interval
    stopTimerInterval();

    // Sync with WebSocket
    const { sessionId } = get();
    if (sessionId && wsClient.isWsConnected()) {
      wsClient.resetTimer();
    }
  },

  addTime: (seconds: number) => {
    set(state => {
      const newDuration = state.timerState.duration + seconds;
      const newRemaining = state.timerState.remaining + seconds;
      
      return {
        timerState: {
          ...state.timerState,
          duration: newDuration,
          remaining: Math.max(0, newRemaining)
        },
        lastSync: new Date()
      };
    });

    // Sync with WebSocket
    const { sessionId } = get();
    if (sessionId && wsClient.isWsConnected()) {
      wsClient.updateTimer({ addTime: seconds });
    }
  },

  syncTimer: (timerUpdate: Partial<TimerState>) => {
    set(state => ({
      timerState: {
        ...state.timerState,
        ...timerUpdate
      },
      lastSync: new Date()
    }));
  },

  getTimerDisplay: () => {
    const state = get();
    const { timerState } = state;
    
    if (timerState.mode === 'none') {
      return { minutes: 0, seconds: 0, isWarning: false, warningLevel: 'none' as const };
    }
    
    // Use the current remaining time from state (updated by interval)
    const displayTime = timerState.remaining;
    
    const minutes = Math.floor(displayTime / 60);
    const seconds = Math.floor(displayTime % 60);
    
    // Determine warning level for countdown mode
    let warningLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
    let isWarning = false;
    
    if (timerState.mode === 'countdown') {
      if (displayTime <= 10) {
        warningLevel = 'high';
        isWarning = true;
      } else if (displayTime <= 30) {
        warningLevel = 'medium';
        isWarning = true;
      } else if (displayTime <= 60) {
        warningLevel = 'low';
        isWarning = true;
      }
    }
    
    return { minutes, seconds, isWarning, warningLevel };
  },

  setCurrentStory: (story) => {
    set({ currentStory: story, lastSync: new Date() });
  },

  setCardValues: (values) => {
    set({ cardValues: values, lastSync: new Date() });
  },

  setIsConfigured: (value) => {
    set({ isConfigured: value, lastSync: new Date() });
  },

  // Story management
  addStory: async (storyData) => {
    const { sessionId } = get();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      // Create story via API first
      const newStory = await storiesApi.createStory(sessionId, {
        title: storyData.title,
        description: storyData.description,
        orderIndex: get().stories.length
      });

      console.log('New story from API:', newStory);

      // Ensure we have a valid story object
      if (!newStory) {
        throw new Error('API returned no story data');
      }

      // Update local state immediately (optimistic update)
      set(state => {
        // Check if story already exists (WebSocket might be faster than API response)
        const existingStory = state.stories.find(story => story.id === newStory.id);
        if (existingStory) {
          console.log('Story already exists from WebSocket, skipping API optimistic update:', newStory.id);
          return state; // No changes needed
        }

        console.log('Adding story from API optimistic update:', newStory.id);
        return {
          stories: [...state.stories, newStory],
          currentStory: (newStory.isActive ?? true) ? newStory.title : state.currentStory,
          lastSync: new Date()
        };
      });

      // Note: WebSocket broadcast is handled by the backend API endpoint
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  },

  updateStory: async (storyId, updates) => {
    try {
      // Update story via API first
      const updatedStory = await storiesApi.updateStory(storyId, updates);

      // Update local state immediately (optimistic update)
      set(state => ({
        stories: state.stories.map(story =>
          story.id === storyId ? updatedStory : story
        ),
        currentStory: updatedStory.isActive ? updatedStory.title : state.currentStory,
        lastSync: new Date()
      }));

      // Also sync via WebSocket for real-time updates to other clients
      wsClient.updateStory(storyId, updates.title, updates.description);
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  },

  deleteStory: async (storyId) => {
    try {
      // Delete story via API first
      await storiesApi.deleteStory(storyId);

      // Update local state immediately (optimistic update)
      set(state => {
        const updatedStories = state.stories.filter(story => story.id !== storyId);
        const deletedStory = state.stories.find(story => story.id === storyId);
        
        let newCurrentStory = state.currentStory;
        if (deletedStory?.isActive && updatedStories.length > 0) {
          // If we deleted the active story, make the first remaining story active
          updatedStories[0].isActive = true;
          newCurrentStory = updatedStories[0].title;
        } else if (updatedStories.length === 0) {
          newCurrentStory = '';
        }
        
        return {
          stories: updatedStories,
          currentStory: newCurrentStory,
          lastSync: new Date()
        };
      });

      // Also sync via WebSocket for real-time updates to other clients
      wsClient.deleteStory(storyId);
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  },

  setActiveStory: async (storyId) => {
    const { sessionId, getCurrentStory, preserveVotingHistory } = get();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      // Preserve voting history for current story before switching
      const currentStory = getCurrentStory();
      if (currentStory && currentStory.id !== storyId) {
        preserveVotingHistory(currentStory.id);
      }
      
      // Set active story via API first
      const activeStory = await storiesApi.setActiveStory(sessionId, storyId);

      // Update local state immediately (optimistic update)
      set(state => ({
        stories: state.stories.map(story => ({
          ...story,
          isActive: story.id === storyId
        })),
        currentStory: activeStory.title,
        lastSync: new Date()
      }));

      // Also sync via WebSocket for real-time updates to other clients
      wsClient.activateStory(storyId);
    } catch (error) {
      console.error('Error setting active story:', error);
      throw error;
    }
  },

  setStories: (stories) => {
    const activeStory = stories.find(story => story.isActive);
    set({
      stories,
      currentStory: activeStory?.title || '',
      lastSync: new Date()
    });
  },

  getCurrentStory: () => {
    return get().stories.find(story => story.isActive) || null;
  },

  setIsCreatingStory: (value) => {
    set({ isCreatingStory: value });
  },
  
  preserveVotingHistory: (storyId) => {
    set(state => {
      const { voting } = state;
      
      // Only preserve if we have revealed voting results
      if (!voting.isRevealed || voting.votingResults.length === 0) {
        return state;
      }
      
      // Calculate statistics for numeric votes
      const numericVotes = voting.votingResults
        .map(v => v.value)
        .filter(v => typeof v === 'number') as number[];
      
      let statistics = null;
      if (numericVotes.length > 0) {
        const sum = numericVotes.reduce((a, b) => a + b, 0);
        const average = sum / numericVotes.length;
        const sorted = [...numericVotes].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        const min = Math.min(...numericVotes);
        const max = Math.max(...numericVotes);
        
        statistics = { average, median, min, max };
      }
      
      const votingHistory: VotingHistoryData = {
        votes: voting.votingResults,
        consensus: voting.consensus,
        statistics,
        revealedAt: new Date().toISOString()
      };
      
      return {
        ...state,
        stories: state.stories.map(story => 
          story.id === storyId 
            ? { ...story, votingHistory }
            : story
        )
      };
    });
  },
  
  getStoryVotingHistory: (storyId) => {
    const story = get().stories.find(s => s.id === storyId);
    return story?.votingHistory || null;
  },

  // Voting management
  submitVote: async (playerId, value) => {
    const { sessionId, getCurrentStory, stories } = get();
    const currentStory = getCurrentStory();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    // If no current story exists, we can't vote - throw helpful error
    if (!currentStory && stories.length === 0) {
      throw new Error('No story available to vote on. Please create a story first.');
    }
    
    console.log('Submitting vote:', { playerId, value, currentStory, sessionId });
    
    try {
      // Optimistic update
      set(state => ({
        ...state,
        voting: {
          ...state.voting,
          votes: { ...state.voting.votes, [playerId]: value },
          hasVoted: true,
          currentStoryId: currentStory?.id || null,
        },
        players: state.players.map(p =>
          p.id === playerId ? { ...p, selectedCard: value } : p
        ),
        lastSync: new Date()
      }));

      // Use current story ID if available, otherwise create a default story for voting
      let storyId = currentStory?.id;
      
      if (!storyId) {
        // If we have no current story but have stories, use the first one
        if (stories.length > 0) {
          storyId = stories[0].id;
        } else {
          // Create a default story for immediate voting
          storyId = `default-story-${sessionId}`;
        }
      }

      console.log('API call data:', {
        playerId,
        value: value.toString(),
        storyId
      });

      await votingApi.submitVote(sessionId, {
        playerId,
        value: value.toString(),
        storyId,
      });
      
      console.log('Vote submitted successfully');
    } catch (error) {
      console.error('Vote submission failed:', error);
      // Revert optimistic update on error
      set(state => ({
        ...state,
        voting: {
          ...state.voting,
          votes: Object.fromEntries(
            Object.entries(state.voting.votes).filter(([id]) => id !== playerId)
          ),
          hasVoted: false,
        },
        players: state.players.map(p =>
          p.id === playerId ? { ...p, selectedCard: null } : p
        ),
      }));
      throw error;
    }
  },

  revealVotes: async () => {
    const { sessionId, getCurrentStory } = get();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      const result = await votingApi.revealCards(sessionId);
      const currentStory = getCurrentStory();
      
      set(state => ({
        ...state,
        isRevealing: true,
        voting: {
          ...state.voting,
          isRevealed: true,
          votingResults: result.data.votes,
          consensus: result.data.consensus || null,
        },
        players: state.players.map(p => ({ ...p, isRevealed: true })),
        lastSync: new Date()
      }));
      
      // Also preserve the voting history immediately for the current story
      if (currentStory) {
        // Use setTimeout to allow state to update first
        setTimeout(() => {
          get().preserveVotingHistory(currentStory.id);
        }, 100);
      }
    } catch (error) {
      console.error('Error revealing votes:', error);
      throw error;
    }
  },

  resetVoting: async () => {
    const { sessionId } = get();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      await votingApi.resetGame(sessionId);
      
      set(state => ({
        ...state,
        isRevealing: false,
        voting: {
          votes: {},
          isRevealed: false,
          hasVoted: false,
          consensus: null,
          votingResults: [],
          currentStoryId: state.voting.currentStoryId,
        },
        players: state.players.map(p => ({
          ...p,
          selectedCard: null,
          isRevealed: false,
        })),
        lastSync: new Date()
      }));
    } catch (error) {
      console.error('Error resetting voting:', error);
      throw error;
    }
  },

  setVotingState: (votingState) => {
    set(state => ({
      ...state,
      voting: { ...state.voting, ...votingState },
      lastSync: new Date()
    }));
  },

  getVoteProgress: () => {
    const state = get();
    const votingPlayers = state.players.filter(p => !p.isSpectator && p.isOnline !== false);
    const currentPlayerId = state.sessionId ? localStorage.getItem(`player_${state.sessionId}`) : null;
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    
    // Use backend-provided counts if available, otherwise fall back to local calculation
    const votedCount = state.voting.voteCount !== undefined 
      ? state.voting.voteCount 
      : Object.keys(state.voting.votes).length;
    const totalCount = state.voting.totalPlayers !== undefined 
      ? state.voting.totalPlayers 
      : votingPlayers.length;
    
    console.log('Vote progress calculation:', {
      votedCount,
      totalCount,
      backendVoteCount: state.voting.voteCount,
      backendTotalPlayers: state.voting.totalPlayers,
      localVotesCount: Object.keys(state.voting.votes).length,
      localPlayersCount: votingPlayers.length
    });
    
    return {
      votedCount,
      totalCount,
      hasVoted: !!currentPlayer && !!state.voting.votes[currentPlayer.id],
      canVote: currentPlayer && !currentPlayer.isSpectator,
      isSpectator: currentPlayer?.isSpectator || false,
    };
  },

  calculateConsensus: (votes: Vote[]): ConsensusData => {
    if (votes.length === 0) {
      return { hasConsensus: false };
    }

    const numericVotes = votes
      .map(v => v.value)
      .filter(v => typeof v === 'number') as number[];

    if (numericVotes.length === 0) {
      return { hasConsensus: false };
    }

    // Calculate statistics
    const average = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Check for consensus (80% agreement within 1 point of median)
    const tolerance = 1;
    const consensusVotes = numericVotes.filter(v => Math.abs(v - median) <= tolerance);
    const consensusPercentage = consensusVotes.length / numericVotes.length;
    
    const hasConsensus = consensusPercentage >= 0.8;
    const deviation = Math.sqrt(
      numericVotes.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / numericVotes.length
    );

    return {
      hasConsensus,
      suggestedValue: hasConsensus ? median : undefined,
      averageValue: average,
      deviation,
    };
  },

  // Connection management
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setConnectionError: (error) => set({ connectionError: error }),
  updateLastSync: () => set({ lastSync: new Date() }),

  // WebSocket event handlers
  handlePlayerJoined: (data: PlayerJoinedData) => {
    set(state => {
      // Don't add if player already exists
      const existingPlayer = state.players.find(p => p.id === data.player.id);
      if (existingPlayer) {
        return state;
      }
      
      return {
        players: [...state.players, {
          id: data.player.id,
          name: data.player.name,
          avatar: data.player.avatar,
          selectedCard: null,
          isRevealed: false,
          isSpectator: data.player.isSpectator
        }],
        lastSync: new Date()
      };
    });
  },

  handlePlayerLeft: (data: PlayerLeftData) => {
    set(state => ({
      players: state.players.filter(p => p.id !== data.playerId),
      lastSync: new Date()
    }));
  },

  handlePlayerUpdated: (data: PlayerUpdatedData) => {
    set(state => ({
      players: state.players.map(p =>
        p.id === data.player.id ? {
          ...p,
          name: data.player.name,
          avatar: data.player.avatar,
          isSpectator: data.player.isSpectator,
          isHost: (data.player as PlayerWithExtras).isHost,
          isOnline: (data.player as PlayerWithExtras).isOnline,
          lastSeenAt: data.player.lastSeenAt?.toString(),
          joinedAt: data.player.joinedAt?.toString(),
          votedInCurrentRound: (data.player as PlayerWithExtras).votedInCurrentRound
        } : p
      ),
      lastSync: new Date()
    }));
  },

  handleVoteSubmitted: (data: VoteSubmittedData) => {
    set(state => {
      console.log('Handling vote submitted:', data);
      
      // Update voting state with the global vote count from backend
      const updatedVoting = {
        ...state.voting,
        voteCount: data.voteCount,
        totalPlayers: data.totalPlayers,
      };
      
      // If the vote is for a different player, add it to votes tracking
      if (data.hasVoted && data.playerId) {
        updatedVoting.votes = {
          ...state.voting.votes,
          [data.playerId]: '?' // We don't get the actual value until reveal
        };
      }
      
      const updatedPlayers = state.players.map(p =>
        p.id === data.playerId
          ? { ...p, selectedCard: data.hasVoted ? (p.selectedCard || '?') : null }
          : p
      );
      
      const newState = {
        players: updatedPlayers,
        voting: updatedVoting,
        lastSync: new Date()
      };
      
      console.log('Updated state after vote submitted:', {
        voteCount: data.voteCount,
        totalPlayers: data.totalPlayers,
        votesInState: Object.keys(updatedVoting.votes).length
      });
      
      // Auto-reveal cards when all players have voted
      if (data.voteCount && data.totalPlayers && data.voteCount >= data.totalPlayers && !state.isRevealing) {
        console.log('All players have voted! Auto-revealing cards...');
        // Use setTimeout to avoid direct state mutation during the current set call
        setTimeout(() => {
          get().revealVotes().catch(error => {
            console.error('Auto-reveal failed:', error);
          });
        }, 100);
      }
      
      return newState;
    });
  },

  handleCardsRevealed: (data: CardsRevealedData) => {
    set(state => ({
      isRevealing: true,
      voting: {
        ...state.voting,
        isRevealed: true,
        votingResults: data.votes.map(v => ({
          id: v.playerId,
          playerId: v.playerId,
          sessionId: state.sessionId || '',
          storyId: data.storyId,
          value: v.value as CardValue,
          createdAt: new Date().toISOString()
        })),
        consensus: data.consensus || null
      },
      players: state.players.map(p => {
        const vote = data.votes.find(v => v.playerId === p.id);
        return {
          ...p,
          selectedCard: vote?.value as CardValue || p.selectedCard,
          isRevealed: true
        };
      }),
      lastSync: new Date()
    }));
  },

  handleGameReset: () => {
    set(state => ({
      isRevealing: false,
      timer: initialState.timer,
      currentStory: initialState.currentStory,
      voting: {
        ...state.voting,
        votes: {},
        isRevealed: false,
        hasVoted: false,
        consensus: null,
        votingResults: []
      },
      players: state.players.map(p => ({
        ...p,
        selectedCard: null,
        isRevealed: false
      })),
      lastSync: new Date()
    }));
  },

  handleStoryCreated: (data: { story: StoryInfo }) => {
    set(state => {
      console.log('WebSocket handleStoryCreated received:', data.story);
      console.log('Current stories in state:', state.stories.map(s => ({ id: s.id, title: s.title })));
      
      // Check if story already exists (prevents duplication from optimistic updates)
      const existingStory = state.stories.find(story => story.id === data.story.id);
      if (existingStory) {
        console.log('Story already exists, skipping WebSocket duplicate:', data.story.id);
        return state; // No changes needed
      }

      console.log('Adding new story from WebSocket:', data.story.id);
      return {
        stories: [...state.stories, data.story],
        currentStory: data.story.isActive ? data.story.title : state.currentStory,
        lastSync: new Date()
      };
    });
  },

  handleStoryUpdated: (data: StoryUpdatedData) => {
    set(state => ({
      stories: state.stories.map(story =>
        story.id === data.story.id ? data.story : story
      ),
      currentStory: data.story.isActive ? data.story.title : state.currentStory,
      lastSync: new Date()
    }));
  },

  handleStoryDeleted: (data: { storyId: string }) => {
    set(state => {
      const updatedStories = state.stories.filter(story => story.id !== data.storyId);
      const deletedStory = state.stories.find(story => story.id === data.storyId);
      
      let newCurrentStory = state.currentStory;
      if (deletedStory?.isActive && updatedStories.length > 0) {
        // If we deleted the active story, make the first remaining story active
        updatedStories[0].isActive = true;
        newCurrentStory = updatedStories[0].title;
      } else if (updatedStories.length === 0) {
        newCurrentStory = '';
      }
      
      return {
        stories: updatedStories,
        currentStory: newCurrentStory,
        lastSync: new Date()
      };
    });
  },

  handleStoryActivated: (data: { story: StoryInfo; previousActiveStoryId?: string }) => {
    set(state => {
      // Preserve voting history for the previous active story
      if (data.previousActiveStoryId && state.voting.isRevealed && state.voting.votingResults.length > 0) {
        const { preserveVotingHistory } = get();
        preserveVotingHistory(data.previousActiveStoryId);
      }
      
      return {
        stories: state.stories.map(story => ({
          ...story,
          isActive: story.id === data.story.id
        })),
        currentStory: data.story.title,
        // Reset voting state for new story
        voting: {
          ...state.voting,
          votes: {},
          isRevealed: false,
          hasVoted: false,
          consensus: null,
          votingResults: [],
          currentStoryId: data.story.id,
        voteCount: 0,
        totalPlayers: undefined
      },
      // Reset player cards and voting status
      players: state.players.map(p => ({
        ...p,
        selectedCard: null,
        isRevealed: false,
        votedInCurrentRound: false
      })),
      isRevealing: false,
      lastSync: new Date()
      };
    });
  },

  handleTimerUpdated: (data: TimerUpdatedData) => {
    set({
      timer: data.timer.remainingTime,
      lastSync: new Date()
    });
  },

  handleSessionState: (data: SessionStateData) => {
    const timestamp = new Date().toISOString();
    console.log(`[Store][${timestamp}] handleSessionState called with:`, {
      dataKeys: Object.keys(data),
      playersCount: data.players?.length,
      storiesCount: data.stories?.length,
      hasConfig: !!data.config,
      configKeys: data.config ? Object.keys(data.config) : [],
      cardValues: data.config?.cardValues,
      stories: data.stories?.map(s => ({ id: s.id, title: s.title, isActive: s.isActive })) || [],
      fullData: data
    });
    
    if ('players' in data && Array.isArray(data.players)) {
      console.log(`[Store][${timestamp}] Processing players:`, data.players.length, data.players);
      console.log(`[Store][${timestamp}] Session config received:`, data.config);
      

      const updates: Record<string, unknown> = {
        players: data.players.map((p: PlayerWithExtras) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          selectedCard: null,
          isRevealed: false,
          isSpectator: p.isSpectator || false,
          isHost: p.isHost || false,
          isOnline: p.isOnline ?? true,
          lastSeenAt: p.lastSeenAt,
          joinedAt: p.joinedAt,
          votedInCurrentRound: p.votedInCurrentRound || false
        })),
        stories: data.stories || [],
        currentStory: data.currentStory?.title,
        timer: data.timer?.remainingTime || data.timer?.duration || 60,
        lastSync: new Date()
      };

      // Update card values if provided in session config
      if (data.config?.cardValues && data.config.cardValues.length > 0) {
        const cardValues = data.config.cardValues.map((v: string) => 
          isNaN(Number(v)) ? v : Number(v)
        );
        updates.cardValues = cardValues;
        updates.isConfigured = true;
        console.log(`[Store][${timestamp}] Updated card values from WebSocket:`, cardValues);
      } else {
        console.log(`[Store][${timestamp}] No valid card values in config:`, {
          hasConfig: !!data.config,
          hasCardValues: !!data.config?.cardValues,
          cardValuesLength: data.config?.cardValues?.length,
          cardValues: data.config?.cardValues
        });
      }

      console.log(`[Store][${timestamp}] Applying updates:`, {
        ...updates,
        storiesCount: (updates.stories as any[])?.length || 0,
        storiesDetail: (updates.stories as any[])?.map(s => ({ id: s.id, title: s.title, isActive: s.isActive })) || []
      });
      set(state => ({
        ...state,
        ...updates
      }));
    } else {
      console.log(`[Store][${timestamp}] No players array found in session state data`);
    }
  },

  // Player utility methods
  getCurrentPlayerId: () => {
    const sessionId = get().sessionId;
    return sessionId ? localStorage.getItem(`player_${sessionId}`) : null;
  },

  getCurrentPlayer: () => {
    const state = get();
    const playerId = state.sessionId ? localStorage.getItem(`player_${state.sessionId}`) : null;
    return state.players.find(p => p.id === playerId) || null;
  },

  isCurrentUserHost: () => {
    const currentPlayer = get().getCurrentPlayer();
    return currentPlayer?.isHost || false;
  },

  isCurrentUserSpectator: () => {
    const currentPlayer = get().getCurrentPlayer();
    return currentPlayer?.isSpectator || false;
  },

  getPlayerById: (playerId: string) => {
    const state = get();
    return state.players.find(p => p.id === playerId) || null;
  },

  // Persistence methods
  clearSession: async () => {
    await clearPersistedState();
    set({
      ...initialState,
      sessionId: null,
      connectionStatus: 'initial',
      connectionError: null,
      lastSync: null
    });
  },

  syncState: (data: Partial<GameState>) => {
    set({
      ...data,
      lastSync: new Date()
    });
  }
}),
{
  name: 'planning-poker-store',
  partialize: (state) => ({
    version: 1,
    timestamp: Date.now(),
    session: {
      id: state.sessionId,
      config: {
        cardValues: state.cardValues || [1, 2, 3, 5, 8, 13, '?', 'coffee'],
        isConfigured: state.isConfigured || false
      }
    },
    game: {
      currentStory: state.currentStory || '',
      stories: state.stories || [],
      isRevealing: state.isRevealing || false,
      timer: state.timer || 60,
      timerState: state.timerState || initialTimerState,
      players: state.players || [],
      voting: state.voting || {
        votes: {},
        isRevealed: false,
        hasVoted: false,
        consensus: null,
        votingResults: [],
        currentStoryId: null,
      }
    },
    ui: {}
  }),
  onRehydrateStorage: () => (state) => {
    if (state) {
      console.log('State rehydrated successfully');
    }
  }
}
));
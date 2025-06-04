import { create } from 'zustand';
import type { CardValue, GameState, Player, Story, CreateStoryDto, UpdateStoryDto, VotingFlowState, ConsensusData, Vote } from './types';
import type { 
  ConnectionStatus, 
  PlayerJoinedData, 
  PlayerLeftData, 
  PlayerUpdatedData,
  VoteSubmittedData,
  CardsRevealedData,
  StoryUpdatedData,
  TimerUpdatedData,
  SessionStateData
} from './types/websocket';
import { persist, clearPersistedState } from './store/middleware/persistence';
import { votingApi } from './services/api/voting';

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
  
  // Story management
  addStory: (story: CreateStoryDto) => void;
  updateStory: (storyId: string, updates: UpdateStoryDto) => void;
  deleteStory: (storyId: string) => void;
  setActiveStory: (storyId: string) => void;
  setStories: (stories: Story[]) => void;
  getCurrentStory: () => Story | null;
  isCreatingStory: boolean;
  setIsCreatingStory: (value: boolean) => void;
  
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
  handleStoryUpdated: (data: StoryUpdatedData) => void;
  handleTimerUpdated: (data: TimerUpdatedData) => void;
  handleSessionState: (data: SessionStateData) => void;
  
  // Persistence methods
  clearSession: () => void;
  syncState: (data: Partial<GameState>) => void;
}

const initialState: GameState = {
  players: [],
  isRevealing: false,
  timer: 60,
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

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  ...initialState,
  sessionId: null,
  isCreatingStory: false,
  
  // Connection state
  connectionStatus: 'disconnected',
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
  addStory: (storyData) => {
    const newStory: Story = {
      id: crypto.randomUUID(),
      title: storyData.title,
      description: storyData.description,
      orderIndex: get().stories.length,
      isActive: get().stories.length === 0, // First story is active by default
      createdAt: new Date().toISOString(),
    };
    
    set(state => ({
      stories: [...state.stories, newStory],
      currentStory: newStory.isActive ? newStory.title : state.currentStory,
      lastSync: new Date()
    }));
  },

  updateStory: (storyId, updates) => {
    set(state => ({
      stories: state.stories.map(story =>
        story.id === storyId ? { ...story, ...updates } : story
      ),
      currentStory: updates.isActive && updates.title ? updates.title : state.currentStory,
      lastSync: new Date()
    }));
  },

  deleteStory: (storyId) => {
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
  },

  setActiveStory: (storyId) => {
    set(state => {
      const updatedStories = state.stories.map(story => ({
        ...story,
        isActive: story.id === storyId
      }));
      
      const activeStory = updatedStories.find(story => story.id === storyId);
      
      return {
        stories: updatedStories,
        currentStory: activeStory?.title || '',
        lastSync: new Date()
      };
    });
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

  // Voting management
  submitVote: async (playerId, value) => {
    const { sessionId, getCurrentStory } = get();
    const currentStory = getCurrentStory();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }
    
    console.log('Submitting vote:', { playerId, value, currentStory, sessionId });
    
    try {
      // Optimistic update
      set(state => ({
        ...state,
        voting: {
          ...state.voting,
          votes: { ...state.voting.votes, [playerId]: value },
          hasVoted: playerId === state.players.find(p => p.selectedCard)?.id,
        },
        players: state.players.map(p =>
          p.id === playerId ? { ...p, selectedCard: value } : p
        ),
        lastSync: new Date()
      }));

      // For now, use sessionId as storyId if no current story is available
      // This is a temporary workaround until proper story management is implemented
      const storyId = currentStory?.id || sessionId;

      console.log('API call data:', {
        playerId,
        value: value.toString(),
        storyId
      });

      await votingApi.submitVote(sessionId, {
        playerId,
        value: value.toString(), // Convert to string for backend validation
        storyId,
      });
    } catch (error) {
      // Revert optimistic update on error
      set(state => ({
        ...state,
        voting: {
          ...state.voting,
          votes: Object.fromEntries(
            Object.entries(state.voting.votes).filter(([id]) => id !== playerId)
          ),
        },
        players: state.players.map(p =>
          p.id === playerId ? { ...p, selectedCard: null } : p
        ),
      }));
      throw error;
    }
  },

  revealVotes: async () => {
    const { sessionId } = get();
    
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      const result = await votingApi.revealCards(sessionId);
      const consensus = get().calculateConsensus(result.data.votes);
      
      set(state => ({
        ...state,
        isRevealing: true,
        voting: {
          ...state.voting,
          isRevealed: true,
          votingResults: result.data.votes,
          consensus,
        },
        players: state.players.map(p => ({ ...p, isRevealed: true })),
        lastSync: new Date()
      }));
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
    const votingPlayers = state.players.filter(p => !p.isSpectator);
    const votedCount = Object.keys(state.voting.votes).length;
    const currentPlayer = state.players.find(p => p.selectedCard);
    
    return {
      votedCount,
      totalCount: votingPlayers.length,
      hasVoted: !!currentPlayer && !!state.voting.votes[currentPlayer.id],
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
          isSpectator: data.player.isSpectator
        } : p
      ),
      lastSync: new Date()
    }));
  },

  handleVoteSubmitted: (data: VoteSubmittedData) => {
    set(state => ({
      players: state.players.map(p =>
        p.id === data.playerId
          ? { ...p, selectedCard: data.hasVoted ? (p.selectedCard || '?') : null }
          : p
      ),
      lastSync: new Date()
    }));
  },

  handleCardsRevealed: (data: CardsRevealedData) => {
    set(state => ({
      isRevealing: true,
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
      players: state.players.map(p => ({
        ...p,
        selectedCard: null,
        isRevealed: false
      })),
      lastSync: new Date()
    }));
  },

  handleStoryUpdated: (data: StoryUpdatedData) => {
    set({
      currentStory: data.story.title,
      lastSync: new Date()
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
      hasConfig: !!data.config,
      configKeys: data.config ? Object.keys(data.config) : [],
      cardValues: data.config?.cardValues,
      fullData: data
    });
    
    if ('players' in data && Array.isArray(data.players)) {
      console.log(`[Store][${timestamp}] Processing players:`, data.players.length, data.players);
      console.log(`[Store][${timestamp}] Session config received:`, data.config);
      
      const updates: Record<string, unknown> = {
        players: data.players.map((p: { id: string; name: string; avatar: string; isSpectator?: boolean }) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          selectedCard: null,
          isRevealed: false,
          isSpectator: p.isSpectator || false
        })),
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

      console.log(`[Store][${timestamp}] Applying updates:`, updates);
      set(state => ({
        ...state,
        ...updates
      }));
    } else {
      console.log(`[Store][${timestamp}] No players array found in session state data`);
    }
  },

  // Persistence methods
  clearSession: async () => {
    await clearPersistedState();
    set({
      ...initialState,
      sessionId: null,
      connectionStatus: 'disconnected',
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
    session: {
      id: state.sessionId,
      config: {
        cardValues: state.cardValues,
        isConfigured: state.isConfigured
      }
    },
    game: {
      currentStory: state.currentStory,
      stories: state.stories,
      isRevealing: state.isRevealing,
      timer: state.timer,
      players: state.players,
      voting: state.voting
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
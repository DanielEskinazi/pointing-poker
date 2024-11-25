import { create } from 'zustand';
import type { CardValue, GameState, Player } from './types';

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
}

const initialState: GameState = {
  players: [],
  isRevealing: false,
  timer: 60,
  currentStory: '',
  cardValues: [1, 2, 3, 5, 8, 13, '?', 'coffee'],
  isConfigured: false,
};

// Create a broadcast channel for real-time updates
const channel = new BroadcastChannel('planning-poker');

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  sessionId: null,

  createSession: () => {
    const sessionId = crypto.randomUUID();
    set({ sessionId });
    return sessionId;
  },

  joinSession: (sessionId: string) => {
    set({ sessionId });
  },

  addPlayer: (player) => {
    const state = get();
    const newState = {
      players: [...state.players, player]
    };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },

  selectCard: (playerId, card) => {
    const state = get();
    const newState = {
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, selectedCard: card } : p
      )
    };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },

  revealCards: () => {
    const state = get();
    if (!state.isRevealing) {
      const newState = {
        isRevealing: true,
        players: state.players.map((p) => ({ ...p, isRevealed: true }))
      };
      set(newState);
      channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
    }
  },

  resetGame: () => {
    const state = get();
    const newState = {
      isRevealing: false,
      timer: initialState.timer,
      currentStory: initialState.currentStory,
      players: state.players.map((p) => ({
        ...p,
        selectedCard: null,
        isRevealed: false,
      }))
    };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },

  setTimer: (time) => {
    const state = get();
    const newState = { timer: time };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },

  setCurrentStory: (story) => {
    const state = get();
    const newState = { currentStory: story };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },

  setCardValues: (values) => {
    const state = get();
    const newState = { cardValues: values };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },

  setIsConfigured: (value) => {
    const state = get();
    const newState = { isConfigured: value };
    set(newState);
    channel.postMessage({ type: 'UPDATE_STATE', state: newState, sessionId: state.sessionId });
  },
}));

// Listen for updates from other tabs/windows
channel.onmessage = (event) => {
  const { type, state, sessionId } = event.data;
  if (type === 'UPDATE_STATE' && useGameStore.getState().sessionId === sessionId) {
    useGameStore.setState(state);
  }
};
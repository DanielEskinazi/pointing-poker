import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { persistenceManager, type PersistedState } from '../../services/persistence/manager';

type Persist = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<T, Mps, Mcs>,
  options: PersistOptions<T>
) => StateCreator<T, Mps, Mcs>;

interface PersistOptions<T> {
  name: string;
  partialize?: (state: T) => Partial<PersistedState>;
  onRehydrateStorage?: () => (state?: T) => void;
}

let saveTimeout: NodeJS.Timeout | null = null;

export const persist: Persist = (config, options) => (set, get, api) => {
  const { partialize = () => ({}) } = options;
  
  const saveState = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      try {
        const state = partialize(get());
        await persistenceManager.save(state);
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    }, 1000);
  };
  
  api.subscribe(saveState);
  
  const isValidPersistedState = (state: unknown): state is PersistedState => {
    return state !== null && 
           typeof state === 'object' &&
           state !== undefined &&
           'timestamp' in state &&
           'version' in state &&
           typeof (state as Record<string, unknown>).timestamp === 'number' &&
           typeof (state as Record<string, unknown>).version === 'number' &&
           (state as Record<string, unknown>).timestamp > 0;
  };

  const rehydrate = async () => {
    try {
      const persistedState = await persistenceManager.load();
      console.log('Persistence load result:', persistedState);
      
      if (isValidPersistedState(persistedState) && options.onRehydrateStorage) {
        const callback = options.onRehydrateStorage();
        
        // Validate nested structures before accessing them
        const session = persistedState.session || {};
        const config = session.config || {};
        const game = persistedState.game || {};
        
        const defaultTimerState = {
          mode: 'countdown' as const,
          duration: 300,
          remaining: 300,
          isRunning: false,
          isPaused: false,
          startedAt: null,
          pausedAt: null,
          settings: {
            autoReveal: false,
            autoSkip: false,
            audioEnabled: true,
            warningAt: [60, 30, 10]
          }
        };
        
        const stateToSet = {
          sessionId: session.id || null,
          cardValues: Array.isArray(config.cardValues) ? config.cardValues : [1, 2, 3, 5, 8, 13, '?', 'coffee'],
          isConfigured: Boolean(config.isConfigured),
          currentStory: typeof game.currentStory === 'string' ? game.currentStory : '',
          isRevealing: Boolean(game.isRevealing),
          timer: typeof game.timer === 'number' ? game.timer : 60,
          timerState: game.timerState && typeof game.timerState === 'object' ? {
            ...defaultTimerState,
            ...game.timerState,
            settings: {
              ...defaultTimerState.settings,
              ...(game.timerState.settings || {})
            }
          } : defaultTimerState,
          players: Array.isArray(game.players) ? game.players : [],
          stories: Array.isArray(game.stories) ? game.stories : [],
          voting: game.voting || {
            votes: {},
            isRevealed: false,
            hasVoted: false,
            consensus: null,
            votingResults: [],
            currentStoryId: null,
          },
          lastSync: new Date()
        };
        
        console.log('Rehydrating state:', stateToSet);
        set(stateToSet as T);
        callback?.(get());
      } else {
        console.log('No valid persisted state found, using defaults');
        if (persistedState && !isValidPersistedState(persistedState)) {
          console.warn('Clearing invalid persisted state:', persistedState);
          await persistenceManager.clear();
        }
      }
    } catch (error) {
      console.error('Failed to rehydrate state:', error);
      // Clear any corrupt persistence data
      try {
        await persistenceManager.clear();
        console.log('Cleared corrupt persistence data');
      } catch (clearError) {
        console.error('Failed to clear corrupt persistence:', clearError);
      }
    }
  };
  
  rehydrate();
  
  return config(set, get, api);
};

export const clearPersistedState = async () => {
  await persistenceManager.clear();
};
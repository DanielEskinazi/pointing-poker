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
  
  const rehydrate = async () => {
    try {
      const persistedState = await persistenceManager.load();
      console.log('Persistence load result:', persistedState);
      
      if (persistedState && persistedState.timestamp && options.onRehydrateStorage) {
        const callback = options.onRehydrateStorage();
        
        const stateToSet = {
          sessionId: persistedState.session?.id || null,
          cardValues: persistedState.session?.config?.cardValues || [],
          isConfigured: persistedState.session?.config?.isConfigured || false,
          currentStory: persistedState.game?.currentStory || '',
          isRevealing: persistedState.game?.isRevealing || false,
          timer: persistedState.game?.timer || 60,
          players: persistedState.game?.players || [],
          lastSync: new Date()
        };
        
        console.log('Rehydrating state:', stateToSet);
        set(stateToSet as T);
        callback?.(get());
      } else {
        console.log('No valid persisted state found, using defaults');
      }
    } catch (error) {
      console.error('Failed to rehydrate state:', error);
      // Clear any corrupt persistence data
      try {
        await persistenceManager.clear();
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
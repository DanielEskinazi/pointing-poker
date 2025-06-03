# Story 8: State Persistence and Recovery

## Summary
Implement state persistence to handle page refreshes and browser crashes, allowing users to recover their session without losing progress.

## Acceptance Criteria
- [ ] Session state persists across page refreshes
- [ ] Player identity maintained after refresh
- [ ] Current game state recoverable
- [ ] WebSocket reconnection with state sync
- [ ] Graceful handling of expired sessions
- [ ] Clear state on explicit logout
- [ ] Migration handling for state schema changes
- [ ] Secure storage of sensitive data
- [ ] State hydration on app startup

## Technical Details

### Persistence Manager
```typescript
// src/services/persistence/manager.ts
import { compress, decompress } from 'lz-string';
import { encrypt, decrypt } from '@/utils/crypto';

interface PersistedState {
  version: number;
  timestamp: number;
  session: {
    id: string;
    name: string;
    config: SessionConfig;
  };
  auth: {
    token: string;
    refreshToken: string;
    playerId: string;
    isHost: boolean;
  };
  game: {
    currentStory: Story | null;
    isRevealing: boolean;
    timer: number;
  };
  ui: {
    theme: 'light' | 'dark';
    soundEnabled: boolean;
  };
}

export class PersistenceManager {
  private readonly STORAGE_KEY = 'planning-poker-state';
  private readonly CURRENT_VERSION = 1;
  private readonly MAX_AGE = 48 * 60 * 60 * 1000; // 48 hours
  
  async save(state: Partial<PersistedState>): Promise<void> {
    try {
      const data: PersistedState = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        ...state
      };
      
      // Compress and encrypt sensitive data
      const compressed = compress(JSON.stringify(data));
      const encrypted = await encrypt(compressed, this.getEncryptionKey());
      
      // Save to multiple storage locations for redundancy
      localStorage.setItem(this.STORAGE_KEY, encrypted);
      await this.saveToIndexedDB(encrypted);
      
    } catch (error) {
      console.error('Failed to persist state:', error);
      // Don't throw - persistence failure shouldn't break the app
    }
  }
  
  async load(): Promise<PersistedState | null> {
    try {
      // Try localStorage first (faster)
      let encrypted = localStorage.getItem(this.STORAGE_KEY);
      
      // Fallback to IndexedDB
      if (!encrypted) {
        encrypted = await this.loadFromIndexedDB();
      }
      
      if (!encrypted) return null;
      
      // Decrypt and decompress
      const compressed = await decrypt(encrypted, this.getEncryptionKey());
      const json = decompress(compressed);
      const data = JSON.parse(json) as PersistedState;
      
      // Validate age
      if (Date.now() - data.timestamp > this.MAX_AGE) {
        this.clear();
        return null;
      }
      
      // Handle version migrations
      return this.migrate(data);
      
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      this.clear();
      return null;
    }
  }
  
  async clear(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    await this.clearIndexedDB();
  }
  
  private migrate(data: PersistedState): PersistedState {
    if (data.version === this.CURRENT_VERSION) {
      return data;
    }
    
    // Handle migrations for future versions
    let migrated = { ...data };
    
    if (data.version < 1) {
      // Migration from version 0 to 1
      // Example: migrated.newField = defaultValue;
    }
    
    migrated.version = this.CURRENT_VERSION;
    return migrated;
  }
  
  private getEncryptionKey(): string {
    // Use a combination of factors for the encryption key
    const factors = [
      navigator.userAgent,
      window.location.origin,
      'planning-poker-v1'
    ];
    return factors.join('|');
  }
  
  // IndexedDB implementation for larger storage needs
  private async saveToIndexedDB(data: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(['state'], 'readwrite');
    await tx.objectStore('state').put({ id: 'current', data, timestamp: Date.now() });
  }
  
  private async loadFromIndexedDB(): Promise<string | null> {
    const db = await this.openDB();
    const tx = db.transaction(['state'], 'readonly');
    const record = await tx.objectStore('state').get('current');
    return record?.data || null;
  }
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PlanningPokerDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const persistenceManager = new PersistenceManager();
```

### Store Integration
```typescript
// src/store/middleware/persistence.ts
import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { persistenceManager } from '@/services/persistence/manager';
import debounce from 'lodash/debounce';

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
  partialize?: (state: T) => Partial<T>;
  onRehydrateStorage?: () => (state?: T) => void;
}

export const persist: Persist = (config, options) => (set, get, api) => {
  const { partialize = (state) => state } = options;
  
  // Debounced save function
  const saveState = debounce(async () => {
    const state = partialize(get());
    await persistenceManager.save(state);
  }, 1000);
  
  // Subscribe to state changes
  api.subscribe(saveState);
  
  // Load persisted state on initialization
  const rehydrate = async () => {
    const persistedState = await persistenceManager.load();
    if (persistedState && options.onRehydrateStorage) {
      const callback = options.onRehydrateStorage();
      set(persistedState as T);
      callback?.(get());
    }
  };
  
  rehydrate();
  
  return config(set, get, api);
};

// Updated store with persistence
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... existing store implementation ...
    }),
    {
      name: 'planning-poker-store',
      partialize: (state) => ({
        session: {
          id: state.sessionId,
          name: state.sessionName,
          config: state.config
        },
        auth: {
          token: state.token,
          refreshToken: state.refreshToken,
          playerId: state.playerId,
          isHost: state.isHost
        },
        game: {
          currentStory: state.currentStory,
          isRevealing: state.isRevealing,
          timer: state.timer
        },
        ui: {
          theme: state.theme,
          soundEnabled: state.soundEnabled
        }
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('State rehydrated successfully');
          // Trigger WebSocket reconnection
          if (state.sessionId && state.token) {
            wsClient.connect(state.sessionId, state.playerId, state.token);
          }
        }
      }
    }
  )
);
```

### Session Recovery Hook
```typescript
// src/hooks/useSessionRecovery.ts
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { sessionApi } from '@/services/api/sessions';
import { wsClient } from '@/services/websocket/client';

export const useSessionRecovery = () => {
  const [recovering, setRecovering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sessionId, token, clearSession } = useStore();
  
  useEffect(() => {
    const recoverSession = async () => {
      if (!sessionId || !token) {
        setRecovering(false);
        return;
      }
      
      try {
        // Validate session still exists
        const response = await sessionApi.get(sessionId);
        
        if (!response.success) {
          throw new Error('Session no longer exists');
        }
        
        // Reconnect WebSocket
        await wsClient.connect(sessionId, playerId, token);
        
        // Sync latest state
        await syncGameState();
        
        setRecovering(false);
      } catch (error) {
        console.error('Session recovery failed:', error);
        setError('Unable to recover session. Please rejoin.');
        clearSession();
        setRecovering(false);
      }
    };
    
    recoverSession();
  }, [sessionId, token]);
  
  return { recovering, error };
};

// App.tsx integration
export const App = () => {
  const { recovering, error } = useSessionRecovery();
  
  if (recovering) {
    return <RecoveryScreen />;
  }
  
  if (error) {
    return <ErrorScreen message={error} />;
  }
  
  return <Router />;
};
```

### Recovery UI Component
```typescript
// src/components/RecoveryScreen.tsx
export const RecoveryScreen = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const steps = [
      'Loading saved state...',
      'Connecting to server...',
      'Validating session...',
      'Synchronizing game state...',
      'Almost ready...'
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setProgress((currentStep / steps.length) * 100);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <Logo className="w-16 h-16 mx-auto animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recovering Your Session
        </h2>
        
        <div className="w-64 mx-auto mb-4">
          <div className="bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        
        <p className="text-gray-600">
          Please wait while we restore your game...
        </p>
      </div>
    </div>
  );
};
```

### State Sync After Recovery
```typescript
// src/services/sync/stateSync.ts
export class StateSync {
  async syncGameState(sessionId: string): Promise<void> {
    try {
      // Fetch latest session state
      const [sessionData, playersData, votesData] = await Promise.all([
        sessionApi.get(sessionId),
        playerApi.getAll(sessionId),
        votingApi.getVotes(sessionId)
      ]);
      
      // Update store with latest data
      useStore.getState().syncState({
        session: sessionData.data,
        players: playersData.data,
        votes: votesData.data.votes,
        isRevealing: votesData.data.revealed
      });
      
      console.log('State synchronized successfully');
    } catch (error) {
      console.error('State sync failed:', error);
      throw error;
    }
  }
  
  // Detect state conflicts
  detectConflicts(localState: GameState, serverState: GameState): Conflict[] {
    const conflicts: Conflict[] = [];
    
    // Check for vote conflicts
    if (localState.currentVote && !serverState.votes.includes(localState.playerId)) {
      conflicts.push({
        type: 'MISSING_VOTE',
        resolution: 'RESUBMIT'
      });
    }
    
    // Check for story mismatch
    if (localState.currentStory?.id !== serverState.currentStory?.id) {
      conflicts.push({
        type: 'STORY_MISMATCH',
        resolution: 'USE_SERVER'
      });
    }
    
    return conflicts;
  }
}
```

### Clear State on Logout
```typescript
// src/store/actions/auth.ts
export const authActions = {
  logout: async () => {
    // Clear persisted state
    await persistenceManager.clear();
    
    // Disconnect WebSocket
    wsClient.disconnect();
    
    // Clear store
    useStore.getState().reset();
    
    // Clear any cached data
    queryClient.clear();
    
    // Redirect to home
    window.location.href = '/';
  },
  
  clearExpiredSessions: async () => {
    // Clean up old sessions from storage
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(k => k.startsWith('session-'));
    
    for (const key of sessionKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (Date.now() - data.timestamp > 48 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
};
```

## Implementation Steps
1. Create persistence manager
2. Implement encryption utilities
3. Add IndexedDB support
4. Integrate with Zustand store
5. Create recovery hook
6. Build recovery UI
7. Implement state sync
8. Add conflict resolution
9. Test recovery scenarios

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 8-10 hours

## Dependencies
- Story 6: WebSocket Client Integration
- Story 7: API Client Integration

## Testing Requirements
- State persists across page refresh
- Recovery works with valid session
- Expired sessions handled gracefully
- Encryption/decryption works correctly
- State migrations function properly
- Conflicts detected and resolved
- Logout clears all persisted data

## Definition of Done
- [ ] Persistence manager implemented
- [ ] Store integrated with persistence
- [ ] Recovery flow working smoothly
- [ ] Recovery UI shows progress
- [ ] State sync after recovery
- [ ] Conflict resolution tested
- [ ] Security review completed
- [ ] Performance acceptable
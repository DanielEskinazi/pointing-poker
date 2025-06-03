# Story 6: WebSocket Client Integration

## Summary
Replace the current BroadcastChannel implementation with a WebSocket client that connects to the backend server for real-time synchronization across browsers.

## Acceptance Criteria
- [ ] Socket.io client integrated into React app
- [ ] BroadcastChannel code removed/replaced
- [ ] Connection management with auto-reconnect
- [ ] Connection status indicator in UI
- [ ] Event handlers for all game events
- [ ] State synchronization via WebSocket
- [ ] Offline mode with queue for actions
- [ ] Smooth transition during reconnects
- [ ] No duplicate events or state corruption

## Technical Details

### WebSocket Client Service
```typescript
// src/services/websocket/client.ts
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/store';
import { ClientEvents, ServerEvents } from '@/types/websocket';

export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private eventQueue: QueuedEvent[] = [];
  private isConnected = false;
  
  connect(sessionId: string, playerId: string, token: string) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    
    this.socket = io(wsUrl, {
      auth: { sessionId, playerId, token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000
    });
    
    this.setupEventHandlers();
    this.setupConnectionHandlers();
  }
  
  private setupConnectionHandlers() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Update store connection status
      useStore.getState().setConnectionStatus('connected');
      
      // Flush queued events
      this.flushEventQueue();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      useStore.getState().setConnectionStatus('disconnected');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts > 5) {
        useStore.getState().setConnectionStatus('error');
      } else {
        useStore.getState().setConnectionStatus('reconnecting');
      }
    });
  }
  
  private setupEventHandlers() {
    if (!this.socket) return;
    
    // Player events
    this.socket.on(ServerEvents.PLAYER_JOINED, (data) => {
      useStore.getState().handlePlayerJoined(data);
    });
    
    this.socket.on(ServerEvents.PLAYER_LEFT, (data) => {
      useStore.getState().handlePlayerLeft(data);
    });
    
    this.socket.on(ServerEvents.PLAYER_UPDATED, (data) => {
      useStore.getState().handlePlayerUpdated(data);
    });
    
    // Voting events
    this.socket.on(ServerEvents.VOTE_SUBMITTED, (data) => {
      useStore.getState().handleVoteSubmitted(data);
    });
    
    this.socket.on(ServerEvents.CARDS_REVEALED, (data) => {
      useStore.getState().handleCardsRevealed(data);
    });
    
    this.socket.on(ServerEvents.GAME_RESET, (data) => {
      useStore.getState().handleGameReset(data);
    });
    
    // Story events
    this.socket.on(ServerEvents.STORY_UPDATED, (data) => {
      useStore.getState().handleStoryUpdated(data);
    });
    
    // Timer events
    this.socket.on(ServerEvents.TIMER_UPDATED, (data) => {
      useStore.getState().handleTimerUpdated(data);
    });
  }
  
  emit<E extends keyof ClientEvents>(
    event: E, 
    data: ClientEvents[E]
  ): void {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else {
      // Queue event for later
      this.eventQueue.push({ event, data, timestamp: Date.now() });
    }
  }
  
  private flushEventQueue() {
    if (!this.socket || !this.isConnected) return;
    
    // Send queued events in order
    const now = Date.now();
    const validEvents = this.eventQueue.filter(
      e => now - e.timestamp < 30000 // 30 second expiry
    );
    
    validEvents.forEach(({ event, data }) => {
      this.socket!.emit(event, data);
    });
    
    this.eventQueue = [];
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
```

### WebSocket Hook
```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { wsClient } from '@/services/websocket/client';
import { useStore } from '@/store';

export const useWebSocket = () => {
  const { sessionId, playerId, token } = useStore();
  const connectedRef = useRef(false);
  
  useEffect(() => {
    if (!sessionId || !playerId || !token) return;
    
    // Prevent duplicate connections
    if (connectedRef.current) return;
    
    connectedRef.current = true;
    wsClient.connect(sessionId, playerId, token);
    
    return () => {
      connectedRef.current = false;
      wsClient.disconnect();
    };
  }, [sessionId, playerId, token]);
  
  return {
    emit: wsClient.emit.bind(wsClient),
    connected: useStore(state => state.connectionStatus === 'connected')
  };
};
```

### Store Updates
```typescript
// src/store/slices/connectionSlice.ts
export interface ConnectionSlice {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  connectionError: string | null;
  lastSync: Date | null;
  
  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConnectionError: (error: string | null) => void;
  updateLastSync: () => void;
}

export const createConnectionSlice: StateCreator<ConnectionSlice> = (set) => ({
  connectionStatus: 'disconnected',
  connectionError: null,
  lastSync: null,
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setConnectionError: (error) => set({ connectionError: error }),
  updateLastSync: () => set({ lastSync: new Date() })
});

// Update main store to handle WebSocket events
export const createGameSlice: StateCreator<GameSlice> = (set, get) => ({
  // ... existing state ...
  
  // WebSocket event handlers
  handlePlayerJoined: (data: PlayerJoinedData) => {
    set(state => ({
      players: [...state.players, data.player],
      lastSync: new Date()
    }));
  },
  
  handlePlayerLeft: (data: PlayerLeftData) => {
    set(state => ({
      players: state.players.filter(p => p.id !== data.playerId),
      lastSync: new Date()
    }));
  },
  
  handleVoteSubmitted: (data: VoteSubmittedData) => {
    set(state => ({
      players: state.players.map(p =>
        p.id === data.playerId
          ? { ...p, hasVoted: data.hasVoted }
          : p
      ),
      voteCount: data.voteCount,
      lastSync: new Date()
    }));
  },
  
  handleCardsRevealed: (data: CardsRevealedData) => {
    set(state => ({
      isRevealing: true,
      votes: data.votes,
      consensus: data.consensus,
      lastSync: new Date()
    }));
  },
  
  handleGameReset: () => {
    set(state => ({
      isRevealing: false,
      votes: [],
      consensus: null,
      players: state.players.map(p => ({
        ...p,
        selectedCard: null,
        hasVoted: false
      })),
      lastSync: new Date()
    }));
  }
});
```

### Connection Status Component
```typescript
// src/components/ConnectionStatus.tsx
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiIcon, WifiOffIcon, RefreshIcon } from '@heroicons/react/24/outline';

export const ConnectionStatus = () => {
  const { connectionStatus, connectionError } = useStore();
  
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: WifiIcon,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          show: false // Hide when connected
        };
      case 'connecting':
      case 'reconnecting':
        return {
          icon: RefreshIcon,
          text: 'Reconnecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          show: true,
          animate: true
        };
      case 'disconnected':
      case 'error':
        return {
          icon: WifiOffIcon,
          text: connectionError || 'Disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          show: true
        };
      default:
        return null;
    }
  };
  
  const config = getStatusConfig();
  if (!config) return null;
  
  return (
    <AnimatePresence>
      {config.show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${config.bgColor}`}>
            <config.icon 
              className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
            />
            <span className={`text-sm font-medium ${config.color}`}>
              {config.text}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### Update Game Actions
```typescript
// src/store/actions.ts
import { wsClient } from '@/services/websocket/client';

// Replace BroadcastChannel with WebSocket
export const gameActions = {
  selectCard: (playerId: string, card: string | null) => {
    // Update local state immediately
    useStore.getState().updatePlayerCard(playerId, card);
    
    // Emit to server
    wsClient.emit(ClientEvents.VOTE_SUBMIT, {
      value: card,
      storyId: useStore.getState().currentStoryId
    });
  },
  
  revealCards: () => {
    wsClient.emit(ClientEvents.CARDS_REVEAL, {});
  },
  
  resetGame: () => {
    wsClient.emit(ClientEvents.GAME_RESET, {});
  },
  
  updateStory: (title: string, description?: string) => {
    // Update local state
    useStore.getState().setCurrentStory({ title, description });
    
    // Emit to server
    wsClient.emit(ClientEvents.STORY_UPDATE, {
      title,
      description
    });
  }
};
```

### Offline Queue Manager
```typescript
// src/services/websocket/offlineQueue.ts
export class OfflineQueueManager {
  private queue: QueuedAction[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  
  enqueue(action: QueuedAction) {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
    }
    
    this.queue.push({
      ...action,
      id: generateId(),
      timestamp: Date.now()
    });
    
    // Persist to localStorage
    this.persistQueue();
  }
  
  async flush(wsClient: WebSocketClient) {
    const actions = [...this.queue];
    this.queue = [];
    
    for (const action of actions) {
      try {
        await this.processAction(action, wsClient);
      } catch (error) {
        console.error('Failed to process queued action:', error);
        // Re-queue failed actions
        this.queue.push(action);
      }
    }
    
    this.persistQueue();
  }
  
  private persistQueue() {
    try {
      localStorage.setItem(
        'planning-poker-offline-queue',
        JSON.stringify(this.queue)
      );
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }
  
  loadQueue() {
    try {
      const data = localStorage.getItem('planning-poker-offline-queue');
      if (data) {
        this.queue = JSON.parse(data);
        // Filter out expired actions (older than 1 hour)
        const cutoff = Date.now() - 3600000;
        this.queue = this.queue.filter(a => a.timestamp > cutoff);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }
}
```

### Remove BroadcastChannel Code
```typescript
// src/store/store.ts
// REMOVE all BroadcastChannel related code:
// - const channel = new BroadcastChannel(...)
// - channel.postMessage(...)
// - channel.onmessage = ...
// - channel.close()

// Replace with WebSocket integration in store initialization
```

## Implementation Steps
1. Install Socket.io client
2. Create WebSocket client service
3. Implement connection management
4. Add WebSocket hooks
5. Update store with WS handlers
6. Create connection status UI
7. Replace BroadcastChannel usage
8. Implement offline queue
9. Test reconnection scenarios

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 8-10 hours

## Dependencies
- Story 3: WebSocket Server Setup
- Frontend must have access to backend URL

## Testing Requirements
- WebSocket connects successfully
- Auto-reconnect works on disconnect
- Events propagate correctly
- No duplicate events on reconnect
- Offline actions queue properly
- Connection status displays accurately
- State stays synchronized

## Definition of Done
- [ ] BroadcastChannel completely removed
- [ ] WebSocket client integrated
- [ ] Connection status indicator working
- [ ] All game events synchronized
- [ ] Reconnection logic tested
- [ ] Offline queue implemented
- [ ] No console errors
- [ ] Performance acceptable
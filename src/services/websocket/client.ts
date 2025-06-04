import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../../store';
import { 
  ClientEvents, 
  ServerEvents, 
  QueuedEvent, 
  ClientEventPayloads 
} from '../../types/websocket';
import type { Player } from '../../types';

export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private eventQueue: QueuedEvent[] = [];
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTracker: NodeJS.Timeout | null = null;
  
  connect(sessionId: string, playerId: string, playerName?: string, currentPlayer?: Player) {
    if (this.socket) {
      console.log('Socket already exists, disconnecting first');
      this.disconnect();
    }
    
    // Reset connection state
    this.reconnectAttempts = 0;
    this.isConnected = false;
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    console.log('Connecting to WebSocket', {
      wsUrl,
      sessionId,
      playerId,
      playerName: playerName || currentPlayer?.name
    });
    
    this.socket = io(wsUrl, {
      auth: { 
        sessionId, 
        playerId, 
        playerName: playerName || currentPlayer?.name || 'Anonymous',
        avatar: currentPlayer?.avatar || '👤'
      },
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
      const timestamp = new Date().toISOString();
      console.log(`[WebSocket][${timestamp}] Socket connected, id:`, this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Update store connection status
      useGameStore.getState().setConnectionStatus('connected');
      console.log(`[WebSocket][${timestamp}] Connection status set to: connected`);
      
      // Note: Session joining is handled automatically by backend authentication middleware
      // No need to manually emit session:join event
      
      // Flush queued events
      this.flushEventQueue();
      
      // Start activity tracking
      this.startActivityTracking();
    });
    
    this.socket.on('disconnect', (reason) => {
      const timestamp = new Date().toISOString();
      console.log(`[WebSocket][${timestamp}] Socket disconnected:`, reason, 'id:', this.socket?.id);
      this.isConnected = false;
      useGameStore.getState().setConnectionStatus('disconnected');
      console.log(`[WebSocket][${timestamp}] Connection status set to: disconnected`);
    });
    
    this.socket.on('connect_error', (error) => {
      const timestamp = new Date().toISOString();
      console.error(`[WebSocket][${timestamp}] Connection error:`, error.message);
      this.reconnectAttempts++;
      
      // Log full error details
      console.log(`[WebSocket][${timestamp}] Full error details:`, {
        message: error.message,
        type: error.type,
        data: error.data
      });
      
      // If it's a session/player error and we haven't tried too many times, retry with delay
      if ((error.message.includes('Session not found') || 
           error.message.includes('Session has expired') ||
           error.message.includes('Player not found')) && 
          this.reconnectAttempts <= 3) {
        console.log(`[WebSocket][${timestamp}] Session/Player verification failed. Retrying in ${this.reconnectAttempts * 1000}ms...`);
        useGameStore.getState().setConnectionStatus('reconnecting');
        
        setTimeout(() => {
          if (this.socket) {
            console.log(`[WebSocket][${timestamp}] Retrying connection after session error...`);
            this.socket.connect();
          }
        }, this.reconnectAttempts * 1000);
        return;
      }
      
      if (this.reconnectAttempts > 5) {
        console.error(`[WebSocket][${timestamp}] Too many reconnection attempts, setting error status`);
        useGameStore.getState().setConnectionStatus('error');
        useGameStore.getState().setConnectionError(error.message);
      } else {
        console.log(`[WebSocket][${timestamp}] Reconnection attempt ${this.reconnectAttempts}, setting reconnecting status`);
        useGameStore.getState().setConnectionStatus('reconnecting');
      }
    });
  }
  
  private setupEventHandlers() {
    if (!this.socket) return;
    
    // Session events
    this.socket.on(ServerEvents.SESSION_JOINED, (data) => {
      const timestamp = new Date().toISOString();
      console.log(`[WebSocket][${timestamp}] SESSION_JOINED event received:`, {
        sessionId: data.sessionId,
        playersCount: data.players?.length || 0,
        hasConfig: !!data.config,
        cardValues: data.config?.cardValues,
        players: data.players?.map(p => ({ id: p.id, name: p.name }))
      });
      console.log(`[WebSocket][${timestamp}] Full SESSION_JOINED data:`, data);
      useGameStore.getState().handleSessionState(data);
    });
    
    this.socket.on(ServerEvents.SESSION_ERROR, (data) => {
      console.error('Session error:', data);
      useGameStore.getState().setConnectionStatus('error');
      useGameStore.getState().setConnectionError(data.error);
    });
    
    // Player events
    this.socket.on(ServerEvents.PLAYER_JOINED, (data) => {
      console.log('Player joined:', data);
      useGameStore.getState().handlePlayerJoined(data);
    });
    
    this.socket.on(ServerEvents.PLAYER_LEFT, (data) => {
      console.log('Player left:', data);
      useGameStore.getState().handlePlayerLeft(data);
    });
    
    this.socket.on(ServerEvents.PLAYER_UPDATED, (data) => {
      console.log('Player updated:', data);
      useGameStore.getState().handlePlayerUpdated(data);
    });
    
    this.socket.on(ServerEvents.PLAYER_RECONNECTED, (data) => {
      console.log('Player reconnected:', data);
      useGameStore.getState().handleSessionState(data.sessionState);
    });

    this.socket.on(ServerEvents.PLAYER_REMOVED, (data) => {
      console.log('Player removed:', data);
      useGameStore.getState().handlePlayerLeft({ playerId: data.playerId });
    });

    this.socket.on(ServerEvents.PLAYER_PROMOTED, (data) => {
      console.log('Player promoted:', data);
      // Update the new host
      useGameStore.getState().handlePlayerUpdated({ player: data.newHost });
      // Update the previous host if exists
      if (data.previousHost) {
        useGameStore.getState().handlePlayerUpdated({ player: data.previousHost });
      }
    });

    this.socket.on(ServerEvents.PLAYER_STATUS_CHANGED, (data) => {
      console.log('Player status changed:', data);
      // Update player online status in the store
      const players = useGameStore.getState().players;
      const updatedPlayers = players.map(p => 
        p.id === data.playerId 
          ? { ...p, isOnline: data.isOnline, lastSeenAt: data.lastSeenAt.toString() }
          : p
      );
      useGameStore.getState().syncState({ players: updatedPlayers });
    });
    
    // Voting events
    this.socket.on(ServerEvents.VOTE_SUBMITTED, (data) => {
      console.log('Vote submitted:', data);
      useGameStore.getState().handleVoteSubmitted(data);
    });
    
    this.socket.on(ServerEvents.CARDS_REVEALED, (data) => {
      console.log('Cards revealed:', data);
      useGameStore.getState().handleCardsRevealed(data);
    });
    
    this.socket.on(ServerEvents.GAME_RESET, (data) => {
      console.log('Game reset:', data);
      useGameStore.getState().handleGameReset(data);
    });
    
    // Story events
    this.socket.on(ServerEvents.STORY_CREATED, (data) => {
      console.log('Story created:', data);
      useGameStore.getState().handleStoryCreated(data);
    });

    this.socket.on(ServerEvents.STORY_UPDATED, (data) => {
      console.log('Story updated:', data);
      useGameStore.getState().handleStoryUpdated(data);
    });

    this.socket.on(ServerEvents.STORY_DELETED, (data) => {
      console.log('Story deleted:', data);
      useGameStore.getState().handleStoryDeleted(data);
    });
    
    // Timer events
    this.socket.on(ServerEvents.TIMER_UPDATED, (data) => {
      console.log('Timer updated:', data);
      useGameStore.getState().handleTimerUpdated(data);
    });
    
    // Connection events
    this.socket.on(ServerEvents.CONNECTION_ERROR, (data) => {
      console.error('Connection error:', data);
      useGameStore.getState().setConnectionStatus('error');
      useGameStore.getState().setConnectionError(data.error);
    });
    
    // Heartbeat
    this.socket.on(ServerEvents.HEARTBEAT_RESPONSE, () => {
      // Update connection activity
      useGameStore.getState().updateLastSync();
    });
  }
  
  emit<E extends keyof ClientEventPayloads>(
    event: E, 
    data: ClientEventPayloads[E]
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
  
  private startActivityTracking() {
    // Clear existing intervals
    this.stopActivityTracking();
    
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit(ClientEvents.HEARTBEAT, {
          timestamp: Date.now()
        });
      }
    }, 30000);

    // Send activity updates every 60 seconds
    this.activityTracker = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit(ClientEvents.PLAYER_ACTIVITY, {});
      }
    }, 60000);

    // Track user activity for immediate updates
    this.setupActivityListeners();
  }

  private stopActivityTracking() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.activityTracker) {
      clearInterval(this.activityTracker);
      this.activityTracker = null;
    }
    this.removeActivityListeners();
  }

  private setupActivityListeners() {
    // Listen for user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Throttle activity updates to avoid spam
      if (this.isConnected && this.socket) {
        this.socket.emit(ClientEvents.PLAYER_ACTIVITY, {});
      }
    };

    // Throttle to send at most once per 5 seconds
    let lastActivitySent = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastActivitySent > 5000) {
        handleActivity();
        lastActivitySent = now;
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledHandler);
    });

    // Store reference for cleanup
    (this as unknown as { activityHandler: () => void }).activityHandler = throttledHandler;
    (this as unknown as { activityEvents: string[] }).activityEvents = activityEvents;
  }

  private removeActivityListeners() {
    const context = this as unknown as { activityHandler?: () => void; activityEvents?: string[] };
    if (context.activityHandler && context.activityEvents) {
      context.activityEvents.forEach((event: string) => {
        document.removeEventListener(event, context.activityHandler!);
      });
      delete context.activityHandler;
      delete context.activityEvents;
    }
  }

  // Player management methods
  removePlayer(playerId: string) {
    this.emit(ClientEvents.PLAYER_REMOVE, { playerId });
  }

  promotePlayer(playerId: string) {
    this.emit(ClientEvents.PLAYER_PROMOTE, { playerId });
  }

  updatePlayerActivity() {
    this.emit(ClientEvents.PLAYER_ACTIVITY, {});
  }

  // Story management methods
  createStory(title: string, description?: string, orderIndex?: number) {
    this.emit(ClientEvents.STORY_CREATE, { title, description, orderIndex });
  }

  updateStory(storyId: string, title?: string, description?: string, finalEstimate?: string) {
    this.emit(ClientEvents.STORY_UPDATE, { storyId, title, description, finalEstimate });
  }

  deleteStory(storyId: string) {
    this.emit(ClientEvents.STORY_DELETE, { storyId });
  }

  disconnect() {
    // Stop activity tracking
    this.stopActivityTracking();
    
    if (this.socket) {
      // Remove all listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.eventQueue = [];
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
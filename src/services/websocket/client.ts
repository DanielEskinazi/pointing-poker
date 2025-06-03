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
  
  connect(sessionId: string, playerId: string, token: string, currentPlayer?: Player) {
    if (this.socket) {
      console.log('Socket already exists, disconnecting first');
      this.disconnect();
    }
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    console.log('Connecting to WebSocket', {
      wsUrl,
      sessionId,
      playerId,
      hasToken: !!token,
      playerName: currentPlayer?.name
    });
    
    this.socket = io(wsUrl, {
      auth: { 
        sessionId, 
        playerId, 
        token,
        playerName: currentPlayer?.name || 'Anonymous',
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
      
      // If it's an authentication error and we haven't tried too many times, retry with delay
      if (error.message.includes('Authentication failed') && this.reconnectAttempts <= 3) {
        console.log(`[WebSocket][${timestamp}] Authentication failed, likely race condition. Retrying in ${this.reconnectAttempts * 1000}ms...`);
        useGameStore.getState().setConnectionStatus('reconnecting');
        
        setTimeout(() => {
          if (this.socket) {
            console.log(`[WebSocket][${timestamp}] Retrying connection after auth failure...`);
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
    this.socket.on(ServerEvents.STORY_UPDATED, (data) => {
      console.log('Story updated:', data);
      useGameStore.getState().handleStoryUpdated(data);
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
    this.socket.on(ServerEvents.HEARTBEAT_RESPONSE, (data) => {
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
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
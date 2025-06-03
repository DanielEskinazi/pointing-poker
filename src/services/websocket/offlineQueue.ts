import { QueuedAction, ClientEvents } from '../../types/websocket';
import { WebSocketClient } from './client';

function generateId(): string {
  return crypto.randomUUID();
}

export class OfflineQueueManager {
  private queue: QueuedAction[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly QUEUE_STORAGE_KEY = 'planning-poker-offline-queue';
  
  constructor() {
    this.loadQueue();
  }
  
  enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
    }
    
    const queuedAction: QueuedAction = {
      ...action,
      id: generateId(),
      timestamp: Date.now()
    };
    
    this.queue.push(queuedAction);
    
    // Persist to localStorage
    this.persistQueue();
  }
  
  async flush(wsClient: WebSocketClient) {
    if (this.queue.length === 0) return;
    
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
  
  private async processAction(action: QueuedAction, wsClient: WebSocketClient): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert action back to WebSocket event
        wsClient.emit(action.type as keyof ClientEvents, action.data as ClientEvents[keyof ClientEvents]);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private persistQueue() {
    try {
      localStorage.setItem(
        this.QUEUE_STORAGE_KEY,
        JSON.stringify(this.queue)
      );
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }
  
  loadQueue() {
    try {
      const data = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
        // Filter out expired actions (older than 1 hour)
        const cutoff = Date.now() - 3600000;
        this.queue = this.queue.filter(a => a.timestamp > cutoff);
        this.persistQueue(); // Save cleaned queue
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
      this.queue = [];
    }
  }
  
  clearQueue() {
    this.queue = [];
    this.persistQueue();
  }
  
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();
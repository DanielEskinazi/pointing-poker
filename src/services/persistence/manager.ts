import { compress, decompress } from 'lz-string';
import { encrypt, decrypt } from '../../utils/crypto';
import type { GameState } from '../../types';

export interface PersistedState {
  version: number;
  timestamp: number;
  session: {
    id: string | null;
    config: {
      cardValues: (number | string)[];
      isConfigured: boolean;
    };
  };
  game: {
    currentStory: string;
    isRevealing: boolean;
    timer: number;
    players: GameState['players'];
  };
  ui: {
    theme?: 'light' | 'dark';
    soundEnabled?: boolean;
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
        session: {
          id: null,
          config: {
            cardValues: [1, 2, 3, 5, 8, 13, '?', 'coffee'],
            isConfigured: false
          }
        },
        game: {
          currentStory: '',
          isRevealing: false,
          timer: 60,
          players: []
        },
        ui: {},
        ...state
      };
      
      const compressed = compress(JSON.stringify(data));
      const encrypted = await encrypt(compressed, this.getEncryptionKey());
      
      localStorage.setItem(this.STORAGE_KEY, encrypted);
      await this.saveToIndexedDB(encrypted);
      
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
  
  async load(): Promise<PersistedState | null> {
    try {
      let encrypted = localStorage.getItem(this.STORAGE_KEY);
      
      if (!encrypted) {
        encrypted = await this.loadFromIndexedDB();
      }
      
      if (!encrypted) return null;
      
      // Try to decrypt the data
      let compressed: string;
      try {
        compressed = await decrypt(encrypted, this.getEncryptionKey());
      } catch (decryptError) {
        console.warn('Failed to decrypt persisted state, clearing corrupt data:', decryptError);
        this.clear();
        return null;
      }
      
      // Try to decompress the data
      const json = decompress(compressed);
      if (!json) {
        console.warn('Failed to decompress persisted state, clearing corrupt data');
        this.clear();
        return null;
      }
      
      // Try to parse the JSON
      let data: PersistedState;
      try {
        data = JSON.parse(json) as PersistedState;
      } catch (parseError) {
        console.warn('Failed to parse persisted state JSON, clearing corrupt data:', parseError);
        this.clear();
        return null;
      }
      
      if (!data || typeof data !== 'object' || !data.timestamp) {
        console.warn('Invalid persisted state structure, clearing corrupt data:', data);
        this.clear();
        return null;
      }
      
      if (Date.now() - data.timestamp > this.MAX_AGE) {
        this.clear();
        return null;
      }
      
      return this.migrate(data);
      
    } catch (error) {
      console.error('Unexpected error loading persisted state, clearing all data:', error);
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
    
    const migrated = { ...data };
    
    if (data.version < 1) {
      // Future migrations can be added here
    }
    
    migrated.version = this.CURRENT_VERSION;
    return migrated;
  }
  
  private getEncryptionKey(): string {
    const factors = [
      navigator.userAgent,
      window.location.origin,
      'planning-poker-v1'
    ];
    return factors.join('|');
  }
  
  private async saveToIndexedDB(data: string): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(['state'], 'readwrite');
      await tx.objectStore('state').put({ id: 'current', data, timestamp: Date.now() });
    } catch (error) {
      console.error('IndexedDB save failed:', error);
    }
  }
  
  private async loadFromIndexedDB(): Promise<string | null> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(['state'], 'readonly');
      const record = await tx.objectStore('state').get('current');
      return record?.data || null;
    } catch (error) {
      console.error('IndexedDB load failed:', error);
      return null;
    }
  }
  
  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(['state'], 'readwrite');
      await tx.objectStore('state').clear();
    } catch (error) {
      console.error('IndexedDB clear failed:', error);
    }
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
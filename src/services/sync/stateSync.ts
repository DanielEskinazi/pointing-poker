import type { GameState } from '../../types';
import { useGameStore } from '../../store';

export interface Conflict {
  type: 'MISSING_VOTE' | 'STORY_MISMATCH' | 'PLAYER_MISMATCH';
  resolution: 'RESUBMIT' | 'USE_SERVER' | 'USE_LOCAL' | 'MERGE';
  description: string;
}

export class StateSync {
  async syncGameState(sessionId: string): Promise<void> {
    try {
      // In a client-side only app, we don't have a server to sync with
      // This would be used in a full-stack implementation
      // For now, we'll just log that sync was attempted
      console.log('State sync attempted for session:', sessionId);
      
      // In a real implementation, you would:
      // 1. Fetch latest session state from server
      // 2. Compare with local state
      // 3. Resolve any conflicts
      // 4. Update store with merged state
      
      // Since we're using WebSocket for real-time sync,
      // the state should already be in sync across connected clients
      
    } catch (error) {
      console.error('State sync failed:', error);
      throw error;
    }
  }
  
  detectConflicts(localState: GameState, serverState: GameState): Conflict[] {
    const conflicts: Conflict[] = [];
    
    // Check for story mismatch
    if (localState.currentStory !== serverState.currentStory) {
      conflicts.push({
        type: 'STORY_MISMATCH',
        resolution: 'USE_SERVER',
        description: `Local story "${localState.currentStory}" differs from server story "${serverState.currentStory}"`
      });
    }
    
    // Check for player count mismatch
    if (localState.players.length !== serverState.players.length) {
      conflicts.push({
        type: 'PLAYER_MISMATCH',
        resolution: 'MERGE',
        description: `Player count differs: local=${localState.players.length}, server=${serverState.players.length}`
      });
    }
    
    // Check for vote conflicts (players with different vote states)
    for (const localPlayer of localState.players) {
      const serverPlayer = serverState.players.find(p => p.id === localPlayer.id);
      if (!serverPlayer) {
        conflicts.push({
          type: 'PLAYER_MISMATCH',
          resolution: 'USE_SERVER',
          description: `Player ${localPlayer.name} exists locally but not on server`
        });
      } else if (localPlayer.selectedCard !== serverPlayer.selectedCard) {
        conflicts.push({
          type: 'MISSING_VOTE',
          resolution: 'RESUBMIT',
          description: `Vote mismatch for ${localPlayer.name}: local=${localPlayer.selectedCard}, server=${serverPlayer.selectedCard}`
        });
      }
    }
    
    return conflicts;
  }
  
  resolveConflicts(conflicts: Conflict[], localState: GameState, serverState: GameState): GameState {
    const resolvedState = { ...localState };
    
    for (const conflict of conflicts) {
      switch (conflict.resolution) {
        case 'USE_SERVER':
          // Use server state for this conflict
          if (conflict.type === 'STORY_MISMATCH') {
            resolvedState.currentStory = serverState.currentStory;
          } else if (conflict.type === 'PLAYER_MISMATCH') {
            resolvedState.players = serverState.players;
          }
          break;
          
        case 'USE_LOCAL':
          // Keep local state (already the case)
          break;
          
        case 'MERGE':
          // Merge states intelligently
          if (conflict.type === 'PLAYER_MISMATCH') {
            // Merge player lists, preferring server for existing players
            const mergedPlayers = [...serverState.players];
            for (const localPlayer of localState.players) {
              if (!mergedPlayers.find(p => p.id === localPlayer.id)) {
                mergedPlayers.push(localPlayer);
              }
            }
            resolvedState.players = mergedPlayers;
          }
          break;
          
        case 'RESUBMIT':
          // Mark for resubmission (would trigger user action)
          console.warn('Conflict requires resubmission:', conflict.description);
          break;
      }
    }
    
    return resolvedState;
  }
  
  async performSync(sessionId: string): Promise<void> {
    try {
      // In a full implementation, fetch server state
      // const serverState = await fetchServerState(sessionId);
      
      // For now, just update the last sync time
      useGameStore.getState().updateLastSync();
      
      console.log('Sync completed for session:', sessionId);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }
}

export const stateSync = new StateSync();
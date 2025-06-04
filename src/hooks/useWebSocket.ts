import { useEffect, useRef } from 'react';
import { wsClient } from '../services/websocket/client';
import { useGameStore } from '../store';
import { offlineQueue } from '../services/websocket/offlineQueue';

export const useWebSocket = (playerId: string | null) => {
  const { sessionId, connectionStatus } = useGameStore();
  const connectedRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const lastPlayerIdRef = useRef<string | null>(null);
  
  // No authentication tokens needed for WebSocket connection
  
  useEffect(() => {
    let mounted = true;
    
    const connectWebSocket = async () => {
      const timestamp = new Date().toISOString();
      console.log(`[WebSocket][${timestamp}] useEffect triggered:`, { 
        sessionId, 
        playerId,
        hasSessionId: !!sessionId,
        hasPlayerId: !!playerId,
        lastSessionId: lastSessionIdRef.current,
        lastPlayerId: lastPlayerIdRef.current,
        sessionChanged: sessionId !== lastSessionIdRef.current,
        playerChanged: playerId !== lastPlayerIdRef.current,
        isConnected: connectedRef.current,
        wsClientConnected: wsClient.isSocketConnected()
      });
      
      // Check if we need to connect/reconnect
      const shouldConnect = sessionId !== lastSessionIdRef.current || 
                           playerId !== lastPlayerIdRef.current ||
                           (playerId && !connectedRef.current);
      
      if (!shouldConnect) {
        console.log(`[WebSocket][${timestamp}] No changes detected and already connected, skipping`);
        return;
      }
      
      // Update the last known values
      lastSessionIdRef.current = sessionId;
      lastPlayerIdRef.current = playerId;
      
      if (!sessionId) {
        console.log(`[WebSocket][${timestamp}] No sessionId, skipping connection`);
        // Disconnect if we had a connection
        if (connectedRef.current) {
          console.log(`[WebSocket][${timestamp}] Disconnecting due to null sessionId`);
          wsClient.disconnect();
          connectedRef.current = false;
        }
        return;
      }
      
      console.log(`[WebSocket][${timestamp}] Connection check:`, { 
        playerId, 
        connectedRef: connectedRef.current,
        connectionStatus 
      });
      
      // Only connect if we have a player ID (meaning user has joined the session)
      if (!playerId) {
        console.log(`[WebSocket][${timestamp}] No playerId found, waiting for user to join session`);
        // Disconnect if we had a connection
        if (connectedRef.current) {
          console.log(`[WebSocket][${timestamp}] Disconnecting due to null playerId`);
          wsClient.disconnect();
          connectedRef.current = false;
        }
        return;
      }
      
      // Disconnect any existing connection when playerId changes or reconnecting
      if (connectedRef.current || wsClient.isSocketConnected()) {
        console.log(`[WebSocket][${timestamp}] Disconnecting existing connection before reconnecting`);
        wsClient.disconnect();
        connectedRef.current = false;
        useGameStore.getState().setConnectionStatus('disconnected');
        // Small delay to ensure clean disconnect
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!mounted) return;
      
      connectedRef.current = true;
      console.log(`[WebSocket][${timestamp}] Starting WebSocket connection...`);
      
      // Set connecting status
      useGameStore.getState().setConnectionStatus('connecting');
      
      // Get current player info for authentication from store at connection time
      const players = useGameStore.getState().players;
      const currentPlayer = players.find(p => p.id === playerId);
      console.log(`[WebSocket][${timestamp}] Current player found:`, !!currentPlayer, currentPlayer?.name);
      
      // Connect with minimal delay to ensure state is settled
      setTimeout(() => {
        if (mounted && playerId && sessionId) {
          console.log(`[WebSocket][${timestamp}] Connecting to WebSocket...`, {
            sessionId,
            playerId,
            playerName: currentPlayer?.name
          });
          wsClient.connect(sessionId, playerId, currentPlayer?.name, currentPlayer);
        } else {
          console.log(`[WebSocket][${timestamp}] Skipping connection - component unmounted or missing data`);
        }
      }, 100);
    };
    
    connectWebSocket();
    
    return () => {
      mounted = false;
      const cleanupTimestamp = new Date().toISOString();
      console.log(`[WebSocket][${cleanupTimestamp}] Cleanup: disconnecting WebSocket`);
      connectedRef.current = false;
      wsClient.disconnect();
    };
  }, [sessionId, playerId]); // Only depend on sessionId and playerId, not players

  // Handle offline queue when reconnecting
  useEffect(() => {
    if (connectionStatus === 'connected') {
      offlineQueue.flush(wsClient).catch(console.error);
    }
  }, [connectionStatus]);
  
  return {
    emit: wsClient.emit.bind(wsClient),
    connected: connectionStatus === 'connected',
    connectionStatus,
    isConnected: wsClient.isSocketConnected.bind(wsClient)
  };
};
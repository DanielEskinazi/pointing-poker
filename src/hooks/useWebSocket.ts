import { useEffect, useRef } from 'react';
import { wsClient } from '../services/websocket/client';
import { useGameStore } from '../store';
import { offlineQueue } from '../services/websocket/offlineQueue';

export const useWebSocket = () => {
  const { sessionId, connectionStatus, players } = useGameStore();
  const connectedRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  
  // Get current player ID from localStorage if available
  const getPlayerId = () => {
    if (!sessionId) return null;
    return localStorage.getItem(`player_${sessionId}`);
  };
  
  // Get authentication token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
  };
  
  // Extract playerId as a reactive value
  const playerId = getPlayerId();
  
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[WebSocket][${timestamp}] useEffect triggered:`, { 
      sessionId, 
      playerId,
      hasSessionId: !!sessionId,
      hasPlayerId: !!playerId,
      lastSessionId: lastSessionIdRef.current,
      sessionChanged: sessionId !== lastSessionIdRef.current
    });
    
    // Skip if sessionId hasn't actually changed
    if (sessionId === lastSessionIdRef.current) {
      console.log(`[WebSocket][${timestamp}] SessionId unchanged, skipping`);
      return;
    }
    
    // Update the last known sessionId
    lastSessionIdRef.current = sessionId;
    
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
    
    const token = getAuthToken();
    
    console.log(`[WebSocket][${timestamp}] Connection check:`, { 
      playerId, 
      hasToken: !!token, 
      connectedRef: connectedRef.current,
      connectionStatus 
    });
    
    // Only connect if we have a player ID (meaning user has joined the session)
    if (!playerId) {
      console.log(`[WebSocket][${timestamp}] No playerId found, waiting for user to join session`);
      return;
    }
    
    // Prevent duplicate connections
    if (connectedRef.current) {
      console.log(`[WebSocket][${timestamp}] Already connected, skipping duplicate connection`);
      return;
    }
    
    connectedRef.current = true;
    console.log(`[WebSocket][${timestamp}] Starting WebSocket connection...`);
    
    // Set connecting status
    useGameStore.getState().setConnectionStatus('connecting');
    
    // Get current player info for authentication (use a stable reference)
    const currentPlayer = players.find(p => p.id === playerId);
    console.log(`[WebSocket][${timestamp}] Current player found:`, !!currentPlayer, currentPlayer?.name);
    
    // Since playerId dependency ensures player exists, connect immediately with small delay
    setTimeout(() => {
      console.log(`[WebSocket][${timestamp}] Connecting to WebSocket (playerId confirmed)...`);
      wsClient.connect(sessionId, playerId, token || '', currentPlayer);
    }, 300);
    
    return () => {
      const cleanupTimestamp = new Date().toISOString();
      console.log(`[WebSocket][${cleanupTimestamp}] Cleanup: disconnecting WebSocket`);
      connectedRef.current = false;
      wsClient.disconnect();
    };
  }, [sessionId, playerId]); // Depend on both sessionId and playerId

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
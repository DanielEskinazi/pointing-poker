import { useEffect, useRef } from "react";
import { wsClient } from "../services/websocket/client";
import { useGameStore } from "../store";
import { offlineQueue } from "../services/websocket/offlineQueue";

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

      // Check if we need to connect/reconnect
      const shouldConnect =
        sessionId !== lastSessionIdRef.current ||
        playerId !== lastPlayerIdRef.current ||
        (playerId && !connectedRef.current);

      if (!shouldConnect) {
        return;
      }

      // Update the last known values
      lastSessionIdRef.current = sessionId;
      lastPlayerIdRef.current = playerId;

      if (!sessionId) {
        // Disconnect if we had a connection
        if (connectedRef.current) {
          wsClient.disconnect();
          connectedRef.current = false;
        }
        return;
      }

      // Only connect if we have a player ID (meaning user has joined the session)
      if (!playerId) {
        // Disconnect if we had a connection
        if (connectedRef.current) {
          wsClient.disconnect();
          connectedRef.current = false;
        }
        return;
      }

      // Disconnect any existing connection when playerId changes or reconnecting
      if (connectedRef.current || wsClient.isSocketConnected()) {
        wsClient.disconnect();
        connectedRef.current = false;
        useGameStore.getState().setConnectionStatus("disconnected");
        // Small delay to ensure clean disconnect
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!mounted) return;

      connectedRef.current = true;

      // Set connecting status
      useGameStore.getState().setConnectionStatus("connecting");

      // Get current player info for authentication from store at connection time
      const players = useGameStore.getState().players;
      const currentPlayer = players.find((p) => p.id === playerId);

      // Connect with minimal delay to ensure state is settled
      setTimeout(() => {
        if (mounted && playerId && sessionId) {
          wsClient.connect(
            sessionId,
            playerId,
            currentPlayer?.name,
            currentPlayer
          );
        } else {
          console.log(
            `[WebSocket][${timestamp}] Skipping connection - component unmounted or missing data`
          );
        }
      }, 100);
    };

    connectWebSocket();

    return () => {
      mounted = false;
      connectedRef.current = false;
      wsClient.disconnect();
    };
  }, [sessionId, playerId]); // Only depend on sessionId and playerId, not players or connectionStatus (using getState directly)

  // Handle offline queue when reconnecting
  useEffect(() => {
    if (connectionStatus === "connected") {
      offlineQueue.flush(wsClient).catch(console.error);
    }
  }, [connectionStatus]);

  return {
    emit: wsClient.emit.bind(wsClient),
    connected: connectionStatus === "connected",
    connectionStatus,
    isConnected: wsClient.isSocketConnected.bind(wsClient),
  };
};

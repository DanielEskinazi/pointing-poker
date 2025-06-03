import { useEffect, useState } from 'react';
import { useGameStore } from '../store';

export const useSessionRecovery = () => {
  const [recovering, setRecovering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sessionId, clearSession } = useGameStore();
  
  useEffect(() => {
    const recoverSession = async () => {
      if (!sessionId) {
        setRecovering(false);
        return;
      }
      
      try {
        // Since this is a client-side only app using BroadcastChannel,
        // we can't validate session existence with a server.
        // We just need to ensure the persisted state is valid.
        
        // For now, we'll assume the session is valid if we have one
        // In a real implementation with backend, you would:
        // 1. Validate session still exists on server
        // 2. Reconnect WebSocket if needed
        // 3. Sync latest state
        
        console.log('Session recovered:', sessionId);
        setRecovering(false);
      } catch (error) {
        console.error('Session recovery failed:', error);
        setError('Unable to recover session. Please rejoin.');
        clearSession();
        setRecovering(false);
      }
    };
    
    // Add a small delay to show the recovery UI
    const timeout = setTimeout(() => {
      recoverSession();
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [sessionId, clearSession]);
  
  return { recovering, error };
};
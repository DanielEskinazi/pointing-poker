import { useGameStore } from "../index";
import { clearPersistedState } from "../middleware/persistence";

export const authActions = {
  logout: async () => {
    try {
      // Clear persisted state
      await clearPersistedState();

      // Clear store state
      useGameStore.getState().clearSession();

      // Clear any other cached data
      // In a full implementation, you might also:
      // - Disconnect WebSocket
      // - Clear React Query cache
      // - Invalidate any tokens

      console.log("Logout completed successfully");

      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails, we should still redirect
      window.location.href = "/";
    }
  },

  clearExpiredSessions: async () => {
    try {
      // Clean up old sessions from storage
      const allKeys = Object.keys(localStorage);
      const sessionKeys = allKeys.filter(
        (k) => k.startsWith("session-") || k.startsWith("planning-poker-")
      );

      const EXPIRY_TIME = 48 * 60 * 60 * 1000; // 48 hours

      for (const key of sessionKeys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.timestamp && Date.now() - data.timestamp > EXPIRY_TIME) {
            localStorage.removeItem(key);
            console.log("Removed expired session:", key);
          }
        } catch {
          // If we can't parse the data, remove it
          localStorage.removeItem(key);
        }
      }

      // Also clean up IndexedDB if needed
      try {
        const dbRequest = indexedDB.open("PlanningPokerDB", 1);
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          const tx = db.transaction(["state"], "readonly");
          const store = tx.objectStore("state");
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            const expiredRecords = records.filter(
              (record) =>
                record.timestamp && Date.now() - record.timestamp > EXPIRY_TIME
            );

            if (expiredRecords.length > 0) {
              const deleteTx = db.transaction(["state"], "readwrite");
              const deleteStore = deleteTx.objectStore("state");
              expiredRecords.forEach((record) => {
                deleteStore.delete(record.id);
              });
              console.log(
                "Cleaned up expired IndexedDB records:",
                expiredRecords.length
              );
            }
          };
        };
      } catch (error) {
        console.error("Failed to clean IndexedDB:", error);
      }
    } catch (error) {
      console.error("Failed to clear expired sessions:", error);
    }
  },

  // Initialize cleanup on app start
  initCleanup: () => {
    // Clean up expired sessions immediately
    authActions.clearExpiredSessions();

    // Set up periodic cleanup (every hour)
    setInterval(() => {
      authActions.clearExpiredSessions();
    }, 60 * 60 * 1000);
  },

  // Debug utility to force clear all persistence data
  clearAllPersistenceData: async () => {
    try {
      console.log('🧹 Clearing all persistence data...');
      
      // Clear all localStorage data related to planning poker
      const allKeys = Object.keys(localStorage);
      const planningPokerKeys = allKeys.filter(k => 
        k.startsWith('planning-poker-') || 
        k.startsWith('session-') || 
        k.includes('poker')
      );
      
      planningPokerKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('Removed localStorage key:', key);
      });
      
      // Clear IndexedDB
      try {
        const dbRequest = indexedDB.open('PlanningPokerDB', 1);
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          const tx = db.transaction(['state'], 'readwrite');
          tx.objectStore('state').clear();
          console.log('Cleared IndexedDB state');
        };
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
      
      // Also clear the main persistence state
      await clearPersistedState();
      
      console.log('✅ All persistence data cleared successfully');
      console.log('💡 You can call window.clearPersistenceData() to run this again');
      
    } catch (error) {
      console.error('Failed to clear persistence data:', error);
    }
  },
};

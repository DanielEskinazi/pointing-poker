/**
 * AuthTokenManager handles token storage with tab and session specificity
 * to prevent token conflicts when multiple tabs or sessions are open
 */
export class AuthTokenManager {
  private static instance: AuthTokenManager | null = null;
  private tabId: string;
  private sessionId: string | null = null;

  private constructor() {
    // Generate or retrieve tab ID
    this.tabId = this.getOrCreateTabId();
  }

  static getInstance(): AuthTokenManager {
    if (!AuthTokenManager.instance) {
      AuthTokenManager.instance = new AuthTokenManager();
    }
    return AuthTokenManager.instance;
  }

  private getOrCreateTabId(): string {
    // Try to get existing tab ID from session storage (survives refreshes)
    let tabId = sessionStorage.getItem('planning_poker_tab_id');
    
    if (!tabId) {
      // Generate new tab ID
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('planning_poker_tab_id', tabId);
    }
    
    return tabId;
  }

  setSessionContext(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getToken(): string | null {
    // Priority order for token retrieval:
    // 1. Tab-specific token (survives session switches in same tab)
    // 2. Session-specific token (shared across tabs for same session)
    // 3. Global token (legacy fallback)
    
    const tabToken = localStorage.getItem(`auth_token_tab_${this.tabId}`);
    if (tabToken) return tabToken;
    
    if (this.sessionId) {
      const sessionToken = localStorage.getItem(`auth_token_session_${this.sessionId}`);
      if (sessionToken) return sessionToken;
    }
    
    // Legacy fallback
    return localStorage.getItem('auth_token');
  }

  setToken(token: string, isHost: boolean = false): void {
    // Always store tab-specific token
    localStorage.setItem(`auth_token_tab_${this.tabId}`, token);
    
    // Store session-specific token if we have session context
    if (this.sessionId) {
      localStorage.setItem(`auth_token_session_${this.sessionId}`, token);
      
      // Store host status for this session
      if (isHost) {
        localStorage.setItem(`is_host_session_${this.sessionId}`, 'true');
      }
    }
    
    // Only update global token if it's a host token or no token exists
    const existingGlobalToken = localStorage.getItem('auth_token');
    if (isHost || !existingGlobalToken) {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken(): void {
    // Clear tab-specific token
    localStorage.removeItem(`auth_token_tab_${this.tabId}`);
    
    // Clear session-specific tokens if we have session context
    if (this.sessionId) {
      localStorage.removeItem(`auth_token_session_${this.sessionId}`);
      localStorage.removeItem(`is_host_session_${this.sessionId}`);
    }
    
    // Clear global token only if it matches our current token
    const currentToken = this.getToken();
    const globalToken = localStorage.getItem('auth_token');
    if (currentToken === globalToken) {
      localStorage.removeItem('auth_token');
    }
  }

  isHostForSession(sessionId: string): boolean {
    return localStorage.getItem(`is_host_session_${sessionId}`) === 'true';
  }

  getTabId(): string {
    return this.tabId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  // Clean up old tokens from other tabs/sessions
  cleanupOldTokens(): void {
    const currentTime = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('auth_token_tab_') || key.startsWith('auth_token_session_')) {
        try {
          const timestamp = parseInt(key.split('_').pop() || '0');
          if (currentTime - timestamp > maxAge) {
            localStorage.removeItem(key);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    });
  }
}

// Export singleton instance
export const authTokenManager = AuthTokenManager.getInstance();
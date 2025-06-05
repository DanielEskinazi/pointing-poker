# Story Creation Authorization Debugging

## Issue Summary
Users are experiencing 403 "Host authorization required" errors when trying to create stories, even when they should be the host of the session. This affects the core functionality of the planning poker application.

## Investigation Timeline

### Observed Behavior
1. User creates a new session at `localhost:5173`
2. User enters their name and creates the session
3. User attempts to create a story
4. **Result**: 403 Forbidden error with "Host authorization required"

### Root Cause Analysis

#### 1. Authentication Token Storage Issue
The primary issue is with how authentication tokens are stored and managed in the frontend:

```javascript
// Current implementation in src/services/api/client.ts
private getToken(): string | null {
  return localStorage.getItem('auth_token');
}
```

**Problem**: The `auth_token` is stored globally in localStorage and gets overwritten when:
- A new player joins the session (overwrites with non-host token)
- Multiple tabs are open with different sessions
- Page is refreshed and session state is restored

#### 2. Timeline of Failure (From Logs)

```
01:43:46 - Host "dab" creates session (player: 25b527ea-...)
01:43:55 - Host successfully creates story ✅
01:47:10 - New player "dav" joins (player: c6dd1945-...)
           └─> auth_token in localStorage is overwritten with dav's token
01:48:16 - Story creation fails with 403 ❌ (using dav's non-host token)
```

#### 3. Frontend State Inconsistency
The error "Cannot read properties of undefined (reading 'isActive')" indicates that:
- The API returns story data with nullable fields
- Frontend expects non-nullable fields
- Already partially fixed with `newStory.isActive ?? true`

## Successful Case Analysis

Latest test showed success:
```
01:54:38 - Session created (session: b708b1a9-...)
01:54:52 - Story created successfully with "userIsHost":true ✅
```

This worked because no other player joined to overwrite the auth token.

## Proposed Solutions

### 1. Tab-Specific Token Storage (Recommended)

```typescript
// Enhanced token storage with tab/session context
class AuthTokenManager {
  private tabId: string;
  private sessionId: string;
  
  constructor(tabId: string, sessionId: string) {
    this.tabId = tabId;
    this.sessionId = sessionId;
  }
  
  getToken(): string | null {
    // Try tab-specific token first
    const tabToken = localStorage.getItem(`auth_token_${this.tabId}`);
    if (tabToken) return tabToken;
    
    // Fall back to session-specific token
    return localStorage.getItem(`auth_token_${this.sessionId}`);
  }
  
  setToken(token: string): void {
    // Store both tab-specific and session-specific
    localStorage.setItem(`auth_token_${this.tabId}`, token);
    localStorage.setItem(`auth_token_${this.sessionId}`, token);
  }
  
  clearToken(): void {
    localStorage.removeItem(`auth_token_${this.tabId}`);
    localStorage.removeItem(`auth_token_${this.sessionId}`);
  }
}
```

### 2. Session Context in API Client

Modify `src/services/api/client.ts` to be session-aware:

```typescript
class ApiClient {
  private sessionContext: { sessionId?: string; tabId?: string } = {};
  
  setSessionContext(sessionId: string, tabId: string) {
    this.sessionContext = { sessionId, tabId };
  }
  
  private getToken(): string | null {
    const { sessionId, tabId } = this.sessionContext;
    
    // Try multiple token locations in order
    const tokens = [
      tabId && localStorage.getItem(`auth_token_${tabId}`),
      sessionId && localStorage.getItem(`auth_token_${sessionId}`),
      localStorage.getItem('auth_token') // fallback
    ];
    
    return tokens.find(token => token !== null) || null;
  }
}
```

### 3. Token Validation on Join

When a player joins a session, validate if they're overwriting a host token:

```typescript
// In JoinGame.tsx
if (result.data.token) {
  const existingToken = localStorage.getItem('auth_token');
  
  // Only overwrite if no existing token or if joining as host
  if (!existingToken || result.data.isHost) {
    localStorage.setItem('auth_token', result.data.token);
  }
  
  // Always store tab-specific token
  localStorage.setItem(`auth_token_${tabId}`, result.data.token);
}
```

### 4. Backend Response Enhancement

Ensure backend always returns complete data:

```typescript
// In story.service.ts
return {
  ...story,
  isActive: story.isActive ?? true,
  createdAt: story.createdAt ?? new Date(),
  // ... other fields with defaults
};
```

## Implementation Status ✅

### Completed Tasks

1. **AuthTokenManager Created** (`src/services/auth/tokenManager.ts`)
   - Singleton pattern for consistent token management
   - Tab-specific token storage using sessionStorage for tab ID
   - Fallback chain: tab token → session token → global token
   - Host status tracking per session
   - Old token cleanup functionality

2. **API Client Updated** (`src/services/api/client.ts`)
   - Integrated with AuthTokenManager
   - Added `setSessionContext()` method
   - Token retrieval now uses the new manager

3. **Components Updated**
   - **JoinGame.tsx**: Uses tab-specific tokens for players
   - **useSession hooks**: Store tokens with proper host flags
   - **App.tsx**: Sets session context on load

### How It Works

1. **Tab Identification**: Each tab gets a unique ID stored in sessionStorage
2. **Token Priority**: 
   - Tab-specific tokens take precedence (survive session switches)
   - Session-specific tokens are shared across tabs
   - Global token is legacy fallback
3. **Host Protection**: Host tokens are marked and protected from overwriting

## Implementation Priority

1. **Immediate Fix**: ✅ Tab-specific token storage implemented
2. **Short-term**: ✅ Session context added to API client
3. **Long-term**: Auth system now supports multiple concurrent sessions

## Testing Checklist

- [ ] Create session as host
- [ ] Create story successfully
- [ ] Open second tab, join as player
- [ ] Verify host can still create stories in first tab
- [ ] Refresh page and verify host permissions persist
- [ ] Test with multiple browsers/incognito windows

## Error Prevention

1. Add explicit host status display in UI
2. Show clear error messages when authorization fails
3. Add "Reconnect as Host" button if host token is lost
4. Implement token refresh mechanism before it expires

## Monitoring

Track these events in logs:
- Token overwrites in localStorage
- Host authorization failures
- Session/player mismatches
- Token expiration events
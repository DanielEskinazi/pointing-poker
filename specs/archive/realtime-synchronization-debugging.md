# Real-Time Synchronization Debugging Plan

## Problem Statement

Multi-player real-time synchronization is broken in the Planning Poker application. Players joining sessions experience:

1. **Inconsistent session configuration** - Different card values between browsers
2. **Missing players** - New players don't see existing players initially
3. **WebSocket disconnection** - Showing "Disconnected" status despite successful authentication
4. **State synchronization failures** - Requires page refresh to see correct state

## Current Symptoms

### Observed Behavior
- **Browser A (Original)**: Shows correct players and Fibonacci cards `[1,2,3,5,8,13,21,34]`
- **Browser B (New Join)**: Missing players and shows Special cards `[1,2,3,5,8,13,?,coffee]`
- **After Refresh**: Browser B shows all players correctly
- **WebSocket Status**: Both browsers show "Disconnected"

### Expected Behavior
- Both browsers should show identical player lists immediately
- Both browsers should show identical card configurations
- WebSocket status should show "Connected"
- No refresh should be required

## Root Cause Analysis

### 1. WebSocket Connection Issues
**Symptoms:**
- Frontend shows "Disconnected" 
- Backend logs show successful authentication
- Suggests connection/disconnection loop

**Potential Causes:**
- Infinite reconnection loop in `useWebSocket` hook
- CORS issues between frontend/backend
- Socket.io transport problems
- Authentication token issues

### 2. Session Configuration Synchronization
**Symptoms:**
- Different card values between browsers
- Configuration not syncing via WebSocket

**Potential Causes:**
- WebSocket `SESSION_JOINED` event missing configuration data
- Frontend not processing configuration from WebSocket correctly
- Race condition between API session loading and WebSocket connection
- Default values overriding WebSocket data

### 3. Player State Synchronization
**Symptoms:**
- New players don't see existing players initially
- API join notifications working (existing players see new ones)
- WebSocket session join not loading existing players

**Potential Causes:**
- `SESSION_JOINED` event not including all players
- Frontend `handleSessionState` not processing players correctly
- Database query timing issues
- Player state being overwritten by default values

## Systematic Debugging Plan

### Phase 1: WebSocket Connection Stability

#### Step 1.1: Isolate Connection Loop
**Objective:** Identify why WebSocket shows "Disconnected" despite backend authentication

**Actions:**
1. Add detailed connection state logging to `useWebSocket` hook
2. Track connection/disconnection events with timestamps
3. Monitor backend logs for socket lifecycle events
4. Check for multiple simultaneous connections from same player

**Files to examine:**
- `src/hooks/useWebSocket.ts`
- `src/services/websocket/client.ts`
- `backend/src/websocket/connection-manager.ts`

#### Step 1.2: Authentication Flow Analysis
**Objective:** Ensure tokens and authentication are working correctly

**Actions:**
1. Log authentication tokens being sent to WebSocket
2. Verify token validation on backend
3. Check if authentication failures cause disconnections
4. Validate session/player ID consistency

### Phase 2: Session State Synchronization

#### Step 2.1: WebSocket Event Data Analysis
**Objective:** Verify complete session data is sent via WebSocket

**Actions:**
1. Log exact `SESSION_JOINED` event payload from backend
2. Log exact data received by frontend WebSocket client
3. Compare with API session data structure
4. Verify session configuration is included

**Expected Data Structure:**
```typescript
{
  sessionId: string,
  player: PlayerInfo,
  players: PlayerInfo[],
  currentStory?: StoryInfo,
  timer?: TimerState,
  config: {
    cardValues: string[],
    allowSpectators: boolean,
    autoRevealCards: boolean,
    timerSeconds: number
  }
}
```

#### Step 2.2: Frontend State Processing
**Objective:** Ensure frontend correctly processes WebSocket session data

**Actions:**
1. Log `handleSessionState` input and output
2. Verify card values are extracted from config
3. Check if existing state is being preserved incorrectly
4. Validate player array processing

### Phase 3: Timing and Race Conditions

#### Step 3.1: Connection Timing Analysis
**Objective:** Identify timing issues between API calls and WebSocket connection

**Current Flow:**
```
1. User visits session URL
2. App.tsx loads session data via API
3. Players array populated from API
4. User joins via API
5. localStorage stores player ID
6. WebSocket connection triggered
7. SESSION_JOINED event received
8. State updated from WebSocket
```

**Potential Issues:**
- Step 8 might overwrite Step 3 data incorrectly
- WebSocket connection happens before API join completes
- State race conditions between API and WebSocket updates

#### Step 3.2: State Update Sequencing
**Actions:**
1. Add sequence numbers to all state updates
2. Log timing of API vs WebSocket state updates
3. Identify if WebSocket data overwrites API data incorrectly
4. Check for duplicate player entries

### Phase 4: Data Consistency Verification

#### Step 4.1: Database State Validation
**Objective:** Ensure database contains correct data

**Actions:**
1. Query database directly for session configuration
2. Verify all players are stored with correct data
3. Check session config matches what was created
4. Validate foreign key relationships

#### Step 4.2: End-to-End Data Flow Tracing
**Actions:**
1. Create test session with known configuration
2. Trace data flow from database → API → frontend
3. Trace data flow from database → WebSocket → frontend
4. Compare both flows for consistency

## Implementation Plan

### Immediate Actions (High Priority)

1. **Add Comprehensive Logging**
   ```typescript
   // In useWebSocket.ts
   console.log('[WebSocket] Connection state:', connectionStatus, 'at', new Date().toISOString());
   
   // In handleSessionState
   console.log('[Store] Session state update:', {
     source: 'websocket',
     players: data.players?.length,
     config: data.config,
     timestamp: new Date().toISOString()
   });
   ```

2. **Fix WebSocket Event Structure**
   - Ensure backend sends complete session data
   - Verify frontend processes all fields correctly
   - Add data validation and error handling

3. **Stabilize Connection Management**
   - Identify and fix reconnection loops
   - Ensure single connection per player
   - Fix connection status indicator

### Testing Protocol

#### Manual Test Sequence
1. **Create fresh session** (Browser A)
2. **Log all console output** from Browser A
3. **Join from incognito** (Browser B)  
4. **Log all console output** from Browser B
5. **Compare session data** between browsers
6. **Document any discrepancies**

#### Automated Test Suite
Create test script to:
1. Create session via API
2. Join session via API
3. Connect via WebSocket
4. Verify session state consistency
5. Test multiple simultaneous connections

### Success Criteria

✅ **WebSocket Status**: Both browsers show "Connected"
✅ **Player Synchronization**: New players see all existing players immediately
✅ **Configuration Sync**: Identical card values in all browsers
✅ **Real-time Updates**: Players appear/disappear in real-time
✅ **No Refresh Required**: All data loads correctly on initial join

## Files Requiring Investigation

### Frontend
- `src/hooks/useWebSocket.ts` - Connection management
- `src/services/websocket/client.ts` - WebSocket event handling
- `src/store.ts` - State management and event processing
- `src/App.tsx` - Session loading and player ID management
- `src/components/JoinGame.tsx` - API join flow

### Backend
- `backend/src/websocket/connection-manager.ts` - WebSocket session handling
- `backend/src/services/session.service.ts` - API join notifications
- `backend/src/websocket/server.ts` - WebSocket server configuration
- `backend/src/websocket/events.ts` - Event type definitions

## Debugging Tools

1. **Browser DevTools**: Network tab, Console logs, WebSocket frames
2. **Backend Logs**: Docker logs with WebSocket events
3. **Database Inspector**: Direct PostgreSQL queries
4. **Redis Inspector**: WebSocket connection state
5. **Network Monitoring**: HTTP vs WebSocket traffic analysis

## Risk Assessment

**High Risk**: Current bugs prevent core multi-player functionality
**Medium Risk**: User experience severely degraded by refresh requirement  
**Low Risk**: WebSocket disconnection indicator causes user confusion

## Next Steps

1. Implement comprehensive logging as outlined above
2. Execute manual test sequence with detailed logging
3. Analyze log output to identify exact failure points
4. Apply targeted fixes based on data analysis
5. Repeat testing until all success criteria are met

This systematic approach should identify and resolve all real-time synchronization issues.
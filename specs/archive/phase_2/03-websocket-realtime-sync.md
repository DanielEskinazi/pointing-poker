# Story 03: WebSocket Real-time Synchronization

**Epic**: Real-time Features  
**Priority**: P1 - High  
**Effort**: High (5-6 days)  
**Week**: 2

## User Story

**As a** player in a planning poker session  
**I want** to see real-time updates when other players vote or the host reveals cards  
**So that** the session feels collaborative and synchronous

## Problem Statement

Currently, WebSocket connection fails and there's no real-time synchronization. Players need to refresh to see changes, making it feel like a single-player application instead of collaborative tool.

## Acceptance Criteria

### ✅ WebSocket Connection
- [ ] WebSocket connects successfully without auth tokens
- [ ] Connection is established when player joins session
- [ ] Connection is stable and handles reconnections
- [ ] Connection status is visible to users

### ✅ Real-time Voting Updates
- [ ] When player votes, all others see voting progress update
- [ ] Vote count updates immediately across all browsers
- [ ] Player status (voted/not voted) syncs in real-time
- [ ] No need to refresh to see changes

### ✅ Real-time Game Flow
- [ ] Card reveals happen instantly for all players
- [ ] Game resets sync immediately across all browsers
- [ ] Story changes update in real-time
- [ ] Host actions (reveal/reset) are immediate for everyone

### ✅ Connection Management
- [ ] Graceful handling of connection drops
- [ ] Automatic reconnection when network recovers
- [ ] Offline queue for actions taken while disconnected
- [ ] Clear connection status indicators

## Technical Requirements

### Backend WebSocket Integration
```typescript
// Files to implement:
- backend/src/websocket/server.ts - Implement event handlers
- backend/src/services/voting.service.ts - Emit events on actions
- backend/src/services/session.service.ts - Emit session events
```

### WebSocket Event Handlers
```typescript
// Events to implement:
interface ServerEventHandlers {
  // Voting events
  'vote:submit' -> broadcast 'vote:submitted'
  'cards:reveal' -> broadcast 'cards:revealed'  
  'game:reset' -> broadcast 'game:reset'
  
  // Story events
  'story:create' -> broadcast 'story:created'
  'story:update' -> broadcast 'story:updated'
  
  // Player events  
  'session:join' -> broadcast 'player:joined'
  'session:leave' -> broadcast 'player:left'
}
```

### Frontend WebSocket Client
```typescript
// Files to fix:
- src/services/websocket/client.ts - Handle auth-free connection
- src/hooks/useWebSocket.ts - Fix connection logic
- src/store.ts - Add WebSocket event handling
```

### Connection Flow (Simplified)
```typescript
// 1. Player joins session
const playerId = await joinSession(sessionId, playerName)

// 2. WebSocket connects with session + player info
wsClient.connect(sessionId, playerId)

// 3. Server adds to session room
socket.join(`session:${sessionId}`)

// 4. All events broadcast to room
io.to(`session:${sessionId}`).emit('vote:submitted', data)
```

## Event-Driven Architecture

### Vote Submission Flow
```typescript
// 1. Player submits vote via API
POST /api/sessions/:id/vote { playerId, value }

// 2. Backend processes vote and emits event
votingService.submitVote(...) 
votingService.emit('vote:submitted', { sessionId, playerId })

// 3. WebSocket handler broadcasts to all players
wsServer.on('vote:submitted', (data) => {
  io.to(`session:${data.sessionId}`).emit('vote:submitted', {
    playerId: data.playerId,
    voteCount: updatedVoteCount,
    totalPlayers: totalPlayers
  })
})

// 4. Frontend updates UI in real-time
wsClient.on('vote:submitted', (data) => {
  updateVotingProgress(data)
})
```

### Card Reveal Flow
```typescript
// 1. Host reveals cards via API
POST /api/sessions/:id/reveal

// 2. Backend reveals and emits event  
votingService.revealCards(sessionId)
votingService.emit('cards:revealed', { sessionId, votes, consensus })

// 3. WebSocket broadcasts results
wsServer.broadcast('cards:revealed', {
  votes: [...],
  consensus: {...},
  statistics: {...}
})

// 4. All players see results immediately
wsClient.on('cards:revealed', (data) => {
  showVotingResults(data.votes, data.consensus)
})
```

## Connection Management

### Connection Status States
```typescript
type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting'
  | 'error'
```

### Offline Queue
```typescript
// Actions taken while offline are queued
interface OfflineAction {
  type: 'vote' | 'reveal' | 'reset'
  data: any
  timestamp: number
}

// When reconnected, replay queued actions
onReconnect(() => {
  offlineQueue.flush()
})
```

### Reconnection Strategy
```typescript
// Exponential backoff for reconnections
const reconnectDelays = [1000, 2000, 4000, 8000, 16000] // ms
let reconnectAttempt = 0

const reconnect = () => {
  setTimeout(() => {
    wsClient.connect(sessionId, playerId)
    reconnectAttempt++
  }, reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)])
}
```

## UI/UX Improvements

### Connection Status Indicator
```
🟢 Connected (3 players online)
🟡 Reconnecting...
🔴 Disconnected - Check connection
```

### Real-time Feedback
```
"Alice just voted!" (toast notification)
"Cards revealed by Bob" (status update)
"New story added: US-125" (live update)
```

### Loading States
```
[Revealing cards...] (button disabled during action)
[Syncing...] (during reconnection)
```

## Definition of Done
- [ ] WebSocket connection works without authentication
- [ ] Real-time voting updates work across all browsers
- [ ] Card reveals happen instantly for all players
- [ ] Story changes sync in real-time
- [ ] Connection status is clearly indicated
- [ ] Automatic reconnection works properly
- [ ] Offline actions are queued and replayed
- [ ] All WebSocket events are properly handled
- [ ] Performance is good with multiple concurrent users
- [ ] Connection management is robust

## Dependencies
- Story Management UI (Story 01) - Need stories to sync
- Voting Flow Completion (Story 02) - Need voting to sync
- Simplified authentication (completed)

## Risks & Mitigation
- **Risk**: WebSocket connection complexity
- **Mitigation**: Start with simple events, add complexity gradually
- **Fallback**: Use HTTP polling if WebSocket proves too complex

- **Risk**: Real-time state synchronization bugs
- **Mitigation**: Thorough testing with multiple browsers/users
- **Fallback**: Add manual refresh button as backup

- **Risk**: Connection stability issues
- **Mitigation**: Robust reconnection logic and offline support

## Testing Strategy
- Unit tests for WebSocket event handlers
- Integration tests for event broadcasting
- Multi-browser testing for real-time sync
- Network interruption testing
- Load testing with multiple concurrent users
- E2E tests for complete real-time flows
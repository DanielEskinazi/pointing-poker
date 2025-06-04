# Story 04: Enhanced Player Management

**Epic**: Real-time Features  
**Priority**: P1 - High  
**Effort**: Medium (3-4 days)  
**Week**: 2

## User Story

**As a** session host and player  
**I want** to see who's online and manage players in the session  
**So that** I can facilitate the session effectively and know who's participating

## Problem Statement

Currently, there's limited player management functionality. Players can't see who's online/offline, hosts can't remove disruptive players, and player status changes don't sync in real-time.

## Acceptance Criteria

### ✅ Player Status Visibility
- [ ] All players can see who's currently online/offline
- [ ] Player list shows last active timestamp
- [ ] Visual indicators for player connection status
- [ ] Player avatars and names display consistently

### ✅ Host Management Controls
- [ ] Host can remove/kick players from session
- [ ] Host can promote other players to host (optional)
- [ ] Host can mute/unmute players (for future chat features)
- [ ] Clear indication of who is the session host

### ✅ Spectator Mode
- [ ] Players can join as spectators
- [ ] Spectators can't vote but can see everything
- [ ] Easy toggle between voter and spectator
- [ ] Spectators clearly distinguished in UI

### ✅ Real-time Player Updates
- [ ] Player join/leave events sync immediately
- [ ] Status changes (online/offline) update in real-time
- [ ] Player profile updates sync across all browsers
- [ ] Connection status changes are visible to all

## Technical Requirements

### Backend Player APIs
```typescript
// Enhance existing endpoints:
GET /api/players/sessions/:sessionId - List all players with status
PUT /api/players/:playerId - Update player (name, avatar, spectator status)
DELETE /api/players/:playerId - Remove player (host only)
POST /api/players/:playerId/promote - Make player host (host only)
```

### Player Status Tracking
```typescript
interface PlayerStatus {
  id: string
  name: string
  avatar: string
  isSpectator: boolean
  isHost: boolean
  isOnline: boolean
  lastSeenAt: Date
  joinedAt: Date
  votedInCurrentRound: boolean
}
```

### WebSocket Player Events
```typescript
// Events to implement:
'player:joined' -> broadcast new player to all
'player:left' -> broadcast player departure  
'player:updated' -> broadcast profile changes
'player:promoted' -> broadcast host changes
'player:status_changed' -> broadcast online/offline
```

### Frontend Components
```typescript
// Components to create/enhance:
- src/components/PlayerList.tsx - Complete player management
- src/components/PlayerAvatar.tsx - Enhanced with status indicators
- src/components/PlayerCard.tsx - Individual player display
- src/components/HostControls.tsx - Player management actions
```

## UI/UX Design

### Player List Panel
```
┌─ Players (3 online) ────────────────┐
│ 👑 Alice (Host) 🟢                  │
│    Joined 2 min ago • Voted ✅      │
│                                     │
│ 👤 Bob 🟢                           │
│    Active now • Voted ✅            │
│                                     │
│ 👤 Carol 🟡                         │
│    Last seen 30s ago • Voting...    │
│                                     │
│ 👁️ Dave (Spectator) 🟢              │
│    Watching only                    │
│                                     │
│ [Invite More] [Session Settings]     │
└─────────────────────────────────────┘
```

### Host Controls (for Alice)
```
┌─ Player: Bob ───────────────────────┐
│ 👤 Bob 🟢                           │
│ Voter • Online • Voted ✅           │
│                                     │
│ [Make Host] [Make Spectator]        │
│ [Remove from Session]               │
└─────────────────────────────────────┘
```

### Player Status Indicators
```
🟢 Online (active in last 30s)
🟡 Away (active in last 5 min) 
🔴 Offline (inactive >5 min)
👑 Host indicator
👁️ Spectator indicator
✅ Has voted in current round
⏳ Currently voting
```

## Player Management Features

### Join/Leave Handling
```typescript
// When player joins:
1. Add player to session in database
2. Emit 'player:joined' event via WebSocket
3. Update all player lists in real-time
4. Show welcome message/notification

// When player leaves:
1. Mark player as inactive (don't delete)
2. Emit 'player:left' event
3. Remove from active player lists
4. Preserve vote history for reporting
```

### Host Management Actions
```typescript
// Remove player (host only):
DELETE /api/players/:playerId
-> Removes player from session
-> Cancels any votes they've submitted
-> Emits 'player:removed' event
-> Redirects removed player to home

// Promote to host:
POST /api/players/:playerId/promote  
-> Updates host designation in database
-> Previous host becomes regular player
-> Emits 'player:promoted' event
-> Updates UI permissions immediately
```

### Spectator Mode
```typescript
// Toggle spectator status:
PUT /api/players/:playerId
{ isSpectator: true }

-> Player can see everything but can't vote
-> Removed from voting progress counts
-> Vote cards are disabled/hidden
-> Clear visual indication of spectator status
```

## Real-time Synchronization

### Player Status Updates
```typescript
// Connection monitoring:
setInterval(() => {
  // Update lastSeenAt for active players
  updatePlayerActivity(playerId)
  
  // Broadcast status changes
  if (statusChanged) {
    wsClient.emit('player:status_changed', {
      playerId,
      isOnline: newStatus
    })
  }
}, 30000) // Every 30 seconds
```

### Activity Tracking
```typescript
// Track player activity:
- Mouse movement
- Keyboard input  
- Vote submissions
- Page focus/blur events

// Update lastSeenAt timestamp
// Emit status changes when threshold crossed
```

## State Management

### Player Store Updates
```typescript
interface PlayerManagementState {
  players: PlayerStatus[]
  currentPlayer: PlayerStatus | null
  hostId: string | null
  
  // Actions
  updatePlayerStatus: (playerId: string, status: Partial<PlayerStatus>) => void
  removePlayer: (playerId: string) => void
  promoteToHost: (playerId: string) => void
  toggleSpectator: (playerId: string) => void
  setPlayerActivity: (playerId: string, isActive: boolean) => void
}
```

## Definition of Done
- [ ] Players can see who's online/offline in real-time
- [ ] Host can remove players from session
- [ ] Host can promote other players to host role
- [ ] Spectator mode works properly (see but can't vote)
- [ ] Player status updates sync across all browsers
- [ ] Join/leave events are handled gracefully
- [ ] Activity tracking shows accurate online status
- [ ] UI clearly indicates player roles and status
- [ ] All player management actions work via WebSocket
- [ ] Performance is good with 10+ concurrent players

## Dependencies
- WebSocket Real-time Sync (Story 03) - Need real-time events
- Voting Flow Completion (Story 02) - Need to distinguish voters from spectators

## Risks & Mitigation
- **Risk**: Complex state synchronization for player status
- **Mitigation**: Simple status model, server as source of truth

- **Risk**: Performance with many players
- **Mitigation**: Optimize WebSocket events, throttle status updates

- **Risk**: Host management edge cases (host leaves, etc.)
- **Mitigation**: Auto-promote oldest player if host leaves

## Testing Strategy
- Unit tests for player management components
- Integration tests for host actions
- Multi-browser testing for real-time player sync
- Edge case testing (host leaves, network issues)
- Performance testing with 10+ concurrent players
- E2E tests for complete player management flows
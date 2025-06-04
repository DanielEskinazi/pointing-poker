# Story 02: Complete Voting Flow

**Epic**: Core Voting Flow  
**Priority**: P0 - Critical  
**Effort**: Medium (3-4 days)  
**Week**: 1

## User Story

**As a** player in a planning poker session  
**I want** to vote on the current story and see the results  
**So that** my team can estimate work collaboratively

## Problem Statement

While voting backend exists, the frontend voting flow is incomplete. Players can't submit votes, see voting progress, or view results when cards are revealed.

## Acceptance Criteria

### ✅ Vote Submission
- [ ] Players can click cards to submit votes
- [ ] Vote submission includes playerId and storyId
- [ ] Vote updates are visible immediately to voter
- [ ] Players can change their vote before reveal
- [ ] Error handling for failed vote submissions

### ✅ Voting Progress
- [ ] Players can see who has voted (without seeing values)
- [ ] Progress indicator shows "X of Y players voted"
- [ ] Visual feedback for submitted votes
- [ ] "Waiting for others" state is clear

### ✅ Card Reveal
- [ ] Host can reveal all cards when ready
- [ ] All players see voting results simultaneously
- [ ] Results show player names and their votes
- [ ] Consensus/statistics are calculated and displayed

### ✅ Game Flow
- [ ] Host can reset voting for next round
- [ ] Reset clears all votes and starts fresh
- [ ] Option to create new story during reset
- [ ] Previous results are preserved in story

## Technical Requirements

### Frontend Components to Fix/Create
```typescript
// Fix existing:
- src/components/Card.tsx - Connect to real vote API
- src/components/App.tsx - Show voting status and results

// Create new:
- src/components/VotingProgress.tsx - Show voting progress
- src/components/VotingResults.tsx - Display revealed cards
- src/components/HostControls.tsx - Reveal/reset buttons
```

### API Integration
```typescript
// Connect to existing endpoints:
POST /api/sessions/:id/vote - Submit vote with playerId
GET /api/sessions/:id/votes - Get current voting state
POST /api/sessions/:id/reveal - Reveal all cards
POST /api/sessions/:id/reset - Reset for next round
```

### State Management Updates
```typescript
// Add to Zustand store:
interface VotingState {
  votes: Record<string, string>; // playerId -> cardValue
  hasVoted: boolean;
  cardsRevealed: boolean;
  votingResults: VoteResult[];
  consensus: ConsensusData | null;
  submitVote: (value: string) => void;
  revealCards: () => void;
  resetVoting: () => void;
}
```

## UI/UX Design

### Voting Interface (Before Reveal)
```
┌─ Current Story ─────────────────────┐
│ US-123: User Authentication         │
│ "As a user, I want to login..."     │
└─────────────────────────────────────┘

┌─ Your Vote ─────────────────────────┐
│ [1] [2] [3] [5] [8] [13] [?] [☕]    │
│           ↑ Selected                │
└─────────────────────────────────────┘

┌─ Voting Progress ───────────────────┐
│ 👤 Alice ✅   👤 Bob ⏳   👤 Carol ✅ │
│ 2 of 3 players voted               │
│                          [Reveal]  │
└─────────────────────────────────────┘
```

### Results Interface (After Reveal)
```
┌─ Voting Results ────────────────────┐
│ Alice: 5    Bob: 8    Carol: 5      │
│                                     │
│ 📊 Consensus: 5 (67% agreement)     │
│ 📈 Average: 6 points                │
│ 📏 Range: 5-8 points                │
│                                     │
│ [Reset Voting] [Next Story]         │
└─────────────────────────────────────┘
```

## Integration Points

### With Story Management
- Voting only works when a story is active
- Vote submissions include current story ID
- Results are stored with the story

### With Player Management
- Only non-spectator players can vote
- Vote progress shows all voting players
- Player names appear in results

### With WebSocket (Future)
- Vote submissions broadcast to all players
- Card reveals happen in real-time
- Game resets sync immediately

## API Data Flow

### Vote Submission
```typescript
// 1. Player clicks card
onClick(cardValue) => {
  submitVote({
    sessionId: currentSession.id,
    storyId: currentStory.id,
    playerId: currentPlayer.id,
    value: cardValue
  })
}

// 2. Update local state immediately
setVotes(prev => ({ ...prev, [playerId]: cardValue }))

// 3. Refetch voting state to sync with server
refetchVotes()
```

### Card Reveal Flow
```typescript
// 1. Host clicks reveal
revealCards(sessionId) => {
  POST /api/sessions/${sessionId}/reveal
}

// 2. Server marks cards as revealed
// 3. Frontend refetches voting state
// 4. Results component shows with full data
```

## Definition of Done
- [ ] Players can submit votes by clicking cards
- [ ] Voting progress is visible to all players  
- [ ] Host can reveal cards and see results
- [ ] Results show consensus and statistics
- [ ] Host can reset voting for next round
- [ ] All voting flows work end-to-end
- [ ] Error handling is robust
- [ ] UI is polished and intuitive
- [ ] All tests pass

## Dependencies
- Story Management UI (Story 01) - Need active story to vote on
- Fixed authentication (completed in this plan)

## Risks & Mitigation
- **Risk**: Complex state synchronization
- **Mitigation**: Use React Query for server state, simple local state for UI
- **Risk**: Race conditions in voting
- **Mitigation**: Optimistic updates with proper error handling

## Testing Strategy
- Unit tests for voting components
- Integration tests for vote submission/reveal flow
- E2E tests for complete voting session
- Error scenario testing (network failures, invalid votes)
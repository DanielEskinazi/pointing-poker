# Consensus Display Inconsistency Between Sessions

## Bug Description
There is an inconsistency in how consensus analysis is displayed across different sessions or voting instances. In identical voting scenarios (2 players both voting "3"), one session shows "No Consensus" while another correctly shows "3 points - Team reached consensus!".

## Visual Evidence
**Left Session (Incorrect)**:
- Both players (a, b) voted "3" 
- Vote Distribution: "3" - 2 votes (100%)
- Consensus Analysis: "No Consensus" ❌
- Message: "Consider discussing the differences"

**Right Session (Correct)**:
- Both players (a, b) voted "3"
- Vote Distribution: "3" - 2 votes (100%) 
- Consensus Analysis: "3 points" ✅
- Message: "Team reached consensus!"
- Shows: "Low deviation: 0.0"

## Steps to Reproduce
1. Create multiple planning poker sessions
2. Have all players vote with the same value (e.g., "3")
3. Reveal cards in different sessions
4. Observe inconsistent consensus display between sessions

## Expected Behavior
When all players vote the same value:
- Should ALWAYS show consensus achieved
- Should display the agreed value (e.g., "3 points")
- Should show "Team reached consensus!" message
- Should be consistent across all sessions

## Root Cause Analysis

### Potential Issues:
1. **Race Condition**: Frontend/backend state synchronization timing issues
2. **Data Type Mismatch**: String vs number comparison in consensus calculation
3. **Session State**: Different sessions might have different consensus calculation paths
4. **WebSocket vs API**: Different data sources providing different consensus results
5. **Caching Issues**: Stale consensus data from previous votes

### Investigation Points:
- Check if backend consensus calculation is consistent
- Verify frontend consensus data handling from WebSocket events
- Compare API response vs WebSocket consensus data structure
- Check for string/number type conversion issues
- Verify consensus threshold calculation (>= 0.8 vs > 0.8)

## Affected Components
- Backend: `VotingService.calculateConsensus()`
- Backend: WebSocket consensus data emission
- Frontend: `handleCardsRevealed()` consensus processing
- Frontend: VotingResults component consensus display
- API: RevealCards endpoint response

## Debug Information Needed
1. Backend logs showing consensus calculation for both sessions
2. WebSocket event data for CARDS_REVEALED
3. Frontend store state after handleCardsRevealed
4. API response from /sessions/{id}/reveal endpoint
5. Vote data structure comparison between sessions

## Root Cause
The inconsistency was caused by **two different consensus calculation algorithms** being used:

1. **Frontend Algorithm** (used in `revealVotes()` API calls):
   - "80% agreement within 1 point of median"
   - Complex tolerance-based calculation
   - Could fail on identical votes due to rounding/precision

2. **Backend Algorithm** (used in WebSocket events):
   - "Most common value" percentage approach
   - Simple count-based calculation 
   - More reliable for identical votes

This meant the same voting scenario could show different consensus results depending on whether it came from an API call or WebSocket event.

## Solution
**Unified the consensus calculation** to always use the backend's algorithm:

1. **Frontend Changes** (`src/store.ts`):
   - Removed local `calculateConsensus()` call in `revealVotes()`
   - Now uses `result.data.consensus` from API response
   - Both API and WebSocket paths now use backend consensus

2. **Backend Changes** (`backend/src/controllers/voting.controller.ts`):
   - Added consensus data transformation in API response
   - Ensures API returns same format as WebSocket events
   - Consistent `hasConsensus`, `suggestedValue`, `averageValue` structure

## Files Changed
- `src/store.ts`: Removed frontend consensus calculation
- `backend/src/controllers/voting.controller.ts`: Added consensus transformation

## Priority
High - This undermines confidence in the consensus feature and creates confusion during planning sessions.
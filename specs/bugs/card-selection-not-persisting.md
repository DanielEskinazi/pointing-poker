# Bug: Selected Card Not Remaining Highlighted After Vote Submission

## Problem Description
When a user clicks on a voting card and submits their vote, the card does not remain highlighted to show which card they selected. This creates poor UX as users cannot see their vote choice.

## Expected Behavior
- User clicks a card (e.g., "2")
- Card gets highlighted immediately (temporary feedback)
- After vote submission, card remains highlighted (persistent feedback)
- Card stays highlighted until voting round ends or user changes vote

## Actual Behavior
- User clicks a card
- Card briefly highlights during click
- After vote submission, card loses highlighting
- No visual indication of user's selected vote

## User Impact
- Users cannot see which card they voted for
- Poor user experience and lack of confidence in vote submission
- Difficult to verify vote accuracy

## Technical Analysis
The issue involves the card selection state management between:
1. Temporary UI feedback (`selectedCard` state)
2. Persistent vote tracking (`voting.votes[playerId]`)
3. Card highlighting logic in Card component

## Steps to Reproduce
1. Join a planning poker session
2. Click on any voting card (e.g., "2", "5", "8")
3. Observe that card briefly highlights
4. After "Vote submitted!" toast appears
5. Notice card is no longer highlighted

## Environment
- Browser: Any
- Application: Planning Poker voting interface
- Component: Card selection and voting system

## Priority
High - Core UX functionality for voting system

## Technical Investigation

### Root Cause Identified
The issue was a **player ID mismatch** between two different systems tracking the current player:

1. **App.tsx local state**: `useState<string | null>(null)` with manual localStorage handling
2. **Store method**: `getCurrentPlayerId()` with different localStorage key patterns

**Evidence:**
- Vote submitted with player ID: `'0ef4424e-db24-4d55-b8d6-24c417b5e158'`
- Store's getCurrentPlayerId returned: `'8275cea9-06e8-4387-a82a-82d4a728804b'`

### Problem Chain
1. JoinGame stores player ID with tab-specific key: `player_${sessionId}_${tabId}`
2. App.tsx useEffect didn't handle tab-specific keys correctly
3. Store's getCurrentPlayerId() had different lookup logic  
4. Card component received wrong player ID from App.tsx
5. Vote submission used wrong player ID
6. Store couldn't match vote to current player
7. `hasUserVoted` never got set to `true`
8. Card highlighting failed

### Fix Applied
**Files Changed:**
- `src/store.ts` - Fixed getCurrentPlayerId() to prioritize tab-specific keys
- `src/App.tsx` - Eliminated duplicate player ID tracking, use store method consistently

**Key Changes:**
1. Unified player ID source - all components now use store's `getCurrentPlayerId()`
2. Fixed tab-specific localStorage key handling
3. Ensured vote submissions use correct player ID
4. Card highlighting logic now works with consistent player identification

### Verification
After fix, the expected flow is:
1. User clicks card → immediate highlighting (`selectedCard` state)
2. Vote submits with correct player ID → success callback fires  
3. `hasUserVoted` becomes `true` → card remains highlighted
4. Selection logic: `selectedCard === value || (userVotedCard === value && hasUserVoted)`

## Status: FIXED
- Root cause: Player ID mismatch between App.tsx local state and store method
- Solution: Unified player ID tracking through store's getCurrentPlayerId()
- Impact: Card highlighting now persists after vote submission
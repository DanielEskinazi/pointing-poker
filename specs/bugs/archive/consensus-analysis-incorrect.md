# Consensus Analysis Incorrect When All Votes Are Same

## Bug Description
When all players vote with the same value (e.g., both players vote "1"), the consensus analysis incorrectly shows "No Consensus" instead of recognizing that there is perfect consensus.

## Visual Evidence
- Both players (a and b) voted "1"
- Vote Distribution shows "1" with 2 votes (100%)
- Consensus Analysis incorrectly shows "No Consensus" with message "Consider discussing the differences"

## Expected Behavior
When all players vote the same value, the consensus analysis should show:
- Perfect consensus indicator
- Positive message about agreement
- The agreed-upon value highlighted

## Actual Behavior
The system shows "No Consensus" even when all votes are identical.

## Affected Components
- Frontend: VotingResults component consensus display
- Backend: Consensus calculation logic in voting service
- API Response: RevealResult consensus field

## Steps to Reproduce
1. Create a planning poker session with 2+ players
2. Select a story for voting
3. Have all players vote with the same value (e.g., "1")
4. Observe the voting results after cards are revealed
5. Note that consensus analysis incorrectly shows "No Consensus"

## Root Cause
The backend consensus calculation was using strict greater than (`> 0.8`) instead of greater than or equal (`>= 0.8`) when checking for consensus. This caused edge cases where 80% agreement wasn't recognized as consensus.

## Solution
Fixed by updating `backend/src/services/voting.service.ts`:
1. Changed `consensus.agreement > 0.8` to `consensus.agreement >= 0.8` in two places
2. Added logging to debug consensus calculations

## Priority
High - This is a core feature that provides incorrect feedback to users about their voting agreement.
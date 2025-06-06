# Voting State Not Resetting on Story Change

## Bug Description
When a new story is selected/activated, the voting results from the previous story (percentages, consensus analysis, vote distribution) are not being cleared. This causes confusion as users see old voting data when starting to vote on a new story.

## Steps to Reproduce
1. Complete voting on a story with all players
2. Reveal cards to see results (consensus, percentages, etc.)
3. Select/activate a different story
4. Observe that previous voting results are still displayed

## Expected Behavior
When a new story is activated:
- All voting results should be cleared
- Consensus analysis should be reset
- Vote distribution should be empty
- All player cards should be unselected
- The UI should show a clean slate for the new story

## Actual Behavior
Previous story's voting results remain visible when switching to a new story.

## Affected Components
- Frontend: `handleStoryActivated` in store.ts
- Frontend: VotingResults component
- WebSocket event: STORY_ACTIVATED

## Root Cause
The `handleStoryActivated` function in the store was only updating the story list and current story title, but not resetting the voting state, consensus data, or player cards.

## Solution
Updated `handleStoryActivated` in `src/store.ts` to:
1. Reset all voting state (votes, isRevealed, hasVoted, consensus, votingResults)
2. Set the currentStoryId to the new story
3. Clear all player selected cards
4. Set isRevealing to false

This ensures a clean slate when switching between stories.

## Priority
High - This causes confusion and incorrect information display during planning sessions.
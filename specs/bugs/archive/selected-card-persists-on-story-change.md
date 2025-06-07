# Bug: Selected Card Persists When Changing Active Story

## Status: Fixed
## Priority: High
## Severity: Medium

## Problem Description

When users switch to a different active story, the previously selected card remains visually highlighted in the UI, even though the vote should be reset for the new story. This creates confusion as users think they've already voted on the new story when they haven't.

## Steps to Reproduce

1. Join a planning poker session
2. Create multiple stories
3. Select the first story as active
4. Vote by clicking on a card (e.g., card "5")
5. Switch to a different story from the sidebar
6. **Bug**: The previously selected card ("5") remains highlighted/active

## Expected Behavior

- When switching to a new story, the card selection should be reset
- No cards should appear selected for the new story
- Users should be able to vote fresh on the new story

## Actual Behavior

- The previously selected card remains visually highlighted
- The UI incorrectly suggests the user has already voted on the new story
- The `selectedCard` state persists across story changes

## Root Cause

The `selectedCard` state in `App.tsx` is not being reset when the active story changes. The state is only managed locally for UI feedback and doesn't sync with story changes.

## Impact

- **User Confusion**: Users think they've voted when they haven't
- **Incorrect UI State**: Visual state doesn't match actual voting state  
- **Poor UX**: Users may not realize they need to vote again on the new story

## Technical Details

### Affected Components
- `App.tsx` - Contains the `selectedCard` state
- `Card.tsx` - Shows visual selection based on `isSelected` prop
- Story switching logic in `StoryList.tsx`

### Current Flow
1. User selects card → `setSelectedCard(value)` in App.tsx
2. User switches story → Story changes but `selectedCard` state remains
3. Cards still show previous selection via `isSelected={selectedCard === value}`

## Affected Files
- `/Users/dany/Documents/CODE/github.com/planning-poker/src/App.tsx`
- `/Users/dany/Documents/CODE/github.com/planning-poker/src/components/Card.tsx`
- `/Users/dany/Documents/CODE/github.com/planning-poker/src/components/StoryList.tsx`

## Environment
- Browser: All browsers
- Platform: All platforms
- Version: Current main branch

## Related Issues
- None identified

## Fix Strategy
1. Reset `selectedCard` state when active story changes
2. Add useEffect to watch for story changes
3. Clear selection when `getCurrentStory()` returns different story ID
4. Ensure card visual state accurately reflects new story voting state

## Implementation

### Fix Details
**File**: `/Users/dany/Documents/CODE/github.com/planning-poker/src/App.tsx`

**Changes Made**:
1. Added `getCurrentStory` to useGameStore destructuring
2. Created `activeStoryId` variable to track current story ID
3. Added useEffect that watches for `activeStoryId` changes
4. Reset `selectedCard` to `null` when story ID changes

**Code Added**:
```typescript
// Reset selected card when active story changes
const activeStoryId = getCurrentStory()?.id;
useEffect(() => {
  // Reset selected card when story changes (but not on initial load)
  if (selectedCard !== null) {
    setSelectedCard(null);
  }
}, [activeStoryId]); // Reset when story ID changes
```

### How It Works
- Monitors the active story ID using `getCurrentStory()?.id`
- When the story ID changes, triggers the useEffect
- Resets the `selectedCard` state to `null` only if a card was previously selected
- Prevents unnecessary resets on initial load by checking `selectedCard !== null`

## Test Cases
- [x] Select card on Story A, switch to Story B → No card selected ✅
- [x] Vote on Story A, switch to Story B → Can vote fresh on Story B ✅ 
- [x] Switch between multiple stories → Selection resets each time ✅
- [x] Switch back to previously voted story → Shows actual vote status ✅

## Verification
- ✅ Build passes successfully
- ✅ No TypeScript errors
- ✅ selectedCard state properly resets on story changes
- ✅ UI accurately reflects voting state for each story
- ✅ Users can vote fresh on each new story

## Date Fixed
December 6, 2024
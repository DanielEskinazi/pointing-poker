# Bug Fix: Voting Cards Showing on Completed Stories

## Issue Description
When users navigated back to a previously completed story, the voting cards ("Select Your Estimate" section) were still being displayed even though the story had already been scored and completed.

## Root Cause
The voting cards visibility logic in `src/App.tsx` only checked:
- `hasActiveStory` - whether there's an active story
- `!isRevealing` - whether cards are being revealed

But it did not check whether the story was already completed.

## Fix Implementation
Updated the voting cards visibility condition in `src/App.tsx` (lines 297-301) to also check for story completion:

```typescript
// Before
{hasActiveStory && !isRevealing && (

// After  
{(() => {
  const currentStory = getCurrentStory();
  const isStoryCompleted = currentStory && (currentStory.votingHistory || currentStory.completedAt);
  return hasActiveStory && !isRevealing && !isStoryCompleted;
})() && (
```

## Story Completion Logic
A story is considered completed if it has either:
- `votingHistory` - Contains previous voting results
- `completedAt` - Timestamp when estimation was finalized

This matches the same logic used for showing historical voting results (lines 372-373).

## Files Modified
- `/src/App.tsx` - Updated voting cards visibility logic
- `/src/App.tsx` - Fixed TypeScript type errors (playerId null to undefined conversion)

## Testing
- ✅ Voting cards are hidden when viewing completed stories
- ✅ Historical voting results still display correctly for completed stories
- ✅ Voting cards show normally for active/new stories
- ✅ TypeScript compilation passes without errors

## Status
**FIXED** - Deployed and verified working correctly.
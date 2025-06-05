# Story Synchronization Bug

**Priority**: High  
**Status**: Open  
**Reporter**: User  
**Date**: June 4, 2025  
**Affected Components**: WebSocket synchronization, Story management, Session state

## Summary

Critical bug in story synchronization across connected users where:
1. Active story changes are not broadcast to all users in real-time
2. Users only see stories they created, not stories created by other users

## Expected Behavior

- When a user changes the active story, all connected users should see the change immediately
- All users should see all stories created in the session, regardless of who created them
- Story state should be fully synchronized across all browsers/tabs in the session

## Actual Behavior

- Active story changes only update in the user's own browser who made the change
- Other users don't see the active story change until they refresh or reconnect  
- Users only see stories they personally created, creating isolated story lists
- New users joining a session don't see the complete list of existing stories

## Steps to Reproduce

1. User A creates a session and joins as host
2. User A creates Story 1 and Story 2
3. User B joins the same session
4. **Bug 1**: User B only sees an empty story list or limited stories, not User A's stories
5. User A switches active story from Story 1 to Story 2
6. **Bug 2**: User B doesn't see the active story change in real-time
7. User B creates Story 3
8. **Bug 3**: User A doesn't see Story 3 created by User B

## Root Cause Analysis

### Problem 1: Missing Story Activation Event Broadcasting

**Location**: `src/store.ts:600-630` (setActiveStory method)

**Issue**: The `setActiveStory` method:
- Calls REST API `storiesApi.setActiveStory()`
- Updates local state optimistically  
- Calls `wsClient.updateStory()` which sends generic `STORY_UPDATE` event
- **Missing**: Dedicated story activation WebSocket event broadcast

**Backend Issue**: `backend/src/websocket/server.ts`
- WebSocket server emits `story:activated` event (lines 303-314)
- But maps it to generic `STORY_UPDATED` instead of dedicated activation event
- No proper `STORY_ACTIVATED` event type for real-time activation sync

### Problem 2: Incomplete Session State Synchronization  

**Location**: `backend/src/websocket/connection-manager.ts:832-852` (getSessionState method)

**Issue**: When users join sessions, `SESSION_JOINED` event only includes:
- `currentStory` (single active story)
- **Missing**: Complete `stories` array with all session stories

**Impact**: New users don't receive the full story context when joining

### Problem 3: Missing Complete Story List in WebSocket Events

**Location**: `backend/src/websocket/connection-manager.ts:58-74` (SESSION_JOINED handler)

**Issue**: Session state broadcast doesn't include all stories, only current active story

## Technical Details

### Frontend Issues (`src/store.ts`)

```typescript
// Line 600-630: setActiveStory method
setActiveStory: async (storyId) => {
  // ✅ REST API call works
  const activeStory = await storiesApi.setActiveStory(sessionId, storyId);
  
  // ✅ Local state update works  
  set(state => ({
    stories: state.stories.map(story => ({
      ...story,
      isActive: story.id === storyId
    })),
    currentStory: activeStory.title,
  }));

  // ❌ PROBLEM: Using generic updateStory instead of activation event
  wsClient.updateStory(storyId, story.title, story.description);
  // Should be: wsClient.activateStory(storyId);
}
```

### Backend Issues (`backend/src/websocket/server.ts`)

```typescript
// ❌ MISSING: Dedicated story activation event handler
// Currently maps story:activated to generic STORY_UPDATED
this.storyService.on('story:activated', (data) => {
  this.emitToSession(data.sessionId, ServerEvents.STORY_UPDATED, {
    story: data.story // Generic update, not activation-specific
  });
});

// ✅ NEEDED: Dedicated activation event
this.storyService.on('story:activated', (data) => {
  this.emitToSession(data.sessionId, ServerEvents.STORY_ACTIVATED, {
    storyId: data.story.id,
    previousActiveStoryId: data.previousActiveStoryId
  });
});
```

### Session State Issues (`backend/src/websocket/connection-manager.ts`)

```typescript
// Line 832-852: getSessionState method
// ❌ PROBLEM: Only gets current active story, not all stories
const currentStory = await this.prisma.story.findFirst({
  where: { sessionId, isActive: true }
});

return {
  // ❌ Missing complete stories list
  currentStory: currentStory || null,
  // ✅ NEEDED: 
  // stories: await this.prisma.story.findMany({ where: { sessionId } })
};
```

## Impact Assessment

**Severity**: High - Core functionality broken
**User Experience**: Poor - Users experience inconsistent state
**Business Impact**: Major - Multi-user collaboration is broken

### Affected User Flows
- Story creation and management
- Real-time collaboration during estimation sessions
- Session joining and onboarding
- Story activation and progress tracking

## Proposed Solution

### Phase 1: Fix Story Activation Broadcasting

1. **Add dedicated story activation events**:
   - Backend: Add `STORY_ACTIVATED` server event type
   - Frontend: Add story activation WebSocket event handler
   - Update `setActiveStory` to use activation-specific events

2. **Backend changes** (`backend/src/websocket/server.ts`):
   ```typescript
   this.storyService.on('story:activated', (data) => {
     this.emitToSession(data.sessionId, ServerEvents.STORY_ACTIVATED, {
       storyId: data.story.id,
       story: data.story,
       previousActiveStoryId: data.previousActiveStoryId
     });
   });
   ```

3. **Frontend changes** (`src/store.ts`):
   ```typescript
   handleStoryActivated: (data: { storyId: string, story: StoryInfo }) => {
     set(state => ({
       stories: state.stories.map(story => ({
         ...story,
         isActive: story.id === data.storyId
       })),
       currentStory: data.story.title,
       lastSync: new Date()
     }));
   }
   ```

### Phase 2: Fix Complete Story List Synchronization

1. **Update session state to include all stories**:
   ```typescript
   // backend/src/websocket/connection-manager.ts
   const stories = await this.prisma.story.findMany({
     where: { sessionId },
     orderBy: { orderIndex: 'asc' }
   });
   
   return {
     stories: stories,
     currentStory: stories.find(s => s.isActive) || null
   };
   ```

2. **Update frontend session state handler**:
   ```typescript
   handleSessionState: (data: SessionStateData) => {
     if (data.stories) {
       set(state => ({
         ...state,
         stories: data.stories,
         currentStory: data.currentStory?.title || ''
       }));
     }
   }
   ```

### Phase 3: Add Story List Synchronization Events

1. **Broadcast story list updates on any story change**
2. **Add story list refresh mechanism for new joiners**
3. **Ensure all story events (create/update/delete/activate) broadcast complete state**

## Testing Strategy

### Manual Testing
1. Multi-browser testing with 2+ users
2. Story creation and activation across users
3. New user joining sessions with existing stories
4. Network disconnection/reconnection scenarios

### Automated Testing
1. WebSocket event integration tests
2. Story synchronization unit tests  
3. Session state consistency tests

## Files to Modify

### Backend
- `backend/src/websocket/server.ts` - Add story activation event handlers
- `backend/src/websocket/connection-manager.ts` - Include complete story list in session state
- `backend/src/websocket/events.ts` - Add STORY_ACTIVATED event type

### Frontend  
- `src/store.ts` - Add story activation event handler, fix setActiveStory method
- `src/types/websocket.ts` - Add story activation event types
- `src/services/websocket/client.ts` - Add story activation WebSocket methods

## Acceptance Criteria

- [ ] When User A changes active story, User B sees the change within 500ms
- [ ] When User A creates a story, User B sees it immediately in their story list
- [ ] When User B joins a session, they see all existing stories created by other users
- [ ] Story activation state is consistent across all connected users
- [ ] WebSocket events properly broadcast story activation changes
- [ ] Session state includes complete story list for new joiners
- [ ] All story operations (create/update/delete/activate) are synchronized in real-time

## Related Issues

- Story duplication bug (fixed) - Related to WebSocket story event handling
- Session state synchronization - Broader issue of state consistency across users

## Notes

This bug significantly impacts the core collaborative functionality of the Planning Poker application. The fix requires both backend WebSocket event improvements and frontend state synchronization updates. Priority should be given to story activation broadcasting as it's the most frequently used feature.
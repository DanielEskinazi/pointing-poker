# Story 01: Story Management UI

**Epic**: Core Voting Flow  
**Priority**: P0 - Critical  
**Effort**: High (5-7 days)  
**Week**: 1

## User Story

**As a** session host  
**I want** to create and manage stories for my team to estimate  
**So that** we can vote on actual work items and track estimates

## Problem Statement

Currently, there's no way to create stories in the application. Players can join sessions but have nothing to vote on, making the voting system completely non-functional.

## Acceptance Criteria

### ✅ Story Creation
- [ ] Host can add new stories with title and description
- [ ] Stories are automatically marked as "active" for voting
- [ ] Only one story can be active at a time
- [ ] New stories appear immediately for all players

### ✅ Story Management
- [ ] Host can see list of all stories in session
- [ ] Host can edit story details (title/description)
- [ ] Host can set which story is currently active
- [ ] Host can delete stories (if no votes exist)

### ✅ Story Display
- [ ] Current active story is prominently displayed
- [ ] Story description is visible to all players
- [ ] Players can see story status (voting, revealed, completed)
- [ ] Story list shows estimate results for completed stories

### ✅ Integration
- [ ] Stories integrate with existing voting system
- [ ] Story changes sync in real-time via WebSocket
- [ ] Stories persist in database correctly

## Technical Requirements

### Backend API (Already exists)
```typescript
// These endpoints should work:
POST /api/sessions/:id/stories - Create story
GET /api/sessions/:id/stories - List stories
PUT /api/stories/:id - Update story
DELETE /api/stories/:id - Delete story
```

### Frontend Components to Create
```typescript
// New components needed:
- src/components/StoryCreator.tsx - Form to add new stories
- src/components/StoryList.tsx - Display all session stories
- src/components/StorySelector.tsx - Choose current active story
- src/components/CurrentStory.tsx - Display active story prominently
```

### State Management
```typescript
// Add to Zustand store:
interface StoryState {
  stories: Story[];
  currentStory: Story | null;
  isCreatingStory: boolean;
  addStory: (story: StoryData) => void;
  setCurrentStory: (storyId: string) => void;
  updateStory: (storyId: string, updates: Partial<Story>) => void;
  deleteStory: (storyId: string) => void;
}
```

## UI/UX Design

### Story Creator Form
```
┌─ Add New Story ─────────────────────┐
│ Title: [___________________________] │
│ Description (optional):              │
│ [_________________________________] │
│ [_________________________________] │
│                [Cancel] [Add Story] │
└─────────────────────────────────────┘
```

### Story List Panel
```
┌─ Stories ───────────────────────────┐
│ 🟢 US-123: User Login (Active)      │
│   "As a user, I want to..."         │
│   Status: Voting • Est: -           │
│                                     │
│ ⭕ US-124: Password Reset            │
│   "As a user, I want to..."         │
│   Status: Complete • Est: 5 points  │
│                                     │
│ [+ Add Story]                       │
└─────────────────────────────────────┘
```

## Integration Points

### With Voting System
- Vote submission requires active story ID
- Votes are tied to specific stories
- Host can't change active story while voting in progress

### With WebSocket
- Story creation broadcasts to all players
- Story status changes sync in real-time
- Current story changes update UI immediately

### With Database
- Stories persist with session relationship
- Only one story marked as active per session
- Vote counts stored per story

## Definition of Done
- [ ] Host can create stories with title and description
- [ ] Current story is clearly displayed to all players
- [ ] Stories persist correctly in database
- [ ] Story changes sync in real-time
- [ ] Integration with voting system works
- [ ] UI is intuitive and responsive
- [ ] All tests pass
- [ ] Code is reviewed and documented

## Dependencies
- Voting system backend (already exists)
- WebSocket integration (needs fixing in next story)

## Risks & Mitigation
- **Risk**: Complex UI for story management
- **Mitigation**: Start with simple forms, enhance iteratively
- **Risk**: WebSocket integration complexity
- **Mitigation**: Story creation can work without real-time sync initially

## Testing Strategy
- Unit tests for story management components
- Integration tests for story CRUD operations
- E2E tests for story creation to voting flow
- Real-time sync testing with multiple browsers
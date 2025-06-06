# Display Story Points on Story Cards

## Feature Description
After a story has been estimated through voting, the final story points should be displayed directly on the story card in the story list. This provides a clear visual indication of which stories have been pointed and their estimates.

## User Stories
- As a team member, I want to see the story points on completed stories so I can quickly identify which stories have been estimated
- As a scrum master, I want to see all story estimates at a glance to track sprint planning progress
- As a product owner, I want to see estimated points to understand the team's capacity assessment

## Requirements

### Visual Design
1. Display the final estimate prominently on the story card
2. Use a badge or chip design to make points stand out
3. Different visual treatment for:
   - Stories with points (completed estimation)
   - Stories without points (pending estimation)
   - Active story (currently being voted on)

### Functional Requirements
1. Show final estimate from the backend (story.finalEstimate field)
2. Update immediately when consensus is reached and story is pointed
3. Persist the points display across page refreshes
4. Clear visual distinction between pointed and unpointed stories

### Implementation Details
1. Update StoryList component to display finalEstimate
2. Add visual badge/chip for story points
3. Use different colors/styles for different states
4. Ensure responsive design on mobile devices

## Acceptance Criteria
- [ ] Story cards show final estimate when available
- [ ] Points are displayed in a clear, prominent way
- [ ] Visual distinction between pointed/unpointed stories
- [ ] Points update immediately after voting completes
- [ ] Points persist across page refreshes
- [ ] Mobile-friendly display

## Technical Notes
- The backend already saves finalEstimate when consensus >= 80%
- Story model includes finalEstimate field
- Need to ensure StoryList component receives updated story data after voting

## Implementation Details
1. **Frontend Changes**:
   - Added prominent story points badge in StoryList component
   - Badge displays as green circle with white text in top-right corner
   - Shows only when story has finalEstimate
   - Removed redundant estimate display from bottom section
   - Added "Not estimated" text for stories without points

2. **Backend Changes**:
   - Added STORY_UPDATED WebSocket emission after setting finalEstimate
   - Ensures immediate UI update when consensus is reached

3. **Visual Design**:
   - Green circular badge with shadow for visibility
   - Positioned absolutely to avoid layout shifts
   - Font is bold and larger for easy reading
   - Adjusts margin on action buttons to prevent overlap
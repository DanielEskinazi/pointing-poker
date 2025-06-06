# Feature 08: Information Architecture Cleanup

## Status: Pending
## Priority: High  
## Estimated Effort: Small

## Problem Statement

Current information architecture creates user confusion through:

1. **Redundant Empty States**: Both "No Active Story" and "No Stories Yet" messages display simultaneously
2. **Unclear Story States**: Users don't understand difference between "active" vs "queued" stories  
3. **Redundant Story Counter**: "Stories" section shows "0 stories" when "No Stories Yet" already communicates this

## Success Criteria

- [ ] Single, clear empty state that explains the current situation
- [ ] Clear distinction between story states (active, queued, none)
- [ ] Eliminated redundant information displays
- [ ] Users understand next steps from any state

## Technical Requirements

### Component Analysis

Current problematic components:
- `StorySelector.tsx` - Shows "No Active Story" 
- `StoryList.tsx` - Shows "No Stories Yet" and story count
- `CurrentStory.tsx` - May show conflicting state info

### Proposed Information States

1. **No Stories State**
   - Single message: "No stories created yet"
   - Clear next action: "Create your first story to begin estimation"
   - Hide story count/list entirely

2. **Stories Exist, None Active**
   - Message: "Select a story to start estimation"  
   - Show story list with selection actions
   - Clear visual distinction of selectable items

3. **Active Story State**
   - Show current story prominently
   - Minimize story management UI (progressive disclosure)
   - Clear estimation workflow

## Implementation Tasks

### Phase 1: State Audit
- [ ] Map all current empty/loading states across components
- [ ] Identify overlapping information displays
- [ ] Document current user confusion points

### Phase 2: Consolidated States
- [ ] Create single EmptyState component for "no stories"
- [ ] Update StorySelector to show "select story" vs "no active story"
- [ ] Remove redundant story counters when count is zero

### Phase 3: Progressive Disclosure
- [ ] Hide story management when actively voting
- [ ] Implement expandable story management panel
- [ ] Clear visual separation between "managing stories" vs "estimating stories"

### Phase 4: State Transitions
- [ ] Smooth transitions between different states
- [ ] Clear user feedback when changing states
- [ ] Consistent terminology across all states

## Design Specifications

### State Hierarchy
1. **Primary**: Current estimation task
2. **Secondary**: Story management  
3. **Tertiary**: Session management

### Message Clarity
- Use action-oriented language ("Create", "Select", "Estimate")
- Avoid technical jargon ("active", "queued")
- Provide clear next steps in every state

### Visual Treatment
- Primary state: Prominent, centrally located
- Secondary state: Reduced visual weight, side panel or collapsible
- Empty states: Helpful, encouraging tone with clear CTAs

## User Experience Flow

### First-Time User
1. Sees "No stories yet - Create your first story"
2. Creates story → automatically becomes active
3. Clear transition to estimation mode

### Returning User
1. Sees existing stories with clear selection options
2. Selects story → estimation mode with minimized story management
3. Can expand story management when needed

### Host vs Player
- Host: Full story management capabilities
- Player: Story context without management complexity

## Testing Strategy

1. **Content Testing**
   - A/B test different empty state messages
   - User comprehension testing for state terminology
   - Task completion rates for different flows

2. **Navigation Testing**  
   - User flow testing from empty → story creation → estimation
   - Back-and-forth navigation between story management and estimation
   - Progressive disclosure usability

## Dependencies

- Coordinates with Feature 07 (Visual Hierarchy) for layout changes
- May impact mobile layout (Feature 10)
- Should align with accessibility improvements (Feature 09)

## Implementation Priority

### High Priority
- Eliminate redundant empty states
- Clarify story selection vs active story

### Medium Priority  
- Progressive disclosure for story management
- Smooth state transitions

### Low Priority
- Advanced host/player role differentiation

## Success Metrics

- Reduced user confusion reports
- Improved task completion for first-time users
- Decreased support questions about story states
- Faster time-to-first-estimation

## Notes

This is primarily a content and information design problem, not a technical architecture issue. Focus on clarity and reducing cognitive load rather than adding new features.
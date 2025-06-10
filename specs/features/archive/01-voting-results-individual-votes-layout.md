# Story 1: Redesign Individual Votes Layout for Scalability

## Epic: Improve Voting Results Display and Interaction

### User Story
**As a** scrum master  
**I want to** see all team members' votes in a compact, scannable format  
**So that** I can quickly identify voting patterns without excessive scrolling

### Acceptance Criteria
- [ ] Individual votes display in a vertical list format
- [ ] Each row shows: avatar, name, and vote value aligned horizontally
- [ ] List supports 15+ participants without breaking layout
- [ ] Vote values are right-aligned for easy scanning
- [ ] Hovering over a row highlights it for better readability
- [ ] On mobile, the layout remains single column with no horizontal scroll

### Technical Details

#### Component Structure
```jsx
<VotesList>
  <VoteRow>
    <UserInfo>
      <Avatar size="small" />
      <UserName>da</UserName>
    </UserInfo>
    <VoteValue>1</VoteValue>
  </VoteRow>
</VotesList>
```

#### Design Specifications
- **Row height**: 48px
- **Avatar size**: 32px
- **Font size**: 14px for names, 18px bold for vote values
- **Padding**: 12px horizontal, 8px vertical
- **Background**: Alternate row coloring (#FAFAFA for even rows)

### Implementation Notes

#### CSS Classes
```css
.votes-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;
}

.vote-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  min-height: 48px;
  transition: background-color 0.2s ease;
}

.vote-row:nth-child(even) {
  background-color: #FAFAFA;
}

.vote-row:hover {
  background-color: #F0F0F0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vote-value {
  font-size: 18px;
  font-weight: bold;
  color: #1a1a1a;
}
```

#### Responsive Considerations
```css
@media (max-width: 768px) {
  .vote-row {
    padding: 12px 16px;
  }
  
  .user-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
```

### Testing Scenarios
1. **Load Test**: Display 20+ participants and verify scrolling performance
2. **Name Truncation**: Test with long names (15+ characters)
3. **Mobile View**: Verify layout on 320px, 375px, and 414px widths
4. **Hover States**: Ensure smooth transitions and proper highlighting
5. **Accessibility**: Verify keyboard navigation through the list

### Dependencies
- Update `VotingResults.tsx` component
- Modify avatar component to support "small" size variant
- Ensure proper TypeScript types for vote data structure

### Estimated Effort
- Frontend Development: 3-4 hours
- Testing: 1-2 hours
- Code Review & Refinement: 1 hour

### Priority
High - This is a fundamental layout change that impacts the entire voting results experience
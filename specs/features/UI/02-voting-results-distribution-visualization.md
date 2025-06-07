# Story 2: Enhance Vote Distribution Visualization

## Epic: Improve Voting Results Display and Interaction

### User Story
**As a** team member  
**I want to** understand the vote spread at a glance  
**So that** I can gauge how aligned the team is on the estimate

### Acceptance Criteria
- [ ] Remove redundant "1 vote" labels
- [ ] Display exact count next to each bar
- [ ] Show percentage with proper rounding (no decimals unless necessary)
- [ ] Add median indicator line on the distribution
- [ ] Highlight the mode (most common vote) with a subtle background
- [ ] Include vote range indicator (min-max)
- [ ] Bars are color-coded: green for consensus, amber for small spread, red for large spread

### Technical Details

#### Component Structure
```jsx
<VoteDistribution>
  <DistributionRow>
    <VoteLabel>1</VoteLabel>
    <ProgressBar value={33.3} color={getSpreadColor(spread)} />
    <Count>1</Count>
    <Percentage>33%</Percentage>
  </DistributionRow>
  <MedianIndicator position={calculateMedianPosition()} />
</VoteDistribution>
```

#### Metrics Display
```
Median: 3 | Average: 3.0 | Range: 4 (1-5)
```

### Implementation Details

#### Color Coding Logic
```typescript
function getSpreadColor(spread: number): string {
  if (spread <= 1) return '#10B981'; // green - consensus
  if (spread <= 2) return '#F59E0B'; // amber - small spread
  return '#EF4444'; // red - large spread
}
```

#### Distribution Calculation
```typescript
interface VoteDistributionData {
  value: string;
  count: number;
  percentage: number;
  isMode: boolean;
  isMedian: boolean;
}

function calculateDistribution(votes: Vote[]): VoteDistributionData[] {
  const voteMap = new Map<string, number>();
  
  // Count votes
  votes.forEach(vote => {
    voteMap.set(vote.value, (voteMap.get(vote.value) || 0) + 1);
  });
  
  // Find mode
  const maxCount = Math.max(...voteMap.values());
  
  // Calculate median
  const sortedValues = votes.map(v => parseInt(v.value)).sort((a, b) => a - b);
  const median = sortedValues[Math.floor(sortedValues.length / 2)];
  
  // Build distribution data
  return Array.from(voteMap.entries()).map(([value, count]) => ({
    value,
    count,
    percentage: Math.round((count / votes.length) * 100),
    isMode: count === maxCount,
    isMedian: parseInt(value) === median
  }));
}
```

### Visual Design

#### Progress Bar Styling
```css
.distribution-row {
  display: grid;
  grid-template-columns: 40px 1fr 40px 50px;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
}

.progress-bar {
  height: 24px;
  border-radius: 4px;
  position: relative;
  background-color: #E5E7EB;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.median-indicator {
  position: absolute;
  width: 2px;
  height: calc(100% + 16px);
  background-color: #6366F1;
  top: -8px;
  z-index: 10;
}

.mode-highlight {
  background-color: rgba(99, 102, 241, 0.1);
  border-radius: 4px;
  margin: -4px -8px;
  padding: 4px 8px;
}
```

#### Responsive Layout
```css
@media (max-width: 768px) {
  .distribution-row {
    grid-template-columns: 30px 1fr 30px 40px;
    gap: 8px;
    font-size: 14px;
  }
  
  .metrics-display {
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
}
```

### Interaction Patterns

#### Hover Effects
- Hovering over a bar shows exact count and percentage in a tooltip
- Median indicator shows "Median: X points" on hover
- Mode rows highlight on hover to emphasize most common vote

#### Click Actions
- Clicking a distribution bar filters the individual votes list to show only those voters
- Clicking the metrics toggles between simple and detailed view

### Testing Scenarios
1. **Edge Cases**: Test with 1 voter, 2 voters, 20+ voters
2. **Tied Modes**: Verify behavior when multiple values have same count
3. **Fibonacci Sequence**: Ensure proper display of 1, 2, 3, 5, 8, 13, 21
4. **Color Accuracy**: Verify color coding matches spread calculations
5. **Performance**: Test smooth animations with rapid vote changes

### Accessibility Considerations
- ARIA labels for screen readers describing the distribution
- Keyboard navigation through distribution bars
- High contrast mode support for color-blind users
- Alternative text representation of the distribution

### Dependencies
- Update `VotingResults.tsx` to use new distribution component
- Add utility functions for statistical calculations
- Ensure WebSocket updates trigger smooth transitions

### Estimated Effort
- Frontend Development: 4-5 hours
- Statistical Logic: 2 hours
- Testing: 2 hours
- Accessibility: 1 hour

### Priority
High - Visual representation of vote distribution is crucial for understanding team alignment
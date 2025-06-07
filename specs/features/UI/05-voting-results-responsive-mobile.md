# Story 5: Implement Responsive Design for Mobile

## Epic: Improve Voting Results Display and Interaction

### User Story
**As a** remote team member  
**I want to** view voting results clearly on my phone  
**So that** I can participate fully in mobile planning sessions

### Acceptance Criteria
- [ ] Voting results stack vertically on screens < 768px
- [ ] Touch targets are minimum 44x44px
- [ ] Swipe gestures reveal additional actions (re-vote, discuss)
- [ ] Distribution chart remains readable with vertical bars if needed
- [ ] Consensus analysis collapses to expandable summary
- [ ] Font sizes increase for better mobile readability

### Technical Details

#### Responsive Breakpoints
```css
/* Mobile: 320px - 767px */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */

@media (max-width: 768px) {
  .voting-results {
    padding: 16px;
  }
  
  .vote-row {
    min-height: 44px;
    touch-action: manipulation;
  }
  
  .distribution-chart {
    flex-direction: column;
  }
}
```

### Mobile-First Implementation

#### 1. Touch-Optimized Vote Rows
```tsx
function MobileVoteRow({ vote, onSwipeLeft, onSwipeRight }) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    const offset = touchEnd - touchStart;
    setSwipeOffset(Math.max(-100, Math.min(100, offset)));
  };
  
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 150) {
      onSwipeLeft(); // Reveal actions
    }
    if (touchEnd - touchStart > 150) {
      onSwipeRight(); // Dismiss actions
    }
    setSwipeOffset(0);
  };
  
  return (
    <div 
      className="mobile-vote-row"
      style={{ transform: `translateX(${swipeOffset}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="vote-content">
        <Avatar size="medium" /> {/* Larger on mobile */}
        <span className="player-name">{vote.playerName}</span>
        <span className="vote-value">{vote.value}</span>
      </div>
      <div className="swipe-actions">
        <button className="action-discuss">Discuss</button>
        <button className="action-change">Change</button>
      </div>
    </div>
  );
}
```

#### 2. Collapsible Consensus Summary
```tsx
function MobileConsensusAnalysis({ consensus }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mobile-consensus">
      <button 
        className="consensus-summary"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="summary-content">
          <StatusIcon status={consensus.status} />
          <span className="status-text">{consensus.shortMessage}</span>
          <ChevronIcon direction={isExpanded ? 'up' : 'down'} />
        </div>
      </button>
      
      {isExpanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="consensus-details"
        >
          <MetricsGrid metrics={consensus.metrics} />
          <Recommendation text={consensus.recommendation} />
        </motion.div>
      )}
    </div>
  );
}
```

#### 3. Vertical Distribution Chart
```tsx
function MobileVoteDistribution({ distribution }) {
  const maxCount = Math.max(...distribution.map(d => d.count));
  
  return (
    <div className="mobile-distribution">
      {distribution.map(item => (
        <div key={item.value} className="distribution-item">
          <div className="bar-container">
            <div 
              className="bar"
              style={{ 
                height: `${(item.count / maxCount) * 100}%`,
                backgroundColor: getBarColor(item)
              }}
            />
            <span className="count-label">{item.count}</span>
          </div>
          <span className="value-label">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
```

### Mobile-Specific Styles

#### Base Mobile Styles
```css
@media (max-width: 768px) {
  /* Typography scaling */
  .voting-results {
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .vote-value {
    font-size: 20px;
    font-weight: 700;
  }
  
  .player-name {
    font-size: 16px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* Touch targets */
  .mobile-vote-row {
    min-height: 56px;
    padding: 12px 16px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease;
  }
  
  .swipe-actions {
    position: absolute;
    right: -200px;
    top: 0;
    height: 100%;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0 16px;
  }
  
  .action-discuss,
  .action-change {
    min-width: 80px;
    height: 40px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }
}
```

#### Vertical Distribution Chart
```css
@media (max-width: 768px) {
  .mobile-distribution {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 200px;
    padding: 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .distribution-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 50px;
    flex: 1;
  }
  
  .bar-container {
    position: relative;
    height: 150px;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  
  .bar {
    width: 70%;
    min-height: 20px;
    border-radius: 4px 4px 0 0;
    transition: height 0.3s ease;
  }
  
  .count-label {
    position: absolute;
    top: -20px;
    font-size: 14px;
    font-weight: 600;
  }
  
  .value-label {
    margin-top: 8px;
    font-size: 16px;
    font-weight: 700;
  }
}
```

#### Bottom Sheet Actions
```css
@media (max-width: 768px) {
  .action-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    padding: 24px 16px;
    padding-bottom: env(safe-area-inset-bottom, 24px);
    z-index: 100;
  }
  
  .action-sheet-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .action-button {
    width: 100%;
    height: 52px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
  }
  
  .action-button.primary {
    background: #6366F1;
    color: white;
  }
  
  .action-button.secondary {
    background: #F3F4F6;
    color: #374151;
  }
}
```

### Touch Gestures

#### Swipe Action Implementation
```typescript
interface SwipeAction {
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

const voteSwipeActions: SwipeAction[] = [
  {
    label: 'Discuss',
    icon: '💬',
    color: '#F59E0B',
    action: () => openDiscussion()
  },
  {
    label: 'Change',
    icon: '✏️',
    color: '#6366F1',
    action: () => changeVote()
  }
];
```

### Accessibility for Mobile

#### Touch Target Guidelines
```css
/* Minimum touch target size */
.touchable {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Increased tap area for small elements */
.small-button::before {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  bottom: -8px;
  left: -8px;
}
```

#### Screen Reader Support
```tsx
<div 
  role="region" 
  aria-label="Voting results"
  aria-live="polite"
>
  <h2 className="sr-only">
    Voting Results: {consensus.status === 'full' ? 'Consensus reached' : 'No consensus'}
  </h2>
  {/* Content */}
</div>
```

### Performance Optimizations

#### 1. Virtualized Lists
```tsx
import { VirtualList } from '@tanstack/react-virtual';

function MobileVotesList({ votes }) {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: votes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Row height
    overscan: 5
  });
  
  return (
    <div ref={parentRef} className="vote-list-container">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <MobileVoteRow vote={votes[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 2. Debounced Interactions
```typescript
const debouncedSwipe = useMemo(
  () => debounce(handleSwipeAction, 300),
  []
);
```

### Testing Requirements

1. **Device Testing**: Test on iOS Safari, Chrome Android, Firefox Mobile
2. **Orientation**: Verify landscape and portrait modes
3. **Touch Interactions**: Test swipe gestures, tap targets
4. **Performance**: Ensure smooth scrolling with 50+ votes
5. **Accessibility**: VoiceOver (iOS) and TalkBack (Android) testing

### Progressive Enhancement

```typescript
// Detect touch capability
const isTouchDevice = 'ontouchstart' in window;

// Provide fallback for non-touch devices
if (!isTouchDevice) {
  // Show hover actions instead of swipe
}
```

### Dependencies
- Add touch gesture library (e.g., react-swipeable)
- Implement responsive breakpoint system
- Update all voting components for mobile
- Add performance monitoring for mobile

### Estimated Effort
- Mobile Layout: 4-5 hours
- Touch Interactions: 3-4 hours
- Testing & Refinement: 3 hours
- Performance Optimization: 2 hours

### Priority
High - Mobile support is essential for remote team participation
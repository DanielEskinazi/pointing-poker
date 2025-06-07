# Story 7: Optimize Information Hierarchy

## Epic: Improve Voting Results Display and Interaction

### User Story
**As a** stakeholder  
**I want to** see the most important information first  
**So that** I can make quick decisions about estimate acceptance

### Acceptance Criteria
- [ ] Reorder sections: Consensus → Summary → Distribution → Details
- [ ] Use progressive disclosure for detailed information
- [ ] Consensus status uses large, clear typography
- [ ] Summary shows only key metrics initially
- [ ] "Show details" expands to show individual votes
- [ ] Visual weight decreases as you move down the hierarchy

### Technical Details

#### Component Structure
```jsx
<VotingResults>
  <ConsensusHeader size="large" status={consensusStatus}>
    {consensusStatus === 'full' ? '✓ Consensus Reached' : '⚠ No Consensus'}
  </ConsensusHeader>
  
  <SummarySection>
    <KeyMetric>Proposed: {median} points</KeyMetric>
    <SecondaryMetrics>
      Range: {min}-{max} | Participation: {voteCount}/{totalCount}
    </SecondaryMetrics>
  </SummarySection>
  
  <CollapsibleSection title="Vote Distribution" defaultOpen={!hasConsensus}>
    <VoteDistribution />
  </CollapsibleSection>
  
  <CollapsibleSection title="Individual Votes" defaultOpen={false}>
    <VotesList />
  </CollapsibleSection>
</VotingResults>
```

### Information Architecture Principles

#### 1. Visual Hierarchy Levels
```
Level 1: Consensus Status (Immediate decision point)
Level 2: Key Metrics (Essential context)
Level 3: Distribution (Pattern understanding)
Level 4: Individual Details (Deep dive)
```

#### 2. Progressive Disclosure Strategy
- **Always Visible**: Consensus status and primary action
- **Initially Visible**: Key metrics and summary
- **Collapsed by Default**: Individual votes (unless no consensus)
- **On Demand**: Historical data and advanced analytics

### Implementation Details

#### 1. Hierarchical Layout Component
```tsx
interface VotingResultsHierarchyProps {
  votes: Vote[];
  story: Story;
  consensus: ConsensusResult;
}

function VotingResultsHierarchy({ votes, story, consensus }: VotingResultsHierarchyProps) {
  const [expandedSections, setExpandedSections] = useState({
    distribution: consensus.status !== 'full',
    details: false,
    analytics: false
  });
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  return (
    <div className="voting-results-hierarchy">
      {/* Level 1: Primary Status */}
      <ConsensusStatus 
        status={consensus.status}
        value={consensus.value}
        confidence={consensus.confidence}
      />
      
      {/* Level 2: Key Metrics */}
      <MetricsSummary
        median={consensus.median}
        participation={`${votes.length}/${story.totalParticipants}`}
        timeElapsed={calculateTimeElapsed(story.votingStartedAt)}
      />
      
      {/* Level 3: Distribution (Collapsible) */}
      <CollapsibleCard
        title="Vote Distribution"
        isOpen={expandedSections.distribution}
        onToggle={() => toggleSection('distribution')}
        priority={consensus.status === 'none' ? 'high' : 'medium'}
      >
        <VoteDistribution votes={votes} />
      </CollapsibleCard>
      
      {/* Level 4: Individual Votes (Collapsible) */}
      <CollapsibleCard
        title={`Individual Votes (${votes.length})`}
        isOpen={expandedSections.details}
        onToggle={() => toggleSection('details')}
        priority="low"
      >
        <VotesList votes={votes} />
      </CollapsibleCard>
      
      {/* Action Bar - Always at bottom */}
      <VotingActionBar consensus={consensus} story={story} />
    </div>
  );
}
```

#### 2. Consensus Status Component (Level 1)
```tsx
function ConsensusStatus({ status, value, confidence }) {
  const statusConfig = {
    full: {
      icon: '✓',
      text: 'Consensus Reached',
      subtext: `All team members agree on ${value} points`,
      className: 'consensus-full'
    },
    near: {
      icon: '⚡',
      text: 'Near Consensus',
      subtext: `Most votes cluster around ${value} points`,
      className: 'consensus-near'
    },
    none: {
      icon: '⚠',
      text: 'No Consensus',
      subtext: 'Significant differences in estimates',
      className: 'consensus-none'
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={`consensus-status ${config.className}`}>
      <div className="status-icon">{config.icon}</div>
      <div className="status-content">
        <h2 className="status-title">{config.text}</h2>
        <p className="status-subtext">{config.subtext}</p>
      </div>
      <div className="confidence-indicator">
        <CircularProgress value={confidence} size="small" />
        <span className="confidence-label">{confidence}% confidence</span>
      </div>
    </div>
  );
}
```

#### 3. Metrics Summary Component (Level 2)
```tsx
function MetricsSummary({ median, participation, timeElapsed }) {
  return (
    <div className="metrics-summary">
      <div className="primary-metric">
        <span className="metric-label">Recommended</span>
        <span className="metric-value">{median}</span>
        <span className="metric-unit">points</span>
      </div>
      
      <div className="secondary-metrics">
        <div className="metric-item">
          <Icon name="users" size="small" />
          <span>{participation} voted</span>
        </div>
        <div className="metric-item">
          <Icon name="clock" size="small" />
          <span>{timeElapsed}</span>
        </div>
      </div>
    </div>
  );
}
```

#### 4. Collapsible Card Component
```tsx
function CollapsibleCard({ title, isOpen, onToggle, priority, children }) {
  const priorityClasses = {
    high: 'border-amber-500 bg-amber-50',
    medium: 'border-gray-300 bg-white',
    low: 'border-gray-200 bg-gray-50'
  };
  
  return (
    <motion.div 
      className={`collapsible-card ${priorityClasses[priority]}`}
      initial={false}
      animate={{ 
        marginBottom: isOpen ? 16 : 8,
        boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.04)'
      }}
    >
      <button
        className="collapsible-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="collapsible-title">{title}</span>
        <ChevronIcon 
          direction={isOpen ? 'up' : 'down'}
          className="collapsible-icon"
        />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="collapsible-content"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

### Visual Design System

#### Typography Scale
```css
/* Level 1 - Primary Status */
.status-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #111827;
}

.status-subtext {
  font-size: 16px;
  font-weight: 400;
  color: #6B7280;
  margin-top: 4px;
}

/* Level 2 - Key Metrics */
.metric-value {
  font-size: 36px;
  font-weight: 800;
  color: #1F2937;
}

.metric-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9CA3AF;
}

/* Level 3 & 4 - Secondary Content */
.collapsible-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.detail-text {
  font-size: 14px;
  font-weight: 400;
  color: #4B5563;
}
```

#### Color & Spacing System
```css
/* Spacing Scale */
.voting-results-hierarchy {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}

/* Level-based spacing */
.consensus-status {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
}

.metrics-summary {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
}

.collapsible-card {
  margin-bottom: var(--spacing-md);
}

/* Visual weight through color */
.consensus-full {
  background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
  border: 2px solid #10B981;
}

.consensus-near {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: 2px solid #F59E0B;
}

.consensus-none {
  background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
  border: 2px solid #EF4444;
}
```

### Responsive Hierarchy

#### Mobile Adaptations
```css
@media (max-width: 768px) {
  /* Compress vertical spacing on mobile */
  .voting-results-hierarchy {
    --spacing-md: 12px;
    --spacing-lg: 16px;
    --spacing-xl: 20px;
  }
  
  /* Stack metrics vertically */
  .metrics-summary {
    flex-direction: column;
    text-align: center;
  }
  
  /* Reduce type scale */
  .status-title {
    font-size: 24px;
  }
  
  .metric-value {
    font-size: 28px;
  }
  
  /* Full-width cards on mobile */
  .collapsible-card {
    margin-left: -16px;
    margin-right: -16px;
    border-radius: 0;
  }
}
```

### Interaction Patterns

#### Smart Defaults
```typescript
function getDefaultExpandedState(consensus: ConsensusResult): ExpandedState {
  return {
    distribution: consensus.status !== 'full', // Show when no consensus
    details: false, // Always start collapsed
    analytics: false // Advanced users only
  };
}
```

#### Guided Flow
```typescript
// If no consensus, guide user through the information
if (consensus.status === 'none') {
  // Highlight distribution section
  highlightSection('distribution');
  
  // Show hint tooltip
  showTooltip({
    target: '.collapsible-card.distribution',
    message: 'Review vote distribution to understand team differences',
    position: 'top'
  });
}
```

### Accessibility Enhancements

#### Screen Reader Optimization
```tsx
<div role="region" aria-label="Voting results summary">
  <h1 className="sr-only">
    Voting Results: {consensus.status === 'full' 
      ? `Consensus reached at ${consensus.value} points` 
      : 'No consensus reached'}
  </h1>
  
  {/* Announce important changes */}
  <div aria-live="polite" aria-atomic="true" className="sr-only">
    {lastChange && `Update: ${lastChange}`}
  </div>
</div>
```

#### Keyboard Navigation
```typescript
// Enable keyboard shortcuts for section navigation
useKeyboardShortcuts({
  'd': () => toggleSection('distribution'),
  'v': () => toggleSection('details'),
  'a': () => focusActionBar()
});
```

### Performance Considerations

#### Lazy Loading
```tsx
const VotesList = lazy(() => import('./VotesList'));
const AdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'));

// Only load when expanded
{expandedSections.details && (
  <Suspense fallback={<LoadingSpinner />}>
    <VotesList votes={votes} />
  </Suspense>
)}
```

#### Memoization
```typescript
const memoizedDistribution = useMemo(
  () => calculateDistribution(votes),
  [votes]
);
```

### Testing Scenarios

1. **Information Scannability**: 5-second test for key information
2. **Expansion States**: Verify correct default states
3. **Mobile Hierarchy**: Test vertical flow on small screens
4. **Accessibility**: Screen reader navigation test
5. **Performance**: Measure render time with 50+ votes

### Dependencies
- Refactor `VotingResults.tsx` for new hierarchy
- Add collapsible card component system
- Implement progressive disclosure patterns
- Update typography scale in design system

### Estimated Effort
- Component Restructuring: 4-5 hours
- Visual Design Implementation: 3 hours
- Interaction Patterns: 2 hours
- Testing & Polish: 2 hours

### Priority
High - Information hierarchy directly impacts decision-making speed and accuracy
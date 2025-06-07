# Story 8: Implement Smart Metrics Display

## Epic: Improve Voting Results Display and Interaction

### User Story
**As a** data-driven team lead  
**I want** relevant statistical insights about our estimates  
**So that** I can identify estimation patterns and improve accuracy

### Acceptance Criteria
- [ ] Show median prominently (more relevant than average for Fibonacci)
- [ ] Calculate and display "estimation confidence" score
- [ ] Add historical comparison ("usually estimates 20% lower")
- [ ] Include velocity-based suggestion if available
- [ ] Display standard deviation in user-friendly terms
- [ ] Provide tooltips explaining each metric

### Technical Details

#### Component Structure
```jsx
<SmartMetrics>
  <PrimaryMetric>
    <Label>Recommended Estimate</Label>
    <Value>{calculateSmartEstimate(votes, historicalData)}</Value>
    <Confidence level={confidenceScore} />
  </PrimaryMetric>
  
  <MetricGrid>
    <Metric 
      label="Team Alignment" 
      value={getAlignmentScore(standardDeviation)}
      help="How closely the team agrees"
    />
    <Metric 
      label="Historical Accuracy" 
      value={getAccuracyTrend(teamId, storyType)}
      help="Based on last 10 similar stories"
    />
  </MetricGrid>
</SmartMetrics>
```

### Confidence Calculation Rules
- **High**: All votes within 1 Fibonacci number
- **Medium**: Votes within 2 Fibonacci numbers
- **Low**: Votes spread across 3+ numbers

### Implementation Details

#### 1. Smart Estimate Calculation
```typescript
interface SmartEstimateResult {
  value: number;
  confidence: number;
  rationale: string;
  factors: EstimationFactor[];
}

function calculateSmartEstimate(
  votes: Vote[], 
  historicalData: HistoricalEstimate[],
  storyMetadata: StoryMetadata
): SmartEstimateResult {
  const median = calculateMedian(votes);
  const mode = calculateMode(votes);
  const spread = calculateSpread(votes);
  
  // Base estimate on median (more stable for Fibonacci)
  let estimate = median;
  let confidence = 100;
  let factors: EstimationFactor[] = [];
  
  // Factor 1: Vote spread
  if (spread <= 1) {
    confidence *= 1.0;
    factors.push({
      name: 'Strong Consensus',
      impact: 'positive',
      description: 'Team votes are tightly clustered'
    });
  } else if (spread <= 2) {
    confidence *= 0.8;
    factors.push({
      name: 'Moderate Agreement',
      impact: 'neutral',
      description: 'Minor variations in estimates'
    });
  } else {
    confidence *= 0.5;
    factors.push({
      name: 'Wide Spread',
      impact: 'negative',
      description: 'Significant disagreement requires discussion'
    });
  }
  
  // Factor 2: Historical accuracy
  if (historicalData.length >= 5) {
    const accuracyRate = calculateHistoricalAccuracy(historicalData);
    const bias = calculateEstimationBias(historicalData);
    
    if (bias > 0.2) {
      estimate = adjustForBias(estimate, bias);
      factors.push({
        name: 'Historical Overestimation',
        impact: 'adjustment',
        description: `Team typically estimates ${Math.round(bias * 100)}% higher`
      });
    } else if (bias < -0.2) {
      estimate = adjustForBias(estimate, bias);
      factors.push({
        name: 'Historical Underestimation',
        impact: 'adjustment',
        description: `Team typically estimates ${Math.round(Math.abs(bias) * 100)}% lower`
      });
    }
    
    confidence *= accuracyRate;
  }
  
  // Factor 3: Story complexity indicators
  const complexityFactors = analyzeStoryComplexity(storyMetadata);
  if (complexityFactors.hasUnknowns) {
    confidence *= 0.7;
    factors.push({
      name: 'Technical Unknowns',
      impact: 'negative',
      description: 'Story contains undefined requirements'
    });
  }
  
  // Factor 4: Team experience
  const experienceFactor = calculateTeamExperience(votes, storyMetadata.type);
  if (experienceFactor < 0.5) {
    confidence *= 0.8;
    factors.push({
      name: 'Limited Domain Experience',
      impact: 'negative',
      description: 'Team has less experience with this story type'
    });
  }
  
  return {
    value: Math.round(estimate),
    confidence: Math.round(confidence),
    rationale: generateRationale(factors),
    factors
  };
}
```

#### 2. Advanced Metrics Components
```tsx
function TeamAlignmentMetric({ votes }: { votes: Vote[] }) {
  const alignment = calculateAlignment(votes);
  const visualLevel = getAlignmentVisualization(alignment);
  
  return (
    <MetricCard>
      <MetricHeader>
        <MetricLabel>Team Alignment</MetricLabel>
        <HelpTooltip>
          Measures how closely the team agrees on the estimate.
          Higher alignment suggests clearer understanding.
        </HelpTooltip>
      </MetricHeader>
      
      <MetricValue>
        <AlignmentVisual level={visualLevel} />
        <AlignmentScore>{alignment.score}%</AlignmentScore>
      </MetricValue>
      
      <MetricInsight>
        {alignment.score > 80 && "Strong agreement - proceed with confidence"}
        {alignment.score > 60 && alignment.score <= 80 && "Moderate agreement - minor clarification may help"}
        {alignment.score <= 60 && "Low agreement - discussion recommended"}
      </MetricInsight>
    </MetricCard>
  );
}

function HistoricalAccuracyMetric({ teamId, storyType }: MetricProps) {
  const { data: accuracy, loading } = useHistoricalAccuracy(teamId, storyType);
  
  if (loading) return <MetricSkeleton />;
  
  return (
    <MetricCard>
      <MetricHeader>
        <MetricLabel>Historical Accuracy</MetricLabel>
        <HelpTooltip>
          How accurate this team's estimates have been for similar stories
        </HelpTooltip>
      </MetricHeader>
      
      <MetricValue>
        <TrendChart data={accuracy.trend} mini />
        <AccuracyScore>{accuracy.percentage}%</AccuracyScore>
      </MetricValue>
      
      <MetricInsight>
        {accuracy.bias > 0 && `Tends to overestimate by ${accuracy.bias}%`}
        {accuracy.bias < 0 && `Tends to underestimate by ${Math.abs(accuracy.bias)}%`}
        {accuracy.bias === 0 && "Estimates are typically accurate"}
      </MetricInsight>
    </MetricCard>
  );
}
```

#### 3. Velocity-Based Suggestions
```typescript
interface VelocitySuggestion {
  suggestedEstimate: number;
  velocityData: VelocityMetrics;
  confidence: number;
  rationale: string;
}

function getVelocityBasedSuggestion(
  story: Story,
  teamVelocity: VelocityMetrics,
  sprintCapacity: number
): VelocitySuggestion | null {
  if (!teamVelocity.hasEnoughData) {
    return null;
  }
  
  const avgVelocity = teamVelocity.average;
  const remainingCapacity = sprintCapacity - teamVelocity.currentSprint;
  
  // Analyze story size relative to team capacity
  const relativeSize = analyzeRelativeSize(story, teamVelocity.completedStories);
  
  let suggestedEstimate = relativeSize.estimate;
  let confidence = relativeSize.confidence;
  
  // Adjust based on sprint capacity
  if (suggestedEstimate > remainingCapacity) {
    return {
      suggestedEstimate,
      velocityData: teamVelocity,
      confidence: confidence * 0.8,
      rationale: `This ${suggestedEstimate}-point story exceeds remaining sprint capacity (${remainingCapacity} points)`
    };
  }
  
  return {
    suggestedEstimate,
    velocityData: teamVelocity,
    confidence,
    rationale: `Based on ${teamVelocity.storiesAnalyzed} similar stories completed at ~${avgVelocity} points/sprint`
  };
}
```

#### 4. User-Friendly Statistics Display
```tsx
function StandardDeviationDisplay({ stdDev, votes }: { stdDev: number, votes: Vote[] }) {
  const interpretation = interpretStandardDeviation(stdDev, votes);
  
  return (
    <div className="std-dev-display">
      <div className="visual-indicator">
        <SpreadVisualizer spread={stdDev} />
      </div>
      
      <div className="interpretation">
        <strong>{interpretation.label}</strong>
        <p>{interpretation.description}</p>
      </div>
      
      <details className="technical-details">
        <summary>Technical details</summary>
        <dl>
          <dt>Standard Deviation</dt>
          <dd>{stdDev.toFixed(2)}</dd>
          <dt>Coefficient of Variation</dt>
          <dd>{(stdDev / calculateMean(votes) * 100).toFixed(1)}%</dd>
        </dl>
      </details>
    </div>
  );
}

function interpretStandardDeviation(stdDev: number, votes: Vote[]): Interpretation {
  const mean = calculateMean(votes);
  const cv = stdDev / mean; // Coefficient of variation
  
  if (cv < 0.15) {
    return {
      label: 'Very High Agreement',
      description: 'The team has an exceptionally consistent view of this story',
      icon: '🎯'
    };
  } else if (cv < 0.3) {
    return {
      label: 'Good Agreement',
      description: 'Minor variations exist but overall alignment is strong',
      icon: '✅'
    };
  } else if (cv < 0.5) {
    return {
      label: 'Moderate Agreement',
      description: 'Notable differences in perspective worth discussing',
      icon: '⚡'
    };
  } else {
    return {
      label: 'Low Agreement',
      description: 'Significant disagreement suggests different interpretations',
      icon: '⚠️'
    };
  }
}
```

#### 5. Metric Tooltips and Education
```tsx
const metricExplanations = {
  median: {
    title: 'Why Median?',
    content: 'Median is less affected by outliers than average, making it ideal for Fibonacci sequences where gaps between numbers grow exponentially.',
    example: 'For votes [3, 5, 5, 13], median is 5 while average is 6.5'
  },
  confidence: {
    title: 'Confidence Score',
    content: 'Combines multiple factors including vote spread, historical accuracy, and story complexity to estimate reliability.',
    factors: ['Vote agreement', 'Historical performance', 'Story clarity', 'Team experience']
  },
  alignment: {
    title: 'Team Alignment',
    content: 'Measures how closely team members agree, beyond just consensus. High alignment (>80%) indicates shared understanding.',
    visualization: <AlignmentScaleVisual />
  }
};

function MetricTooltip({ metric, children }) {
  const explanation = metricExplanations[metric];
  
  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent className="metric-tooltip">
        <h4>{explanation.title}</h4>
        <p>{explanation.content}</p>
        {explanation.example && (
          <div className="example">
            <strong>Example:</strong> {explanation.example}
          </div>
        )}
        {explanation.factors && (
          <ul className="factors">
            {explanation.factors.map(factor => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        )}
        {explanation.visualization}
      </TooltipContent>
    </Tooltip>
  );
}
```

### Visual Design for Metrics

#### Confidence Visualization
```css
.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-bar {
  width: 100px;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.confidence-fill.high {
  background: linear-gradient(90deg, #10B981 0%, #34D399 100%);
}

.confidence-fill.medium {
  background: linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%);
}

.confidence-fill.low {
  background: linear-gradient(90deg, #EF4444 0%, #F87171 100%);
}

.confidence-percentage {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
```

#### Metric Cards Layout
```css
.smart-metrics {
  display: grid;
  gap: 16px;
  margin: 24px 0;
}

.primary-metric {
  background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
  border: 2px solid #6366F1;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.primary-metric .value {
  font-size: 48px;
  font-weight: 800;
  color: #4F46E5;
  line-height: 1;
  margin: 16px 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.metric-card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.metric-card:hover {
  border-color: #6366F1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}
```

### Data Persistence and Analytics

#### Historical Data Schema
```typescript
interface HistoricalEstimate {
  storyId: string;
  estimate: number;
  actualEffort: number;
  accuracy: number;
  teamId: string;
  storyType: string;
  completedAt: Date;
  metadata: {
    teamSize: number;
    sprintNumber: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

interface TeamMetrics {
  teamId: string;
  accuracyRate: number;
  estimationBias: number; // Positive = overestimate, Negative = underestimate
  improvementTrend: number[]; // Accuracy over time
  strongAreas: string[]; // Story types with high accuracy
  weakAreas: string[]; // Story types with low accuracy
}
```

### Testing Requirements

1. **Metric Accuracy**: Verify calculations with known datasets
2. **Edge Cases**: Test with 1 vote, identical votes, extreme spreads
3. **Historical Data**: Test with no history, partial history, full history
4. **Performance**: Ensure smooth updates with real-time vote changes
5. **Tooltips**: Verify all educational content displays correctly

### Dependencies
- Add statistical calculation utilities
- Implement historical data storage and retrieval
- Create visualization components for metrics
- Add educational tooltip system
- Integrate with existing voting results

### Estimated Effort
- Statistical Logic: 4-5 hours
- Metric Components: 4 hours
- Historical Integration: 3 hours
- Visualizations: 3 hours
- Testing & Polish: 2 hours

### Priority
Medium - While valuable for data-driven teams, smart metrics are an enhancement rather than core functionality
# Story 07: Data Export & Statistics

**Epic**: Polish & Production  
**Priority**: P3 - Low  
**Effort**: Medium (3-4 days)  
**Week**: 4

## User Story

**As a** session host or team lead  
**I want** to export session results and view detailed statistics  
**So that** I can document estimates and analyze team performance over time

## Problem Statement

Teams need to document their estimation sessions for project planning and retrospectives. Without export capabilities and statistics, valuable estimation data is lost when sessions end.

## Acceptance Criteria

### ✅ Data Export
- [ ] Export session results to CSV format
- [ ] Export session results to JSON format
- [ ] Export session results to PDF report
- [ ] Include all stories, votes, and final estimates
- [ ] Include session metadata and participant info

### ✅ Statistics & Analytics
- [ ] Session-level statistics (consensus rate, velocity, etc.)
- [ ] Individual player statistics (participation, accuracy)
- [ ] Story complexity analysis (high variance estimates)
- [ ] Time-based metrics (voting speed, session duration)
- [ ] Historical trends across multiple sessions

### ✅ Reporting Features
- [ ] Visual charts for voting distributions
- [ ] Consensus heatmaps showing agreement levels
- [ ] Velocity trends over time
- [ ] Player participation reports
- [ ] Estimation accuracy tracking

### ✅ Data Integration
- [ ] Export data compatible with Jira/Azure DevOps
- [ ] Webhook support for external systems
- [ ] API endpoints for programmatic access
- [ ] Real-time statistics during session

## Technical Requirements

### Export Service
```typescript
// Backend export service:
class ExportService {
  exportToCSV(sessionId: string): Promise<string>
  exportToJSON(sessionId: string): Promise<object>
  exportToPDF(sessionId: string): Promise<Buffer>
  getSessionStatistics(sessionId: string): Promise<SessionStats>
}

// Export data structure:
interface ExportData {
  session: SessionDetails
  stories: StoryWithVotes[]
  players: PlayerStats[]
  statistics: SessionStatistics
  metadata: ExportMetadata
}
```

### Statistics Calculation
```typescript
interface SessionStatistics {
  // Consensus metrics
  consensusRate: number // % of stories with >80% agreement
  averageAgreement: number
  highVarianceStories: string[] // Stories with wide vote spread
  
  // Velocity metrics
  totalStoryPoints: number
  averagePointsPerStory: number
  estimationVelocity: number // Stories per hour
  
  // Participation metrics
  playerParticipation: Record<string, number> // % votes cast
  averageVotingTime: number
  sessionDuration: number
  
  // Quality metrics
  revotingRate: number // % of stories that needed re-voting
  discussionRate: number // % of stories with discussion time
}
```

### Export API Endpoints
```typescript
// Export endpoints:
GET /api/sessions/:id/export/csv
GET /api/sessions/:id/export/json  
GET /api/sessions/:id/export/pdf
GET /api/sessions/:id/statistics
GET /api/sessions/:id/charts/consensus
GET /api/sessions/:id/charts/velocity
```

### Frontend Export Components
```typescript
// Components to create:
- src/components/ExportPanel.tsx - Export options UI
- src/components/StatisticsPanel.tsx - Live statistics display
- src/components/Charts/ConsensusChart.tsx - Voting agreement charts
- src/components/Charts/VelocityChart.tsx - Estimation velocity
- src/components/Reports/SessionReport.tsx - Comprehensive report view
```

## Export Formats

### CSV Export Structure
```csv
Session Name,Planning Poker Session
Date,2024-06-03
Duration,45 minutes
Host,Alice Johnson

Story ID,Title,Description,Final Estimate,Consensus Rate,Vote Details
US-123,User Login,As a user I want to login,5,0.85,"Alice:5,Bob:5,Carol:3"
US-124,Password Reset,As a user I want to reset password,3,1.0,"Alice:3,Bob:3,Carol:3"

Player,Stories Voted,Participation Rate,Average Vote,Consensus Contribution
Alice,2,100%,4.0,0.85
Bob,2,100%,4.0,0.85
Carol,2,100%,3.0,0.70
```

### JSON Export Structure
```json
{
  "session": {
    "id": "uuid",
    "name": "Planning Poker Session",
    "date": "2024-06-03T10:00:00Z",
    "duration": 2700,
    "host": "Alice Johnson"
  },
  "stories": [
    {
      "id": "uuid", 
      "title": "User Login",
      "description": "As a user, I want to login...",
      "finalEstimate": "5",
      "votes": [
        {"player": "Alice", "value": "5", "timestamp": "..."},
        {"player": "Bob", "value": "5", "timestamp": "..."}
      ],
      "consensusRate": 0.85,
      "votingDuration": 120
    }
  ],
  "statistics": {
    "consensusRate": 0.85,
    "totalStoryPoints": 8,
    "sessionDuration": 2700,
    "playerParticipation": {"Alice": 1.0, "Bob": 1.0}
  }
}
```

### PDF Report Layout
```
┌─ Planning Poker Session Report ─────┐
│ Session: Team Sprint Planning       │
│ Date: June 3, 2024                  │
│ Duration: 45 minutes                 │
│ Participants: 3 players              │
│                                     │
│ 📊 Session Summary                   │
│ • Stories Estimated: 5               │
│ • Total Story Points: 21             │
│ • Consensus Rate: 85%                │
│ • Average Voting Time: 2.3 min      │
│                                     │
│ 📈 Story Breakdown                   │
│ US-123: User Login (5 pts) ✅       │
│ US-124: Password Reset (3 pts) ✅   │
│ US-125: Profile Page (8 pts) ⚠️     │
│                                     │
│ 👥 Player Statistics                 │
│ Alice: 100% participation, 4.2 avg  │
│ Bob: 100% participation, 4.0 avg    │
│ Carol: 80% participation, 3.8 avg   │
│                                     │
│ 🎯 Recommendations                   │
│ • Review high-variance story US-125  │
│ • Good consensus on most stories     │
│ • Consider breaking down large items │
└─────────────────────────────────────┘
```

## Statistics & Analytics

### Real-time Statistics Panel
```
┌─ Live Session Stats ────────────────┐
│ 📊 Current Session                   │
│ Stories Completed: 3/8               │
│ Average Estimate: 4.2 points        │
│ Consensus Rate: 85%                  │
│ Time Elapsed: 32 minutes             │
│                                     │
│ 🎯 Voting Progress                   │
│ ████████████████░░░░ 80% complete    │
│                                     │
│ 👥 Player Activity                   │
│ Alice: 100% voted                    │
│ Bob: 100% voted                      │
│ Carol: 67% voted                     │
│                                     │
│ [Export Results] [Detailed Report]   │
└─────────────────────────────────────┘
```

### Historical Analytics
```typescript
// Multi-session analytics:
interface HistoricalAnalytics {
  sessions: SessionSummary[]
  trends: {
    velocityTrend: DataPoint[] // Stories per hour over time
    consensusTrend: DataPoint[] // Agreement rate over time
    participationTrend: DataPoint[] // Participation over time
  }
  teamMetrics: {
    topPerformers: PlayerStats[]
    consensusBuilders: PlayerStats[] // Players who help reach agreement
    estimationAccuracy: PlayerStats[] // How close to final estimates
  }
}
```

### Consensus Analysis
```typescript
// Analyze voting patterns:
interface ConsensusAnalysis {
  highConsensusStories: Story[] // >90% agreement
  lowConsensusStories: Story[] // <50% agreement
  consensusBreakers: string[] // Stories that required re-voting
  discussionStories: Story[] // Stories with wide initial spread
  
  // Pattern recognition:
  commonVotePatterns: VotePattern[]
  outlierVotes: OutlierVote[]
  estimationBias: EstimationBias
}
```

## Chart Visualizations

### Consensus Heatmap
```typescript
// Show agreement levels across stories:
interface ConsensusHeatmap {
  stories: string[]
  players: string[]
  agreementMatrix: number[][] // 0-1 agreement scores
  colors: string[] // Heat colors based on agreement
}
```

### Velocity Chart
```typescript
// Track estimation speed over time:
interface VelocityChart {
  timePoints: Date[]
  storiesCompleted: number[]
  pointsEstimated: number[]
  trendLine: number[]
}
```

### Vote Distribution Charts
```typescript
// Show voting patterns:
interface VoteDistribution {
  cardValues: string[]
  voteCounts: number[]
  percentages: number[]
  mostPopularCard: string
  leastPopularCard: string
}
```

## Integration Features

### Jira/Azure DevOps Export
```typescript
// Export format compatible with external tools:
interface JiraExportFormat {
  issues: Array<{
    key: string
    summary: string
    description: string
    storyPoints: number
    customFields: {
      consensusRate: number
      votingDetails: string
      estimationDate: string
    }
  }>
}
```

### Webhook Notifications
```typescript
// Send data to external systems:
interface WebhookPayload {
  event: 'session_completed' | 'story_estimated'
  sessionId: string
  data: ExportData
  timestamp: Date
}

// Configure webhooks:
POST /api/webhooks
{
  url: "https://your-system.com/planning-poker",
  events: ["session_completed"],
  headers: {"Authorization": "Bearer token"}
}
```

## Definition of Done
- [ ] CSV export includes all session data in usable format
- [ ] JSON export provides complete programmatic access to data
- [ ] PDF report is professional and comprehensive
- [ ] Real-time statistics update during session
- [ ] Historical analytics track trends across sessions
- [ ] Consensus analysis identifies discussion points
- [ ] Charts visualize key metrics effectively
- [ ] Export formats are compatible with common tools
- [ ] Webhook integration works with external systems
- [ ] Export performance is good for large sessions
- [ ] All export features work in different browsers

## Dependencies
- All previous stories (need complete functionality to export)
- Session history data (need multiple sessions for trends)

## Risks & Mitigation
- **Risk**: Large data export performance issues
- **Mitigation**: Streaming exports, pagination for large sessions

- **Risk**: Complex statistics calculations
- **Mitigation**: Pre-calculate common metrics, cache results

- **Risk**: PDF generation complexity
- **Mitigation**: Use established libraries (jsPDF, PDFKit)

## Testing Strategy
- Unit tests for export functions and statistics calculations
- Integration tests for export API endpoints
- Performance tests with large session data
- Cross-browser testing for file downloads
- Data integrity testing (export matches source)
- Chart rendering testing across devices
- Webhook delivery testing with mock external systems
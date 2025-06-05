# Story 3: Data Export & Statistics Implementation

**Priority**: P1 - High  
**Estimate**: 2 days  
**Dependencies**: Story 1 (Core functionality working)

## Problem Statement
Phase 2 specifications included comprehensive data export and statistics features that are completely missing from the current implementation. Teams need to export session results for documentation, track velocity metrics, and analyze estimation patterns.

## Acceptance Criteria

### 1. Export Functionality
- [ ] Export button available to host after session
- [ ] CSV export with all session data
- [ ] JSON export for integration with other tools
- [ ] PDF report generation with summary and charts
- [ ] Clipboard copy for quick sharing
- [ ] Export includes all stories, votes, and timestamps

### 2. Session Statistics
- [ ] Average story points per session
- [ ] Estimation velocity trends
- [ ] Consensus rate (% of unanimous votes)
- [ ] Time spent per story
- [ ] Participation rate by player
- [ ] Story complexity distribution

### 3. Real-time Analytics
- [ ] Live statistics update during session
- [ ] Visual charts for vote distribution
- [ ] Consensus indicator for current vote
- [ ] Time tracking per story
- [ ] Player participation metrics

### 4. Historical Data
- [ ] Session history for past 30 days
- [ ] Velocity trends over time
- [ ] Team estimation accuracy metrics
- [ ] Individual player statistics
- [ ] Exportable historical reports

## Technical Implementation

### Export Service
```typescript
// src/services/export/index.ts
export class ExportService {
  async exportToCSV(session: Session): Promise<void> {
    const csv = this.generateCSV(session);
    this.downloadFile(csv, `planning-poker-${session.id}.csv`, 'text/csv');
  }
  
  async exportToJSON(session: Session): Promise<void> {
    const json = JSON.stringify(this.formatSessionData(session), null, 2);
    this.downloadFile(json, `planning-poker-${session.id}.json`, 'application/json');
  }
  
  async exportToPDF(session: Session): Promise<void> {
    const pdf = await this.generatePDF(session);
    this.downloadFile(pdf, `planning-poker-${session.id}.pdf`, 'application/pdf');
  }
  
  private generateCSV(session: Session): string {
    const headers = ['Story', 'Description', 'Final Estimate', 'Consensus', 'Votes', 'Duration'];
    const rows = session.stories.map(story => [
      story.title,
      story.description,
      story.finalEstimate || 'N/A',
      story.consensus ? 'Yes' : 'No',
      this.formatVotes(story.votes),
      this.formatDuration(story.duration)
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
  
  private async generatePDF(session: Session): Promise<Blob> {
    // Use jsPDF or similar library
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Planning Poker Session Report', 20, 20);
    
    // Session info
    doc.setFontSize(12);
    doc.text(`Session ID: ${session.id}`, 20, 40);
    doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString()}`, 20, 50);
    doc.text(`Duration: ${this.formatDuration(session.duration)}`, 20, 60);
    doc.text(`Total Stories: ${session.stories.length}`, 20, 70);
    
    // Statistics summary
    doc.text('Summary Statistics:', 20, 90);
    doc.text(`• Average Points: ${session.stats.averagePoints}`, 30, 100);
    doc.text(`• Consensus Rate: ${session.stats.consensusRate}%`, 30, 110);
    doc.text(`• Total Points: ${session.stats.totalPoints}`, 30, 120);
    
    // Add charts
    const chartCanvas = await this.generateChart(session);
    doc.addImage(chartCanvas, 'PNG', 20, 140, 170, 100);
    
    // Stories table
    doc.addPage();
    this.addStoriesTable(doc, session.stories);
    
    return doc.output('blob');
  }
}
```

### Statistics Calculator
```typescript
// src/services/statistics/calculator.ts
export class StatisticsCalculator {
  calculateSessionStats(session: Session): SessionStatistics {
    const stories = session.stories.filter(s => s.finalEstimate);
    
    return {
      totalStories: stories.length,
      totalPoints: this.calculateTotalPoints(stories),
      averagePoints: this.calculateAveragePoints(stories),
      consensusRate: this.calculateConsensusRate(stories),
      velocityTrend: this.calculateVelocityTrend(stories),
      timePerStory: this.calculateTimePerStory(stories),
      participation: this.calculateParticipation(session),
      distribution: this.calculateDistribution(stories)
    };
  }
  
  calculateRealTimeStats(votes: Record<string, Vote>): RealTimeStats {
    const voteValues = Object.values(votes).map(v => v.value);
    
    return {
      mean: this.calculateMean(voteValues),
      median: this.calculateMedian(voteValues),
      mode: this.calculateMode(voteValues),
      standardDeviation: this.calculateStdDev(voteValues),
      consensus: this.checkConsensus(voteValues),
      distribution: this.getDistribution(voteValues),
      outliers: this.detectOutliers(voteValues)
    };
  }
  
  private calculateConsensusRate(stories: Story[]): number {
    const consensusCount = stories.filter(story => {
      const votes = Object.values(story.votes);
      const uniqueValues = new Set(votes.map(v => v.value));
      return uniqueValues.size === 1;
    }).length;
    
    return (consensusCount / stories.length) * 100;
  }
  
  private detectOutliers(values: number[]): number[] {
    const q1 = this.percentile(values, 25);
    const q3 = this.percentile(values, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound);
  }
}
```

### Statistics Display Component
```typescript
// src/components/SessionStatistics.tsx
const SessionStatistics = () => {
  const { session, statistics } = useStore();
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  
  if (!statistics) return null;
  
  return (
    <div className="statistics-panel">
      <div className="stats-header">
        <h3>Session Statistics</h3>
        <div className="export-buttons">
          <button onClick={() => exportService.exportToCSV(session)}>
            <Download /> CSV
          </button>
          <button onClick={() => exportService.exportToJSON(session)}>
            <Download /> JSON
          </button>
          <button onClick={() => exportService.exportToPDF(session)}>
            <Download /> PDF Report
          </button>
        </div>
      </div>
      
      <div className="stats-grid">
        <StatCard
          title="Total Points"
          value={statistics.totalPoints}
          icon={<TrendingUp />}
          trend={statistics.velocityTrend}
        />
        
        <StatCard
          title="Average Points"
          value={statistics.averagePoints.toFixed(1)}
          icon={<BarChart3 />}
        />
        
        <StatCard
          title="Consensus Rate"
          value={`${statistics.consensusRate.toFixed(0)}%`}
          icon={<Users />}
          color={statistics.consensusRate > 70 ? 'green' : 'yellow'}
        />
        
        <StatCard
          title="Time per Story"
          value={formatDuration(statistics.timePerStory)}
          icon={<Clock />}
        />
      </div>
      
      <div className="charts-section">
        <div className="chart-controls">
          <button 
            className={chartType === 'bar' ? 'active' : ''}
            onClick={() => setChartType('bar')}
          >
            Bar Chart
          </button>
          <button 
            className={chartType === 'pie' ? 'active' : ''}
            onClick={() => setChartType('pie')}
          >
            Pie Chart
          </button>
          <button 
            className={chartType === 'line' ? 'active' : ''}
            onClick={() => setChartType('line')}
          >
            Trend Line
          </button>
        </div>
        
        <div className="chart-container">
          {chartType === 'bar' && <VoteDistributionChart data={statistics.distribution} />}
          {chartType === 'pie' && <ComplexityPieChart data={statistics.complexity} />}
          {chartType === 'line' && <VelocityTrendChart data={statistics.velocityHistory} />}
        </div>
      </div>
      
      <ParticipationTable players={statistics.participation} />
    </div>
  );
};
```

### Chart Components
```typescript
// src/components/charts/VoteDistributionChart.tsx
import { Bar } from 'react-chartjs-2';

const VoteDistributionChart = ({ data }) => {
  const chartData = {
    labels: Object.keys(data),
    datasets: [{
      label: 'Vote Distribution',
      data: Object.values(data),
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: 'rgb(99, 102, 241)',
      borderWidth: 1
    }]
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Vote Distribution'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };
  
  return <Bar data={chartData} options={options} />;
};

// src/components/charts/VelocityTrendChart.tsx
import { Line } from 'react-chartjs-2';

const VelocityTrendChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [{
      label: 'Velocity',
      data: data.map(d => d.velocity),
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4
    }]
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Velocity Trend'
      }
    }
  };
  
  return <Line data={chartData} options={options} />;
};
```

### Real-time Statistics Hook
```typescript
// src/hooks/useRealtimeStats.ts
export const useRealtimeStats = () => {
  const { votes, currentStory } = useStore();
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  
  useEffect(() => {
    if (!currentStory || Object.keys(votes).length === 0) {
      setStats(null);
      return;
    }
    
    const calculator = new StatisticsCalculator();
    const newStats = calculator.calculateRealTimeStats(votes);
    setStats(newStats);
  }, [votes, currentStory]);
  
  return stats;
};

// Usage in VotingResults
const VotingResults = () => {
  const stats = useRealtimeStats();
  
  return (
    <div className="voting-results">
      {stats && (
        <div className="stats-summary">
          <div className="consensus-indicator">
            {stats.consensus ? (
              <CheckCircle className="text-green-500" />
            ) : (
              <AlertCircle className="text-yellow-500" />
            )}
            <span>{stats.consensus ? 'Consensus!' : 'No consensus'}</span>
          </div>
          
          <div className="quick-stats">
            <span>Mean: {stats.mean.toFixed(1)}</span>
            <span>Median: {stats.median}</span>
            <span>Std Dev: {stats.standardDeviation.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Backend API Endpoints
```typescript
// backend/src/routes/statistics.ts
router.get('/sessions/:sessionId/statistics', async (req, res) => {
  const { sessionId } = req.params;
  
  const statistics = await statisticsService.getSessionStatistics(sessionId);
  res.json(statistics);
});

router.get('/sessions/:sessionId/export/:format', async (req, res) => {
  const { sessionId, format } = req.params;
  
  const data = await exportService.exportSession(sessionId, format);
  
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  res.send(data.content);
});

router.get('/teams/:teamId/velocity', async (req, res) => {
  const { teamId } = req.params;
  const { days = 30 } = req.query;
  
  const velocity = await statisticsService.getTeamVelocity(teamId, days);
  res.json(velocity);
});
```

## Dependencies
```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.6.0",
    "papaparse": "^5.4.1"
  }
}
```

## Testing Requirements
- [ ] Export CSV with 100+ stories
- [ ] Export PDF with charts renders correctly
- [ ] Real-time stats update within 100ms
- [ ] Charts render smoothly with 50+ data points
- [ ] Historical data loads for 30 days
- [ ] Export works on mobile devices
- [ ] Statistics calculate correctly for edge cases

## Definition of Done
- Export functionality works for all formats
- Statistics display in real-time during voting
- Charts render smoothly and are interactive
- Historical data tracking implemented
- Mobile-friendly export options
- Performance optimized for large datasets
- Unit tests for statistics calculations
- Integration tests for export functionality
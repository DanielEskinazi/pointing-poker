# Story 06: Timer & Enhanced Game Flow

**Epic**: Enhanced UX  
**Priority**: P2 - Medium  
**Effort**: Medium (3-4 days)  
**Week**: 3

## User Story

**As a** session host  
**I want** to set voting timers and manage game flow efficiently  
**So that** my team stays focused and estimation sessions run smoothly

## Problem Statement

Currently, there's no timer functionality and the game flow is basic. Teams need structured time management to keep estimation sessions focused and productive.

## Acceptance Criteria

### ✅ Voting Timer
- [ ] Host can set custom timer duration for voting rounds
- [ ] Timer counts down visibly for all players
- [ ] Audio/visual alerts when timer is about to expire
- [ ] Cards auto-reveal when timer reaches zero (optional)
- [ ] Host can pause/resume/reset timer

### ✅ Game Flow Management
- [ ] Round-based structure with clear phases
- [ ] Automatic progression through voting phases
- [ ] Session history tracking completed stories
- [ ] Batch voting for multiple stories
- [ ] Session summary with all estimates

### ✅ Timer Configuration
- [ ] Configurable timer defaults per session
- [ ] Different timer modes (countdown, stopwatch, none)
- [ ] Timer settings persist across rounds
- [ ] Quick timer presets (30s, 1min, 2min, 5min)

### ✅ Enhanced Controls
- [ ] Host dashboard with all game controls
- [ ] Quick actions (skip story, extend timer, force reveal)
- [ ] Session settings panel
- [ ] Export session results

## Technical Requirements

### Timer Backend Implementation
```typescript
// Add timer to session config:
interface SessionConfig {
  timerSeconds: number
  timerMode: 'countdown' | 'stopwatch' | 'none'
  autoReveal: boolean
  timerWarningSeconds: number
}

// Timer state tracking:
interface TimerState {
  isRunning: boolean
  startedAt: Date | null
  duration: number
  remainingTime: number
  mode: 'countdown' | 'stopwatch' | 'none'
}
```

### WebSocket Timer Events
```typescript
// Timer events:
'timer:start' -> broadcast timer started
'timer:pause' -> broadcast timer paused  
'timer:resume' -> broadcast timer resumed
'timer:reset' -> broadcast timer reset
'timer:expired' -> broadcast timer finished
'timer:update' -> broadcast time remaining (every second)
```

### Frontend Timer Components
```typescript
// Components to create:
- src/components/Timer.tsx - Main timer display
- src/components/TimerControls.tsx - Host timer controls
- src/components/TimerSettings.tsx - Configuration panel
- src/components/GameFlowControls.tsx - Round management
- src/components/SessionSummary.tsx - Final results
```

## UI/UX Design

### Timer Display
```
┌─ Voting Timer ──────────────────────┐
│            ⏱️ 1:23                   │
│     Time remaining to vote           │
│                                     │
│ [████████████░░░] 80% complete      │
│                                     │
│ ⚠️ 30 seconds left!                  │
└─────────────────────────────────────┘
```

### Host Timer Controls
```
┌─ Timer Controls ────────────────────┐
│ Duration: [2:00 ▼] [30s][1m][2m][5m]│
│                                     │
│ ⏱️ 1:23 remaining                    │
│                                     │
│ [▶️ Start] [⏸️ Pause] [🔄 Reset]      │
│                                     │
│ ☑️ Auto-reveal when timer expires    │
│ ☑️ Play warning sound at 30s        │
└─────────────────────────────────────┘
```

### Game Flow Dashboard
```
┌─ Session Progress ──────────────────┐
│ Story 3 of 8 • 45 min elapsed       │
│                                     │
│ ✅ US-123: User Login (5 pts)        │
│ ✅ US-124: Password Reset (3 pts)    │
│ 🎯 US-125: Profile Page (voting...) │
│ ⏳ US-126: Settings Page             │
│ ⏳ US-127: Logout Function           │
│                                     │
│ [Skip Story] [Next Story] [Summary] │
└─────────────────────────────────────┘
```

## Timer Implementation

### Server-Side Timer Management
```typescript
class SessionTimer {
  private sessionId: string
  private duration: number
  private startTime: Date | null = null
  private intervalId: NodeJS.Timeout | null = null
  
  start(duration: number) {
    this.duration = duration
    this.startTime = new Date()
    
    // Broadcast timer start
    this.emit('timer:started', { duration, startTime: this.startTime })
    
    // Update every second
    this.intervalId = setInterval(() => {
      const remaining = this.getRemainingTime()
      this.emit('timer:update', { remaining })
      
      if (remaining <= 0) {
        this.expire()
      }
    }, 1000)
  }
  
  expire() {
    this.stop()
    this.emit('timer:expired')
    
    // Auto-reveal if configured
    if (this.sessionConfig.autoReveal) {
      this.votingService.revealCards(this.sessionId)
    }
  }
}
```

### Client-Side Timer Sync
```typescript
// Keep client timer in sync with server:
const useTimer = (sessionId: string) => {
  const [timerState, setTimerState] = useState<TimerState>()
  
  useEffect(() => {
    wsClient.on('timer:started', (data) => {
      setTimerState({
        isRunning: true,
        startedAt: new Date(data.startTime),
        duration: data.duration,
        remainingTime: data.duration
      })
    })
    
    wsClient.on('timer:update', (data) => {
      setTimerState(prev => ({
        ...prev,
        remainingTime: data.remaining
      }))
    })
    
    wsClient.on('timer:expired', () => {
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        remainingTime: 0
      }))
      
      // Show expiration notification
      showToast("Time's up! Revealing cards...", 'warning')
    })
  }, [])
  
  return timerState
}
```

## Game Flow Enhancement

### Round-Based Structure
```typescript
interface GameRound {
  storyId: string
  status: 'waiting' | 'voting' | 'discussing' | 'completed'
  startedAt: Date
  completedAt?: Date
  finalEstimate?: string
  timerDuration?: number
}

interface SessionProgress {
  currentRound: number
  totalRounds: number
  completedStories: CompletedStory[]
  estimatedTimeRemaining: number
}
```

### Batch Story Management
```typescript
// Add multiple stories at once:
const addBatchStories = (stories: StoryData[]) => {
  return Promise.all(
    stories.map(story => storyApi.create(sessionId, story))
  )
}

// Quick story templates:
const STORY_TEMPLATES = [
  { title: "User Story Template", description: "As a user, I want..." },
  { title: "Bug Fix Template", description: "Fix issue with..." },
  { title: "Technical Task", description: "Implement..." }
]
```

### Session Summary
```typescript
interface SessionSummary {
  sessionName: string
  duration: number
  storiesCompleted: number
  totalPoints: number
  averagePointsPerStory: number
  participantCount: number
  consensusRate: number // % of stories with high agreement
  stories: CompletedStory[]
}
```

## Timer Modes

### Countdown Mode
```typescript
// Standard countdown timer:
- Starts at configured duration
- Counts down to zero
- Visual/audio warnings at intervals
- Auto-reveals when expired (optional)
```

### Stopwatch Mode
```typescript
// Track time spent without limit:
- Starts at 00:00
- Counts up indefinitely
- Shows how long round has been active
- No auto-reveal, manual control only
```

### No Timer Mode
```typescript
// Traditional planning poker:
- No time pressure
- Host controls all reveals manually
- Focus on discussion and consensus
```

## Advanced Features

### Timer Warnings
```typescript
// Configurable warning thresholds:
const warningThresholds = [60, 30, 10, 5] // seconds

warningThresholds.forEach(threshold => {
  if (remaining === threshold) {
    showToast(`${threshold} seconds remaining!`, 'warning')
    playWarningSound()
  }
})
```

### Session Analytics
```typescript
// Track session metrics:
interface SessionMetrics {
  averageVotingTime: number
  storiesPerHour: number
  participationRate: number
  consensusRate: number
  mostProductiveTimeSlot: string
}
```

## Definition of Done
- [ ] Host can set and control voting timers
- [ ] Timer syncs accurately across all browsers
- [ ] Audio/visual warnings work at configured intervals
- [ ] Auto-reveal works when timer expires (if enabled)
- [ ] Game flow controls allow efficient session management
- [ ] Session progress tracking shows completed stories
- [ ] Timer settings persist across rounds
- [ ] Different timer modes work correctly
- [ ] Session summary provides useful metrics
- [ ] Export functionality works for session results

## Dependencies
- WebSocket Real-time Sync (Story 03) - Need real-time timer updates
- Story Management UI (Story 01) - Need stories to time
- Voting Flow Completion (Story 02) - Need voting to time

## Risks & Mitigation
- **Risk**: Timer sync issues across multiple clients
- **Mitigation**: Server-authoritative timer with client sync
- **Fallback**: Local timers with periodic server sync

- **Risk**: Complex game flow state management
- **Mitigation**: Simple state machine for round progression

## Testing Strategy
- Unit tests for timer components and logic
- Integration tests for timer WebSocket events
- Multi-browser testing for timer synchronization
- Timezone testing for distributed teams
- Load testing with timers and multiple sessions
- E2E tests for complete game flow scenarios
- Audio/visual notification testing
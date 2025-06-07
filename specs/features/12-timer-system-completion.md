# Feature 12: Timer System Completion

## Status: Not Started
## Priority: Critical  
## Estimated Effort: 5-8 days
## Gap Analysis Source: Timer System Incomplete (40% Complete)

## Problem Statement

The current timer system displays countdown functionality but lacks essential host controls and automation features that are critical for effective planning poker sessions. Users cannot properly manage time-boxed estimation sessions.

**Current State:**
- Timer display works correctly
- Manual timer start/stop partially functional
- No host-specific timer controls
- No automatic card reveal on timer expiry
- Timer synchronization across clients is unreliable

## Success Criteria

- [x] Timer displays correctly (already working)
- [ ] Host can configure timer duration
- [ ] Host can start/pause/stop timer for all participants
- [ ] Timer automatically reveals cards when reaching zero
- [ ] Timer state synchronizes reliably across all clients
- [ ] Timer persistence during session recovery
- [ ] Audio/visual notifications for timer events

## Technical Requirements

### Component Analysis

**Files to Modify:**
- `src/components/Timer.tsx` - Display component (extend)
- `src/components/TimerConfig.tsx` - New configuration component
- `src/components/HostControls.tsx` - Add timer controls
- `backend/src/websocket/events.ts` - Timer synchronization events
- `src/store.ts` - Timer state management

### Timer Configuration Features

```typescript
interface TimerConfig {
  duration: number; // seconds
  autoReveal: boolean;
  warningThresholds: number[]; // [30, 10, 5] seconds
  soundEnabled: boolean;
}

interface TimerState {
  isActive: boolean;
  remainingTime: number;
  startedAt: number;
  pausedAt?: number;
  config: TimerConfig;
}
```

### Host Timer Controls

1. **Timer Configuration Panel**
   - Duration presets (1min, 2min, 5min, custom)
   - Auto-reveal toggle
   - Warning threshold settings
   - Sound notification toggle

2. **Timer Control Actions**
   - Start timer for current story
   - Pause/resume timer
   - Stop timer and reset
   - Extend timer (add time)
   - Force reveal cards

### Automatic Card Reveal

```typescript
// Timer expiration logic
const handleTimerExpiry = () => {
  if (timerConfig.autoReveal && !voting.isRevealed) {
    revealCards();
    emit(ClientEvents.CARDS_REVEAL, {
      storyId: activeStory.id,
      reason: 'timer_expired'
    });
  }
};
```

### WebSocket Synchronization

**New Timer Events:**
```typescript
enum TimerEvents {
  TIMER_START = 'timer:start',
  TIMER_PAUSE = 'timer:pause',
  TIMER_STOP = 'timer:stop',
  TIMER_SYNC = 'timer:sync',
  TIMER_CONFIG = 'timer:config'
}

interface TimerSyncPayload {
  sessionId: string;
  storyId: string;
  state: TimerState;
  serverTime: number; // for time synchronization
}
```

## Implementation Tasks

### Phase 1: Host Timer Controls (2-3 days)

#### Task 1.1: Timer Configuration Component
```tsx
// src/components/TimerConfig.tsx
export const TimerConfig = ({ onConfigChange }: TimerConfigProps) => {
  // Duration selection with presets
  // Auto-reveal toggle
  // Warning thresholds
  // Sound settings
};
```

#### Task 1.2: Enhanced Host Controls
```tsx
// Extend src/components/HostControls.tsx
const TimerControls = () => {
  return (
    <div className="timer-controls">
      <button onClick={startTimer}>Start Timer</button>
      <button onClick={pauseTimer}>Pause</button>
      <button onClick={stopTimer}>Stop</button>
      <button onClick={extendTimer}>+1 Min</button>
    </div>
  );
};
```

#### Task 1.3: Timer State Management
```typescript
// Extend src/store.ts timer slice
interface TimerSlice {
  timer: TimerState;
  startTimer: (config: TimerConfig) => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  syncTimer: (state: TimerState) => void;
}
```

### Phase 2: Auto-Reveal Functionality (1-2 days)

#### Task 2.1: Timer Expiry Handler
```typescript
// src/hooks/useTimer.ts
export const useTimer = () => {
  const handleExpiry = useCallback(() => {
    if (config.autoReveal && isHost && !isRevealed) {
      revealCards();
      showToast('Timer expired - cards revealed!', 'info');
    }
  }, [config.autoReveal, isHost, isRevealed]);
};
```

#### Task 2.2: Warning Notifications
```typescript
// Warning thresholds (30s, 10s, 5s)
const checkWarnings = (remainingTime: number) => {
  const warnings = [30, 10, 5];
  warnings.forEach(threshold => {
    if (remainingTime === threshold) {
      showToast(`${threshold} seconds remaining`, 'warning');
      if (config.soundEnabled) {
        playWarningSound();
      }
    }
  });
};
```

### Phase 3: WebSocket Synchronization (2-3 days)

#### Task 3.1: Backend Timer Events
```typescript
// backend/src/websocket/events.ts
export const handleTimerStart = (socket: Socket, data: TimerStartPayload) => {
  // Validate host permissions
  // Broadcast timer start to all session participants
  // Store timer state in Redis for persistence
};
```

#### Task 3.2: Client Timer Synchronization
```typescript
// src/hooks/useWebSocket.ts
const syncTimerWithServer = (serverState: TimerState, serverTime: number) => {
  const timeDiff = Date.now() - serverTime;
  const adjustedTime = serverState.remainingTime - (timeDiff / 1000);
  updateTimerState({ ...serverState, remainingTime: adjustedTime });
};
```

#### Task 3.3: Timer Persistence
```typescript
// Timer state recovery during reconnection
const recoverTimerState = async (sessionId: string) => {
  const timerState = await api.getTimerState(sessionId);
  if (timerState.isActive) {
    syncTimer(timerState);
  }
};
```

## Design Specifications

### Timer Configuration UI

```
┌─────────────────────────────────┐
│ Timer Configuration             │
├─────────────────────────────────┤
│ Duration: [1m] [2m] [5m] [Custom]│
│ Custom: [___] minutes           │
│                                 │
│ ☑ Auto-reveal cards on expiry   │
│ ☑ Sound notifications          │
│                                 │
│ Warnings at: 30s, 10s, 5s      │
│ [Save Configuration]            │
└─────────────────────────────────┘
```

### Host Timer Controls

```
┌─────────────────────────────────┐
│ Timer: 02:30 remaining          │
├─────────────────────────────────┤
│ [▶ Start] [⏸ Pause] [⏹ Stop]   │
│ [⚙ Config] [+1 Min]            │
└─────────────────────────────────┘
```

### Timer States & Visual Feedback

1. **Inactive State**: Gray timer display, "Ready to start"
2. **Active State**: Blue timer display, countdown animation
3. **Warning State**: Orange timer display (last 30s)
4. **Critical State**: Red timer display, pulsing animation (last 10s)
5. **Expired State**: Red background, "Time's up!" message

## User Experience Flow

### Host Workflow
1. **Setup**: Host configures timer duration and settings
2. **Start**: Host starts timer for current story estimation
3. **Monitor**: All participants see synchronized countdown
4. **Warnings**: Automatic notifications at threshold intervals
5. **Expiry**: Cards auto-reveal (if enabled) or manual reveal

### Participant Experience
1. **Awareness**: Clear timer display shows remaining time
2. **Warnings**: Visual/audio cues for time remaining
3. **Completion**: Automatic card reveal or clear indication of time expiry

## Testing Strategy

### Unit Tests
```typescript
describe('Timer System', () => {
  it('should start timer with correct duration', () => {});
  it('should pause and resume timer correctly', () => {});
  it('should auto-reveal cards on expiry', () => {});
  it('should sync timer state across clients', () => {});
  it('should persist timer state during reconnection', () => {});
});
```

### Integration Tests
- Host timer controls affect all participants
- Timer synchronization during network interruptions
- Timer persistence across session recovery
- Auto-reveal functionality with WebSocket events

### E2E Tests
- Complete timer workflow from configuration to expiry
- Multi-client timer synchronization
- Timer behavior during reconnection scenarios

## Dependencies

- **Backend**: WebSocket event system, Redis for timer persistence
- **Frontend**: Zustand store timer slice, WebSocket client
- **UI Components**: Timer display, host controls, configuration modal

## Risk Mitigation

### Clock Synchronization Issues
```typescript
// Use server time as source of truth
const getServerTime = async () => {
  const response = await fetch('/api/time');
  return response.json().timestamp;
};

// Compensate for network latency
const syncWithServerTime = (serverTime: number, requestTime: number) => {
  const networkDelay = (Date.now() - requestTime) / 2;
  return serverTime + networkDelay;
};
```

### Connection Loss During Timer
```typescript
// Store timer state locally for resilience
const handleReconnection = () => {
  const localTimerState = getLocalTimerState();
  const serverTimerState = await fetchServerTimerState();
  
  // Reconcile differences
  const reconciledState = reconcileTimerStates(localTimerState, serverTimerState);
  updateTimerState(reconciledState);
};
```

## Success Metrics

- [ ] 100% timer synchronization accuracy across clients
- [ ] <500ms timer event propagation latency
- [ ] 99.9% auto-reveal reliability when timer expires
- [ ] Zero timer state loss during reconnection
- [ ] Host timer controls respond within 100ms

## Implementation Notes

### Performance Considerations
- Use `setInterval` with 100ms precision for smooth countdown
- Debounce timer sync events to avoid WebSocket spam
- Optimize timer state updates to prevent unnecessary re-renders

### Accessibility
- Screen reader announcements for timer warnings
- Keyboard shortcuts for host timer controls
- High contrast timer displays for visually impaired users

### Mobile Considerations
- Touch-friendly timer control buttons
- Vibration notifications for timer warnings (if supported)
- Responsive timer display for small screens
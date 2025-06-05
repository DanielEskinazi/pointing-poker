# Story 2: Complete Timer Implementation

**Priority**: P0 - Critical  
**Estimate**: 2 days  
**Dependencies**: Story 1 (WebSocket stability)

## Problem Statement
The current Timer component is a basic display-only component showing elapsed time. Phase 2 specifications promised a full-featured timer with host controls, synchronization, audio alerts, and auto-reveal functionality. This is essential for time-boxed estimation sessions.

## Current State
```typescript
// Current Timer.tsx - Very basic
const Timer = () => {
  const { startTime } = useStore();
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  
  // Just displays time...
};
```

## Acceptance Criteria

### 1. Timer Configuration
- [ ] Host can set timer duration (1-15 minutes)
- [ ] Quick presets available (1, 3, 5, 10 minutes)
- [ ] Timer mode selection: Countdown, Stopwatch, or None
- [ ] Settings persist for the session

### 2. Timer Controls
- [ ] Start/Stop button for host only
- [ ] Pause/Resume functionality
- [ ] Reset timer to initial value
- [ ] Add time (+30s, +1m) during countdown
- [ ] Controls disabled for non-host players

### 3. Timer Display
- [ ] Large, prominent countdown/stopwatch display
- [ ] Progress bar showing time remaining
- [ ] Color changes as time runs out (green → yellow → red)
- [ ] Smooth animations for countdown

### 4. Alerts & Warnings
- [ ] Visual warning at 1 minute remaining
- [ ] Visual + audio alert at 30 seconds
- [ ] Final countdown for last 10 seconds
- [ ] Completion animation and sound
- [ ] Option to mute audio alerts

### 5. Auto-Actions
- [ ] Optional auto-reveal when timer expires
- [ ] Optional auto-skip if no votes submitted
- [ ] Warning before auto-actions execute
- [ ] Host can cancel auto-actions

### 6. Synchronization
- [ ] Timer state syncs across all clients
- [ ] Start/stop/pause events broadcast instantly
- [ ] All clients show same remaining time
- [ ] Handles clock drift between clients

## Technical Implementation

### Timer Store State
```typescript
interface TimerState {
  mode: 'countdown' | 'stopwatch' | 'none';
  duration: number; // seconds
  remaining: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
  startedAt: number; // timestamp
  pausedAt: number; // timestamp
  settings: {
    autoReveal: boolean;
    autoSkip: boolean;
    audioEnabled: boolean;
    warningAt: number[]; // seconds remaining for warnings
  };
}

interface TimerActions {
  configureTimer: (config: TimerConfig) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addTime: (seconds: number) => void;
  syncTimer: (state: TimerState) => void;
}
```

### Enhanced Timer Component
```typescript
const Timer = () => {
  const { 
    timer, 
    isHost,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    addTime
  } = useStore();
  
  const [displayTime, setDisplayTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Calculate display time accounting for pause
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - timer.startedAt) / 1000;
      
      if (timer.mode === 'countdown') {
        const remaining = Math.max(0, timer.duration - elapsed);
        setDisplayTime(remaining);
        
        // Check for warnings
        checkWarnings(remaining);
        
        // Auto-reveal if enabled and time's up
        if (remaining === 0 && timer.settings.autoReveal) {
          handleAutoReveal();
        }
      } else {
        setDisplayTime(elapsed);
      }
    }, 100); // Update more frequently for smooth display
    
    return () => clearInterval(interval);
  }, [timer]);
  
  const checkWarnings = (remaining: number) => {
    // Visual warnings
    if (remaining <= 60 && remaining > 30) {
      setWarningLevel('low');
    } else if (remaining <= 30 && remaining > 10) {
      setWarningLevel('medium');
      if (Math.floor(remaining) === 30 && timer.settings.audioEnabled) {
        playSound('warning');
      }
    } else if (remaining <= 10) {
      setWarningLevel('high');
      if (remaining <= 10 && Number.isInteger(remaining) && timer.settings.audioEnabled) {
        playSound('tick');
      }
    }
    
    // Completion
    if (remaining === 0 && timer.settings.audioEnabled) {
      playSound('complete');
    }
  };
  
  return (
    <div className={cn("timer-container", `warning-${warningLevel}`)}>
      <TimerDisplay time={displayTime} mode={timer.mode} />
      
      {isHost && (
        <TimerControls
          isRunning={timer.isRunning}
          isPaused={timer.isPaused}
          onStart={startTimer}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
          onReset={resetTimer}
          onAddTime={addTime}
        />
      )}
      
      <TimerProgress 
        elapsed={timer.duration - displayTime}
        total={timer.duration}
        mode={timer.mode}
      />
      
      <audio ref={audioRef} />
    </div>
  );
};
```

### Timer Configuration Modal
```typescript
const TimerConfig = ({ onSave, currentConfig }) => {
  const [config, setConfig] = useState(currentConfig);
  
  const presets = [
    { label: '1 min', value: 60 },
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 }
  ];
  
  return (
    <Modal>
      <h2>Timer Settings</h2>
      
      <div className="timer-mode">
        <label>Mode</label>
        <RadioGroup 
          value={config.mode}
          onChange={mode => setConfig({...config, mode})}
        >
          <Radio value="countdown">Countdown</Radio>
          <Radio value="stopwatch">Stopwatch</Radio>
          <Radio value="none">No Timer</Radio>
        </RadioGroup>
      </div>
      
      {config.mode === 'countdown' && (
        <>
          <div className="duration-selector">
            <label>Duration</label>
            <div className="presets">
              {presets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setConfig({...config, duration: preset.value})}
                  className={config.duration === preset.value ? 'active' : ''}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={config.duration / 60}
              onChange={e => setConfig({...config, duration: e.target.value * 60})}
              min="1"
              max="15"
            />
          </div>
          
          <div className="timer-options">
            <Checkbox
              checked={config.settings.autoReveal}
              onChange={checked => setConfig({
                ...config,
                settings: {...config.settings, autoReveal: checked}
              })}
            >
              Auto-reveal votes when timer expires
            </Checkbox>
            
            <Checkbox
              checked={config.settings.audioEnabled}
              onChange={checked => setConfig({
                ...config,
                settings: {...config.settings, audioEnabled: checked}
              })}
            >
              Play audio alerts
            </Checkbox>
          </div>
        </>
      )}
      
      <div className="actions">
        <button onClick={() => onSave(config)}>Save Settings</button>
      </div>
    </Modal>
  );
};
```

### WebSocket Events
```typescript
// Timer events
socket.on('timer:start', (timerState) => {
  store.syncTimer(timerState);
});

socket.on('timer:pause', (timerState) => {
  store.syncTimer(timerState);
});

socket.on('timer:stop', () => {
  store.stopTimer();
});

socket.on('timer:update', (timerState) => {
  store.syncTimer(timerState);
});

// Host emits timer events
const startTimer = () => {
  const timerState = {
    mode: timer.mode,
    duration: timer.duration,
    startedAt: Date.now(),
    isRunning: true,
    isPaused: false
  };
  
  socket.emit('timer:start', { sessionId, timerState });
};
```

### Audio Assets
```typescript
// Preload audio files
const sounds = {
  warning: new Audio('/sounds/warning.mp3'),
  tick: new Audio('/sounds/tick.mp3'),
  complete: new Audio('/sounds/complete.mp3')
};

// Configure audio
Object.values(sounds).forEach(audio => {
  audio.volume = 0.5;
  audio.preload = 'auto';
});
```

## Styling Requirements
```css
/* Timer visual states */
.timer-container {
  transition: all 0.3s ease;
}

.timer-container.warning-low {
  --timer-color: #f59e0b; /* Yellow */
}

.timer-container.warning-medium {
  --timer-color: #ef4444; /* Red */
}

.timer-container.warning-high {
  --timer-color: #dc2626; /* Dark red */
  animation: pulse 1s infinite;
}

/* Progress bar */
.timer-progress {
  background: var(--timer-color, #10b981);
  transition: width 0.1s linear;
}

/* Final countdown animation */
@keyframes countdown-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.timer-display.final-countdown {
  animation: countdown-pulse 1s ease-in-out infinite;
}
```

## Testing Requirements
- [ ] Test all timer modes (countdown, stopwatch, none)
- [ ] Verify synchronization across multiple browsers
- [ ] Test pause/resume maintains correct time
- [ ] Verify audio alerts play at correct times
- [ ] Test auto-reveal functionality
- [ ] Verify timer persists through page refresh
- [ ] Test with different timezones
- [ ] Performance test with 10+ users

## Definition of Done
- All timer functionality implemented per spec
- Real-time synchronization working perfectly
- Audio alerts working (with mute option)
- Visual warnings and animations smooth
- No timer drift between clients
- Host-only controls enforced
- Unit tests for timer logic
- Manual testing completed
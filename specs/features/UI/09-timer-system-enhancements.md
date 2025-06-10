# Timer System Enhancements

## Overview

The current timer system has several usability issues that need to be addressed to provide a smooth user experience. This specification outlines fixes for pause/resume functionality, addition of time reduction capabilities, and enhanced timer configuration options.

## Current Issues

### 1. Pause/Resume Button State Bug
**Problem**: Once the timer is paused, the pause button remains yellow and doesn't switch back to a green "Resume" button.

**Root Cause Analysis**:
- Frontend logic in `TimerDisplay.tsx:138-145` expects `isRunning = false` when paused
- Backend timer service maintains `isRunning = true` during pause state
- State synchronization mismatch between frontend expectations and backend reality

### 2. Missing Time Reduction Feature
**Problem**: Users can only add time to the timer, but cannot reduce the remaining time.

### 3. Limited Timer Configuration
**Problem**: Users can only set timer duration through the configuration modal. The timer display itself is not interactive for quick adjustments.

## Solution Design

### 1. Fix Pause/Resume Button State

#### Frontend Changes (`src/components/TimerDisplay.tsx`)

**Current Logic (Lines 138-145)**:
```tsx
{!timerState.isRunning ? (
  <button onClick={timerState.isPaused ? resumeTimer : () => startTimer(timerState.duration, timerState.mode)}>
    {timerState.isPaused ? 'Resume' : 'Start'}
  </button>
) : (
  <button onClick={pauseTimer}>Pause</button>
)}
```

**New Logic**:
```tsx
{timerState.isRunning && !timerState.isPaused ? (
  <button 
    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
    onClick={pauseTimer}
  >
    Pause
  </button>
) : timerState.isPaused ? (
  <button 
    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
    onClick={resumeTimer}
  >
    Resume
  </button>
) : (
  <button 
    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
    onClick={() => startTimer(timerState.duration, timerState.mode)}
  >
    Start
  </button>
)}
```

**State Logic Clarification**:
- `isRunning = true, isPaused = false` → Running (show Pause button)
- `isRunning = true, isPaused = true` → Paused (show Resume button)  
- `isRunning = false, isPaused = false` → Stopped (show Start button)

#### Backend Validation (`backend/src/services/timer.service.ts`)

Add state validation to ensure consistency:
```typescript
private validateTimerState(state: TimerState): TimerState {
  // Ensure state consistency
  if (!state.isRunning) {
    state.isPaused = false;
  }
  
  // Validate time remaining
  if (state.timeRemaining <= 0) {
    state.isRunning = false;
    state.isPaused = false;
  }
  
  return state;
}
```

### 2. Add Time Reduction Feature

#### New Functionality
- Add "−" button next to existing "+" button
- Reduce time in 30-second increments (configurable)
- Minimum time limit: 10 seconds
- Disable reduction when timer is below minimum

#### Frontend Implementation

**New Buttons (in `TimerDisplay.tsx`)**:
```tsx
<div className="flex items-center space-x-2 mt-2">
  <button 
    onClick={() => adjustTimer(-30)}
    disabled={timerState.timeRemaining <= 10}
    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white w-8 h-8 rounded"
  >
    −
  </button>
  <span className="text-sm text-gray-600">Adjust time</span>
  <button 
    onClick={() => adjustTimer(30)}
    className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded"
  >
    +
  </button>
</div>
```

#### Backend Implementation

**New Service Method (`timer.service.ts`)**:
```typescript
async adjustTimer(sessionId: string, adjustmentSeconds: number): Promise<TimerState | null> {
  const timerState = await this.getTimerState(sessionId);
  if (!timerState || !timerState.isRunning) return null;
  
  const newTimeRemaining = Math.max(10, timerState.timeRemaining + adjustmentSeconds);
  timerState.timeRemaining = newTimeRemaining;
  
  // Adjust duration if extending beyond original
  if (newTimeRemaining > timerState.duration) {
    timerState.duration = newTimeRemaining;
  }
  
  await this.saveTimerState(sessionId, timerState);
  this.emit('timer:updated', sessionId, timerState);
  
  return timerState;
}
```

#### WebSocket Events

**New Event (`backend/src/websocket/events.ts`)**:
```typescript
export interface TimerAdjustEvent {
  type: 'TIMER_ADJUST';
  adjustmentSeconds: number;
}
```

### 3. Enhanced Timer Configuration - Clickable Numbers

#### Interactive Time Display
Make the timer display numbers clickable for quick time setting.

**Implementation Approach**:
- Click on minutes/seconds to open inline editor
- Use input field with validation
- Apply changes immediately (if timer not running) or queue for next start
- Host-only permission

#### Frontend Implementation

**Clickable Time Display**:
```tsx
const [editingTime, setEditingTime] = useState<'minutes' | 'seconds' | null>(null);
const [tempTime, setTempTime] = useState({ minutes: 0, seconds: 0 });

// In the time display section
<div className="text-6xl font-mono">
  {editingTime === 'minutes' ? (
    <input 
      type="number" 
      value={tempTime.minutes}
      onChange={(e) => setTempTime(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
      onBlur={() => handleTimeEdit('minutes')}
      onKeyPress={(e) => e.key === 'Enter' && handleTimeEdit('minutes')}
      className="w-16 text-center bg-transparent border-b-2 border-blue-500"
      autoFocus
    />
  ) : (
    <span 
      onClick={() => isHost && !timerState.isRunning && setEditingTime('minutes')}
      className={isHost && !timerState.isRunning ? 'cursor-pointer hover:text-blue-500' : ''}
    >
      {String(Math.floor(timerState.timeRemaining / 60)).padStart(2, '0')}
    </span>
  )}
  :
  {editingTime === 'seconds' ? (
    <input 
      type="number" 
      value={tempTime.seconds}
      onChange={(e) => setTempTime(prev => ({ ...prev, seconds: parseInt(e.target.value) || 0 }))}
      onBlur={() => handleTimeEdit('seconds')}
      onKeyPress={(e) => e.key === 'Enter' && handleTimeEdit('seconds')}
      className="w-16 text-center bg-transparent border-b-2 border-blue-500"
      autoFocus
    />
  ) : (
    <span 
      onClick={() => isHost && !timerState.isRunning && setEditingTime('seconds')}
      className={isHost && !timerState.isRunning ? 'cursor-pointer hover:text-blue-500' : ''}
    >
      {String(timerState.timeRemaining % 60).padStart(2, '0')}
    </span>
  )}
</div>
```

### 4. Improved Configuration Modal

#### Enhanced TimerConfig.tsx
- Add quick preset buttons (30s, 1m, 2m, 5m, 10m, 15m)
- Add custom time input with minute/second fields
- Add time adjustment increment setting (15s, 30s, 60s)
- Preview timer with current settings

#### New Configuration Options
```typescript
interface TimerConfiguration {
  defaultDuration: number;           // Default timer duration in seconds
  adjustmentIncrement: number;       // Time adjustment increment (15, 30, or 60 seconds)
  minimumTime: number;              // Minimum timer value (default: 10 seconds)
  audioEnabled: boolean;            // Enable audio alerts
  warningAt: number[];              // Warning thresholds in seconds [30, 10, 5]
  autoReveal: boolean;              // Auto-reveal cards when timer expires
}
```

## Implementation Plan

### Phase 1: Fix Pause/Resume Bug
1. **Update frontend button logic** in `TimerDisplay.tsx`
2. **Add state validation** in backend timer service
3. **Test pause/resume functionality** across multiple browser tabs
4. **Add debugging logs** for timer state changes

### Phase 2: Add Time Reduction
1. **Implement adjustment buttons** in frontend
2. **Add `adjustTimer` method** to backend service
3. **Create WebSocket events** for timer adjustment
4. **Add validation** for minimum time limits

### Phase 3: Clickable Time Display
1. **Create inline editing** for time display
2. **Add validation** for time input
3. **Implement host permission** checks
4. **Add visual feedback** for clickable elements

### Phase 4: Enhanced Configuration
1. **Add preset buttons** to configuration modal
2. **Implement adjustment increment** setting
3. **Add timer preview** functionality
4. **Persist new settings** in session state

## Testing Requirements

### Manual Testing Scenarios
1. **Pause/Resume Flow**:
   - Start timer → Pause → Verify yellow becomes green Resume button
   - Resume → Verify green becomes yellow Pause button
   - Test across multiple browser tabs for synchronization

2. **Time Adjustment**:
   - Test time reduction with running timer
   - Verify minimum time limit enforcement
   - Test time addition functionality
   - Verify adjustments sync across clients

3. **Clickable Configuration**:
   - Click on minutes/seconds when timer stopped
   - Verify input validation (0-59 for seconds, reasonable limits for minutes)
   - Test host-only permission enforcement
   - Verify changes apply correctly

4. **Cross-Browser Synchronization**:
   - Test all features with multiple tabs/browsers
   - Verify WebSocket events propagate correctly
   - Test network disconnection/reconnection scenarios

### Automated Testing
- Unit tests for timer state logic
- WebSocket event testing
- Component interaction testing
- State synchronization validation

## Success Criteria

1. ✅ Pause button correctly switches to green Resume button
2. ✅ Resume button correctly switches back to yellow Pause button  
3. ✅ Time can be reduced in configurable increments
4. ✅ Time display numbers are clickable for quick editing
5. ✅ All timer interactions sync across connected clients
6. ✅ Host-only permissions are enforced for timer controls
7. ✅ Configuration modal provides enhanced preset and custom options
8. ✅ Timer state remains consistent across network disconnections

## Files to Modify

### Frontend
- `src/components/TimerDisplay.tsx` - Fix button logic, add adjustment controls, clickable time
- `src/components/TimerConfig.tsx` - Enhanced configuration options
- `src/store.ts` - Add timer adjustment actions
- `src/services/websocket/client.ts` - Handle timer adjustment events

### Backend  
- `backend/src/services/timer.service.ts` - Add adjustment methods, state validation
- `backend/src/websocket/events.ts` - New timer adjustment events
- `backend/src/websocket/connection-manager.ts` - Handle timer adjustment requests
- `backend/src/controllers/session.controller.ts` - Timer configuration endpoints

### Testing
- `backend/tests/services/timer.service.test.ts` - Timer logic tests
- Add new test files for adjustment functionality
- Integration tests for WebSocket timer events

## Notes

- All timer modifications should maintain backward compatibility
- WebSocket events must be broadcast to all session participants
- Timer state should be validated on both client and server sides
- Consider adding telemetry for timer usage analytics
- Ensure accessibility compliance for clickable timer elements
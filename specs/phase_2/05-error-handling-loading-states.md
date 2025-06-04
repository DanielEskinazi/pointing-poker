# Story 05: Error Handling & Loading States

**Epic**: Enhanced UX  
**Priority**: P2 - Medium  
**Effort**: Low (2-3 days)  
**Week**: 3

## User Story

**As a** user of the planning poker application  
**I want** clear feedback when actions are loading or when errors occur  
**So that** I understand what's happening and can take appropriate action

## Problem Statement

Currently, the application lacks proper error handling and loading states. Users don't know when actions are in progress, and errors fail silently or show confusing messages, leading to poor user experience.

## Acceptance Criteria

### ✅ Loading States
- [ ] All API calls show loading indicators
- [ ] Vote submission shows loading state on clicked card
- [ ] Session creation shows loading spinner
- [ ] Button states indicate when actions are processing
- [ ] Page-level loading for session data fetching

### ✅ Error Handling
- [ ] Network errors show user-friendly messages
- [ ] API errors display specific, actionable feedback
- [ ] Session not found shows helpful error page
- [ ] Vote submission errors allow retry
- [ ] Connection errors suggest troubleshooting steps

### ✅ Connection Status
- [ ] WebSocket connection status clearly visible
- [ ] Offline/online state indicators
- [ ] Reconnection attempts shown to user
- [ ] Actions disabled when disconnected
- [ ] Queue status for offline actions

### ✅ Form Validation
- [ ] Real-time validation for story creation
- [ ] Session join form validation
- [ ] Clear error messages for invalid inputs
- [ ] Prevent submission of invalid data

## Technical Requirements

### Error Boundary Implementation
```typescript
// Create error boundaries:
- src/components/ErrorBoundary.tsx - Global error catching
- src/components/SessionErrorBoundary.tsx - Session-specific errors
- src/components/VotingErrorBoundary.tsx - Voting flow errors
```

### Loading State Components
```typescript
// Loading components:
- src/components/LoadingSpinner.tsx - Reusable spinner
- src/components/LoadingCard.tsx - Card loading skeleton
- src/components/LoadingButton.tsx - Button with loading state
- src/components/PageLoader.tsx - Full page loading
```

### Error Types & Messages
```typescript
interface AppError {
  type: 'network' | 'api' | 'validation' | 'connection'
  message: string
  code?: string
  retry?: () => void
  details?: string
}

// User-friendly error messages:
const ERROR_MESSAGES = {
  NETWORK_ERROR: "Connection problem. Check your internet and try again.",
  SESSION_NOT_FOUND: "This session doesn't exist or has expired.",
  INVALID_VOTE: "Please select a valid card before voting.",
  WEBSOCKET_FAILED: "Real-time updates aren't working. Page will auto-refresh.",
  SESSION_EXPIRED: "Your session has expired. Please rejoin."
}
```

### Loading States Integration
```typescript
// React Query loading states:
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['session', sessionId],
  queryFn: () => sessionApi.get(sessionId),
  retry: 3,
  retryDelay: 1000
})

// Mutation loading states:
const { mutate: submitVote, isPending } = useMutation({
  mutationFn: votingApi.submitVote,
  onError: (error) => showError(error),
  onSuccess: () => showSuccess("Vote submitted!")
})
```

## UI/UX Design

### Loading States
```
┌─ Submitting Vote ───────────────────┐
│ [1] [2] [3] [🔄] [8] [13] [?] [☕]   │
│       Loading...                    │
└─────────────────────────────────────┘

┌─ Creating Session ──────────────────┐
│ Session Name: [________________]     │
│ Host Name: [________________]        │
│ [🔄 Creating Session...]            │
└─────────────────────────────────────┘
```

### Error Messages
```
┌─ Connection Error ──────────────────┐
│ ⚠️ Connection Problem                │
│                                     │
│ Your vote couldn't be submitted.    │
│ Check your internet connection      │
│ and try again.                      │
│                                     │
│ [Try Again] [Cancel]                │
└─────────────────────────────────────┘
```

### Connection Status
```
🟢 Connected - Real-time updates active
🟡 Reconnecting... (Attempt 2 of 5)
🔴 Offline - Changes will sync when back online
📡 3 actions queued for when reconnected
```

## Error Handling Strategies

### Network Errors
```typescript
// Automatic retry with exponential backoff:
const retryConfig = {
  retries: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  retryCondition: (error) => {
    return error.response?.status >= 500 || error.code === 'NETWORK_ERROR'
  }
}

// Show user-friendly messages:
if (error.code === 'NETWORK_ERROR') {
  showToast("Connection problem. Retrying...", 'warning')
}
```

### API Errors
```typescript
// Handle specific API error codes:
const handleApiError = (error: ApiError) => {
  switch (error.code) {
    case 'SESSION_NOT_FOUND':
      navigate('/session-not-found')
      break
    case 'INVALID_VOTE':
      showError("Please select a valid card before voting.")
      break
    case 'SESSION_EXPIRED':
      showError("Session expired. Please rejoin.")
      clearSessionData()
      break
    default:
      showError("Something went wrong. Please try again.")
  }
}
```

### WebSocket Connection Errors
```typescript
// Handle connection failures gracefully:
wsClient.on('disconnect', () => {
  setConnectionStatus('disconnected')
  showToast("Connection lost. Trying to reconnect...", 'warning')
  startReconnectionAttempts()
})

wsClient.on('connect', () => {
  setConnectionStatus('connected')  
  showToast("Connected! Syncing changes...", 'success')
  flushOfflineQueue()
})
```

## Form Validation

### Story Creation Validation
```typescript
const storySchema = z.object({
  title: z.string()
    .min(1, "Story title is required")
    .max(200, "Title too long (200 chars max)"),
  description: z.string()
    .max(1000, "Description too long (1000 chars max)")
    .optional()
})

// Real-time validation:
const { errors, isValid } = useFormValidation(storySchema)
```

### Session Join Validation
```typescript
const joinSchema = z.object({
  playerName: z.string()
    .min(1, "Name is required")
    .max(50, "Name too long (50 chars max)")
    .regex(/^[a-zA-Z0-9\s]+$/, "Only letters, numbers and spaces allowed"),
  sessionId: z.string()
    .uuid("Invalid session link")
})
```

## Toast Notifications

### Notification Types
```typescript
// Success notifications:
showToast("Vote submitted successfully!", 'success')
showToast("Story created!", 'success')

// Warning notifications:  
showToast("Reconnecting...", 'warning')
showToast("Some players haven't voted yet", 'warning')

// Error notifications:
showToast("Failed to submit vote", 'error')
showToast("Session not found", 'error')

// Info notifications:
showToast("Alice joined the session", 'info')
showToast("Cards revealed!", 'info')
```

## State Management

### Error State
```typescript
interface ErrorState {
  errors: AppError[]
  showError: (error: AppError) => void
  clearError: (errorId: string) => void
  clearAllErrors: () => void
}
```

### Loading State
```typescript
interface LoadingState {
  isLoading: Record<string, boolean>
  setLoading: (key: string, loading: boolean) => void
  isAnyLoading: () => boolean
}
```

## Definition of Done
- [ ] All API calls show appropriate loading states
- [ ] Network errors display user-friendly messages with retry options
- [ ] WebSocket connection status is clearly visible
- [ ] Form validation provides real-time feedback
- [ ] Error boundaries catch and handle unexpected errors gracefully
- [ ] Toast notifications work for all major actions
- [ ] Offline actions are queued and user is informed
- [ ] Page doesn't crash on any error scenarios
- [ ] Loading states are consistent across the application
- [ ] Error messages are helpful and actionable

## Dependencies
- All previous stories (need working features to add error handling)

## Risks & Mitigation
- **Risk**: Over-engineering error handling
- **Mitigation**: Start simple, add complexity only where needed

- **Risk**: Too many loading states affecting UX
- **Mitigation**: Use subtle indicators, avoid blocking entire UI

## Testing Strategy
- Unit tests for error boundary components
- Integration tests for error handling flows
- Network failure simulation testing
- Error scenario testing (invalid inputs, expired sessions)
- Loading state testing with slow network conditions
- Toast notification testing
- Accessibility testing for error states
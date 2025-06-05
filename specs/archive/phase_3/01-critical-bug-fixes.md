# Story 1: Critical Bug Fixes

**Priority**: P0 - Critical  
**Estimate**: 3 days  
**Dependencies**: None

## Problem Statement
The application has several critical bugs preventing core functionality from working. Users cannot create stories, votes don't work, WebSocket connections are unstable, and state persistence is corrupted.

## Acceptance Criteria

### 1. Story Management Fixes
- [ ] "Add Story" button in StoryList component triggers story creation
- [ ] "Create Story" button in StoryCreator works and adds stories to the list
- [ ] Stories appear immediately for all connected users
- [ ] Story state persists in database and syncs via WebSocket
- [ ] StoryEditor properly edits story title and description (not just currentStory text)

### 2. WebSocket Connection Stability
- [ ] WebSocket connects reliably on page load
- [ ] Connection remains stable during normal usage
- [ ] Automatic reconnection works when network recovers
- [ ] Connection status accurately reflects actual state
- [ ] All WebSocket events (votes, stories, players) sync properly

### 3. State Persistence Fixes
- [ ] Fix "Cannot read properties of null" errors
- [ ] Session data persists correctly across page refreshes
- [ ] Corrupted state is handled gracefully without data loss
- [ ] Player identity maintained after refresh
- [ ] Encrypted storage works without errors

### 4. Core Voting Functionality
- [ ] Clicking voting cards actually selects them (visual feedback)
- [ ] Selected card value is sent to backend via WebSocket
- [ ] Other players see voting progress in real-time
- [ ] Host can reveal all votes with "Reveal Cards" button
- [ ] Vote results display correctly with player names and values
- [ ] "Reset Voting" clears all votes for new round

## Technical Implementation

### Story Management Fix
```typescript
// Fix StoryCreator component
const handleCreateStory = async () => {
  if (!storyTitle.trim()) return;
  
  try {
    // Call the proper API endpoint
    await createStory({
      sessionId,
      title: storyTitle,
      description: storyDescription
    });
    
    // Clear form
    setStoryTitle('');
    setStoryDescription('');
    
    // Story will appear via WebSocket event
  } catch (error) {
    toast.error('Failed to create story');
  }
};

// Fix StoryEditor to edit actual story objects
const handleEditStory = async (storyId: string, updates: Partial<Story>) => {
  try {
    await updateStory(storyId, updates);
    // Updates sync via WebSocket
  } catch (error) {
    toast.error('Failed to update story');
  }
};
```

### WebSocket Stability
```typescript
// Improve connection manager
class WebSocketClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  connect() {
    // Ensure clean connection
    this.disconnect();
    
    // Connect with proper error handling
    this.socket = io(WS_URL, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      transports: ['websocket', 'polling'] // Fallback support
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      // Re-join session if previously connected
      if (this.sessionId && this.playerId) {
        this.socket.emit('join_session', {
          sessionId: this.sessionId,
          playerId: this.playerId
        });
      }
    });
  }
}
```

### State Persistence Fix
```typescript
// Fix persistence manager
class PersistenceManager {
  private validateState(state: any): boolean {
    // Ensure state has required properties
    return state && 
           typeof state === 'object' &&
           state.timestamp &&
           state.version === CURRENT_VERSION;
  }
  
  async loadState(): Promise<AppState | null> {
    try {
      const encrypted = localStorage.getItem(STATE_KEY);
      if (!encrypted) return null;
      
      const decrypted = await this.decrypt(encrypted);
      const state = JSON.parse(decrypted);
      
      // Validate before returning
      if (!this.validateState(state)) {
        console.warn('Invalid state structure, clearing...');
        this.clearState();
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to load state:', error);
      this.clearState();
      return null;
    }
  }
}
```

### Voting Implementation
```typescript
// Fix Card component selection
const Card = ({ value, onSelect, isSelected, isDisabled }) => {
  const handleClick = () => {
    if (!isDisabled) {
      onSelect(value);
    }
  };
  
  return (
    <motion.div
      className={cn(
        "card",
        isSelected && "card-selected",
        isDisabled && "card-disabled"
      )}
      onClick={handleClick}
      whileHover={!isDisabled ? { scale: 1.05 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
    >
      {value}
    </motion.div>
  );
};

// Fix vote submission in store
const submitVote = async (card: string) => {
  const { sessionId, currentPlayer, currentStoryId } = get();
  
  if (!sessionId || !currentPlayer || !currentStoryId) return;
  
  try {
    // Update local state immediately
    set(state => ({
      votes: {
        ...state.votes,
        [currentPlayer.id]: { card, timestamp: Date.now() }
      }
    }));
    
    // Send to backend
    await api.voting.submitVote({
      sessionId,
      playerId: currentPlayer.id,
      storyId: currentStoryId,
      card
    });
    
    // WebSocket will broadcast to others
  } catch (error) {
    // Revert on error
    console.error('Vote submission failed:', error);
    toast.error('Failed to submit vote');
  }
};
```

## Testing Checklist
- [ ] Create session and verify it persists after refresh
- [ ] Create multiple stories and verify they appear for all users
- [ ] Submit votes from multiple browsers and verify real-time sync
- [ ] Test WebSocket reconnection by disabling/enabling network
- [ ] Verify no console errors during normal usage
- [ ] Test with 5+ concurrent users
- [ ] Verify mobile browser compatibility

## Definition of Done
- All acceptance criteria met
- No console errors during normal usage
- Core planning poker flow works end-to-end
- Code reviewed and approved
- Manual testing completed
- Documentation updated
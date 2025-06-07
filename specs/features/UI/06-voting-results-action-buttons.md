# Story 6: Add Action Buttons for Next Steps

## Epic: Improve Voting Results Display and Interaction

### User Story
**As a** scrum master  
**I want** clear action options after voting completes  
**So that** I can guide the team to resolution efficiently

### Acceptance Criteria
- [ ] Display contextual actions based on consensus status
- [ ] "Accept" button when consensus exists (green, primary action)
- [ ] "Discuss" button when no consensus (amber, opens discussion panel)
- [ ] "Re-vote" button always available (secondary action)
- [ ] "Override" option for scrum master role only
- [ ] Actions stick to bottom of card on scroll
- [ ] Confirm dialog for destructive actions (override, re-vote)

### Technical Details

#### Component Structure
```jsx
<ActionBar>
  {hasConsensus ? (
    <Button variant="primary" onClick={acceptEstimate}>
      Accept Estimate ({consensusValue})
    </Button>
  ) : (
    <>
      <Button variant="warning" onClick={openDiscussion}>
        Discuss Differences
      </Button>
      <Button variant="secondary" onClick={proposeValue}>
        Propose Middle Ground ({median})
      </Button>
    </>
  )}
  <Button variant="ghost" onClick={startRevote}>
    Re-vote
  </Button>
</ActionBar>
```

### Action Flow Definitions

#### Accept Estimate
- Saves estimate to current story
- Marks story as completed
- Advances to next story automatically
- Shows success notification

#### Discuss Differences
- Opens discussion panel/modal
- Highlights vote outliers
- Provides discussion prompts
- Allows note-taking

#### Re-vote
- Clears all current votes
- Keeps same story active
- Resets timer (if enabled)
- Notifies all participants

#### Propose Middle Ground
- Suggests median/average as compromise
- Shows rationale for proposed value
- Allows quick accept/reject

### Implementation Details

#### 1. Contextual Action Bar Component
```tsx
interface ActionBarProps {
  consensus: ConsensusResult;
  currentStory: Story;
  userRole: 'host' | 'participant';
  onAction: (action: ActionType) => void;
}

function VotingActionBar({ consensus, currentStory, userRole, onAction }: ActionBarProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState<ActionType | null>(null);
  
  const handleAction = (action: ActionType) => {
    if (action.requiresConfirmation) {
      setShowConfirmDialog(action);
    } else {
      onAction(action);
    }
  };
  
  return (
    <>
      <div className="action-bar">
        {consensus.status === 'full' || consensus.status === 'near' ? (
          <Button
            variant="primary"
            size="large"
            onClick={() => handleAction('accept')}
            className="action-accept"
          >
            <CheckIcon />
            Accept Estimate ({consensus.value} points)
          </Button>
        ) : (
          <>
            <Button
              variant="warning"
              size="medium"
              onClick={() => handleAction('discuss')}
              className="action-discuss"
            >
              <ChatIcon />
              Discuss Differences
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => handleAction('propose')}
              className="action-propose"
            >
              <LightbulbIcon />
              Propose {consensus.median} points
            </Button>
          </>
        )}
        
        <div className="secondary-actions">
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleAction('revote')}
            className="action-revote"
          >
            <RefreshIcon />
            Re-vote
          </Button>
          
          {userRole === 'host' && (
            <Dropdown>
              <DropdownTrigger>
                <Button variant="ghost" size="small">
                  <MoreIcon />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem onClick={() => handleAction('override')}>
                  Override Estimate
                </DropdownItem>
                <DropdownItem onClick={() => handleAction('skip')}>
                  Skip Story
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
      
      {showConfirmDialog && (
        <ConfirmDialog
          action={showConfirmDialog}
          onConfirm={() => {
            onAction(showConfirmDialog);
            setShowConfirmDialog(null);
          }}
          onCancel={() => setShowConfirmDialog(null)}
        />
      )}
    </>
  );
}
```

#### 2. Action Handlers
```typescript
const actionHandlers = {
  accept: async (storyId: string, estimate: number) => {
    await api.updateStory(storyId, { 
      estimate, 
      status: 'estimated',
      estimatedAt: new Date()
    });
    
    showToast({
      type: 'success',
      message: `Story estimated at ${estimate} points`,
      action: {
        label: 'Undo',
        onClick: () => revertEstimate(storyId)
      }
    });
    
    // Auto-advance to next story
    const nextStory = getNextUnestimatedStory();
    if (nextStory) {
      setCurrentStory(nextStory);
    }
  },
  
  discuss: (votes: Vote[]) => {
    const outliers = identifyOutliers(votes);
    const discussionPrompts = generateDiscussionPrompts(votes, outliers);
    
    openDiscussionPanel({
      title: 'Discuss Estimate Differences',
      prompts: discussionPrompts,
      participants: outliers,
      onClose: () => {
        // Optionally trigger re-vote
      }
    });
  },
  
  revote: async (storyId: string) => {
    await api.clearVotes(storyId);
    resetVotingState();
    
    showToast({
      type: 'info',
      message: 'Voting reset. Please vote again.'
    });
    
    // Notify all participants via WebSocket
    websocket.emit('voting:reset', { storyId });
  },
  
  propose: (median: number) => {
    openProposalDialog({
      proposedValue: median,
      rationale: `Based on the median of all votes, ${median} points represents a balanced estimate.`,
      onAccept: () => actionHandlers.accept(currentStory.id, median),
      onReject: () => actionHandlers.discuss(votes)
    });
  },
  
  override: async (storyId: string) => {
    const value = await showOverrideDialog();
    if (value) {
      await api.updateStory(storyId, { 
        estimate: value, 
        overriddenBy: currentUser.id,
        overriddenAt: new Date()
      });
      
      showToast({
        type: 'warning',
        message: `Estimate overridden to ${value} points`
      });
    }
  }
};
```

#### 3. Sticky Action Bar Behavior
```css
.action-bar {
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 1px solid #E5E7EB;
  padding: 16px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  
  /* Subtle shadow for depth */
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

/* When scrolled, add stronger shadow */
.action-bar.is-sticky {
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.secondary-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* Responsive layout */
@media (max-width: 640px) {
  .action-bar {
    flex-wrap: wrap;
    padding: 12px;
  }
  
  .action-bar > button {
    flex: 1;
    min-width: 120px;
  }
  
  .secondary-actions {
    width: 100%;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #F3F4F6;
  }
}
```

#### 4. Confirmation Dialogs
```tsx
function ConfirmDialog({ action, onConfirm, onCancel }) {
  const messages = {
    revote: {
      title: 'Reset Voting?',
      description: 'This will clear all current votes. Everyone will need to vote again.',
      confirmText: 'Reset Votes',
      variant: 'warning'
    },
    override: {
      title: 'Override Estimate?',
      description: 'This will bypass team consensus. Use sparingly.',
      confirmText: 'Override',
      variant: 'danger'
    },
    skip: {
      title: 'Skip Story?',
      description: 'This story will be moved to the backlog without an estimate.',
      confirmText: 'Skip',
      variant: 'warning'
    }
  };
  
  const config = messages[action];
  
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={config.variant} onClick={onConfirm}>
            {config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5. Discussion Panel
```tsx
function DiscussionPanel({ prompts, participants, onClose }) {
  const [notes, setNotes] = useState('');
  
  return (
    <SlidePanel open onClose={onClose}>
      <PanelHeader>
        <h3>Discuss Estimate Differences</h3>
        <Button variant="ghost" size="small" onClick={onClose}>
          <CloseIcon />
        </Button>
      </PanelHeader>
      
      <PanelContent>
        <Section>
          <h4>Key Differences</h4>
          <DifferenceVisualizer participants={participants} />
        </Section>
        
        <Section>
          <h4>Discussion Prompts</h4>
          <PromptList>
            {prompts.map((prompt, index) => (
              <PromptCard key={index}>
                <PromptIcon type={prompt.type} />
                <PromptText>{prompt.text}</PromptText>
              </PromptCard>
            ))}
          </PromptList>
        </Section>
        
        <Section>
          <h4>Notes</h4>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capture key discussion points..."
            rows={4}
          />
        </Section>
      </PanelContent>
      
      <PanelFooter>
        <Button variant="secondary" onClick={() => saveNotes(notes)}>
          Save Notes
        </Button>
        <Button variant="primary" onClick={() => {
          saveNotes(notes);
          actionHandlers.revote(currentStory.id);
          onClose();
        }}>
          Save & Re-vote
        </Button>
      </PanelFooter>
    </SlidePanel>
  );
}
```

### Button Variants and States

#### Visual Design System
```css
/* Primary - Consensus reached */
.button.primary {
  background: #10B981;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.button.primary:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
}

/* Warning - Need discussion */
.button.warning {
  background: #F59E0B;
  color: white;
}

/* Secondary - Alternative actions */
.button.secondary {
  background: #F3F4F6;
  color: #374151;
  border: 1px solid #E5E7EB;
}

/* Ghost - Tertiary actions */
.button.ghost {
  background: transparent;
  color: #6B7280;
}

.button.ghost:hover {
  background: #F9FAFB;
  color: #374151;
}

/* Danger - Destructive actions */
.button.danger {
  background: #EF4444;
  color: white;
}

/* Loading state */
.button.loading {
  position: relative;
  color: transparent;
}

.button.loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin: -8px 0 0 -8px;
  border: 2px solid white;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spinner 0.6s linear infinite;
}
```

### Accessibility Features

1. **Keyboard Navigation**: All actions accessible via keyboard
2. **Screen Reader Announcements**: Action results announced
3. **Focus Management**: Focus moves appropriately after actions
4. **ARIA Labels**: Clear descriptions for all interactive elements

### Testing Scenarios

1. **Consensus Flow**: Test accept action with different consensus levels
2. **Discussion Flow**: Verify discussion panel opens with correct context
3. **Re-vote Flow**: Ensure votes clear and participants are notified
4. **Permission Testing**: Verify host-only actions are properly restricted
5. **Mobile Testing**: Ensure actions are accessible on small screens
6. **Error Handling**: Test network failures during actions

### Dependencies
- Update `VotingResults.tsx` to include action bar
- Add confirmation dialog system
- Implement discussion panel component
- Add WebSocket events for action notifications
- Update API for story status changes

### Estimated Effort
- Action Bar Component: 4 hours
- Action Handlers: 3 hours
- Discussion Panel: 4 hours
- Confirmation Dialogs: 2 hours
- Testing & Polish: 3 hours

### Priority
High - Action buttons are critical for guiding teams through the estimation process efficiently
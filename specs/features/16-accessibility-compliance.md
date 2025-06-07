# Feature 16: Accessibility Compliance (WCAG 2.1 AA)

## Status: Not Started
## Priority: High  
## Estimated Effort: 8-10 days
## Gap Analysis Source: Accessibility Compliance Missing (20% Complete)

## Problem Statement

The Planning Poker application lacks comprehensive accessibility features, preventing users with disabilities from effectively participating in planning sessions. This creates legal compliance risks and excludes potential users from the planning process.

**Current State:**
- Basic keyboard navigation exists
- No ARIA labels or screen reader support
- No focus management for modals and dropdowns
- No high contrast mode support
- Missing keyboard shortcuts for common actions

## Success Criteria

- [ ] WCAG 2.1 AA compliance certification
- [ ] Full keyboard navigation support
- [ ] Screen reader compatibility (NVDA, JAWS, VoiceOver)
- [ ] High contrast mode and color customization
- [ ] Focus management for all interactive elements
- [ ] Accessibility testing automation
- [ ] Documentation for accessibility features

## Technical Requirements

### WCAG 2.1 AA Compliance Standards

```typescript
// Accessibility requirements checklist
interface AccessibilityRequirements {
  perceivable: {
    textAlternatives: boolean; // 1.1.1
    captionsAndOtherAlternatives: boolean; // 1.2.x
    adaptable: boolean; // 1.3.x
    distinguishable: boolean; // 1.4.x
  };
  operable: {
    keyboardAccessible: boolean; // 2.1.x
    seizuresAndPhysicalReactions: boolean; // 2.3.x
    navigable: boolean; // 2.4.x
    inputModalities: boolean; // 2.5.x
  };
  understandable: {
    readable: boolean; // 3.1.x
    predictable: boolean; // 3.2.x
    inputAssistance: boolean; // 3.3.x
  };
  robust: {
    compatible: boolean; // 4.1.x
  };
}
```

### Accessibility Component Architecture

```typescript
// Accessibility context and hooks
interface AccessibilityContext {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Accessibility utilities
interface A11yUtils {
  announceToScreenReader: (message: string) => void;
  setFocus: (element: HTMLElement) => void;
  trapFocus: (container: HTMLElement) => () => void;
  generateId: (prefix: string) => string;
}
```

## Implementation Tasks

### Phase 1: Keyboard Navigation & Focus Management (3-4 days)

#### Task 1.1: Enhanced Keyboard Navigation
```tsx
// src/hooks/useKeyboardNavigation.ts
export const useKeyboardNavigation = (
  items: Array<{ id: string; element: RefObject<HTMLElement> }>,
  options: {
    wrap?: boolean;
    orientation?: 'horizontal' | 'vertical';
    onAction?: (id: string) => void;
  } = {}
) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      const isVertical = options.orientation === 'vertical';
      
      let newIndex = currentIndex;
      
      switch (key) {
        case isVertical ? 'ArrowDown' : 'ArrowRight':
          newIndex = options.wrap 
            ? (currentIndex + 1) % items.length
            : Math.min(currentIndex + 1, items.length - 1);
          break;
        case isVertical ? 'ArrowUp' : 'ArrowLeft':
          newIndex = options.wrap
            ? currentIndex === 0 ? items.length - 1 : currentIndex - 1
            : Math.max(currentIndex - 1, 0);
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          if (options.onAction) {
            event.preventDefault();
            options.onAction(items[currentIndex].id);
          }
          return;
        default:
          return;
      }
      
      event.preventDefault();
      setCurrentIndex(newIndex);
      items[newIndex].element.current?.focus();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items, options]);
  
  return { currentIndex, setCurrentIndex };
};
```

#### Task 1.2: Accessible Card Component
```tsx
// src/components/AccessibleCard.tsx
export const AccessibleCard = ({ 
  value, 
  isSelected, 
  isRevealed, 
  onSelect,
  disabled 
}: AccessibleCardProps) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const { announceToScreenReader } = useAccessibility();
  
  const handleSelect = () => {
    onSelect(value);
    announceToScreenReader(`Selected ${value} story points`);
  };
  
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  };
  
  return (
    <button
      ref={cardRef}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Estimate ${value} story points`}
      aria-describedby={`card-${value}-description`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`
        accessible-card
        ${isSelected ? 'selected' : ''}
        ${disabled ? 'disabled' : ''}
        focus:ring-2 focus:ring-blue-500 focus:outline-none
      `}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <span className="card-value" aria-hidden="true">
        {value}
      </span>
      <span 
        id={`card-${value}-description`}
        className="sr-only"
      >
        {isSelected ? 'Selected' : 'Not selected'}. 
        {disabled ? 'Voting disabled' : 'Press Enter or Space to select'}
      </span>
    </button>
  );
};
```

#### Task 1.3: Focus Trap for Modals
```tsx
// src/hooks/useFocusTrap.ts
export const useFocusTrap = (
  isActive: boolean,
  containerRef: RefObject<HTMLElement>
) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusableElement = focusableElements[0] as HTMLElement;
    const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    };
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Handle modal close
      }
    };
    
    // Set initial focus
    firstFocusableElement?.focus();
    
    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive, containerRef]);
};
```

### Phase 2: Screen Reader Support & ARIA (2-3 days)

#### Task 2.1: Live Regions for Dynamic Updates
```tsx
// src/components/LiveRegion.tsx
export const LiveRegion = ({ 
  message, 
  politeness = 'polite' 
}: LiveRegionProps) => {
  const [liveMessage, setLiveMessage] = useState('');
  
  useEffect(() => {
    if (message) {
      // Clear first to ensure the message is announced
      setLiveMessage('');
      setTimeout(() => setLiveMessage(message), 100);
    }
  }, [message]);
  
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {liveMessage}
    </div>
  );
};

// Usage in voting component
const VotingInterface = () => {
  const [announcement, setAnnouncement] = useState('');
  
  const handleVoteSubmit = (value: number) => {
    setAnnouncement(`Vote of ${value} story points submitted`);
  };
  
  return (
    <div>
      <LiveRegion message={announcement} />
      {/* Voting interface */}
    </div>
  );
};
```

#### Task 2.2: Accessible Story List
```tsx
// src/components/AccessibleStoryList.tsx
export const AccessibleStoryList = ({ 
  stories, 
  activeStory, 
  onStorySelect 
}: AccessibleStoryListProps) => {
  const { announceToScreenReader } = useAccessibility();
  
  const handleStorySelect = (story: Story) => {
    onStorySelect(story.id);
    announceToScreenReader(
      `Selected story: ${story.title}. ${story.description || 'No description'}`
    );
  };
  
  return (
    <div role="region" aria-label="Story Management">
      <h2 id="story-list-heading">Stories</h2>
      
      {stories.length === 0 ? (
        <div role="status" aria-live="polite">
          No stories created yet. Create your first story to begin estimation.
        </div>
      ) : (
        <ul 
          role="listbox"
          aria-labelledby="story-list-heading"
          aria-activedescendant={activeStory ? `story-${activeStory.id}` : undefined}
        >
          {stories.map((story, index) => (
            <li
              key={story.id}
              id={`story-${story.id}`}
              role="option"
              aria-selected={story.id === activeStory?.id}
              aria-describedby={`story-${story.id}-details`}
              tabIndex={story.id === activeStory?.id ? 0 : -1}
              className={`
                story-item
                ${story.id === activeStory?.id ? 'active' : ''}
                focus:ring-2 focus:ring-blue-500 focus:outline-none
              `}
              onClick={() => handleStorySelect(story)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStorySelect(story);
                }
              }}
            >
              <div className="story-content">
                <h3 className="story-title">{story.title}</h3>
                {story.description && (
                  <p className="story-description">{story.description}</p>
                )}
              </div>
              
              <div 
                id={`story-${story.id}-details`}
                className="sr-only"
              >
                Story {index + 1} of {stories.length}.
                {story.finalEstimate 
                  ? `Estimated at ${story.finalEstimate} points.`
                  : 'Not yet estimated.'
                }
                {story.id === activeStory?.id ? 'Currently selected.' : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

#### Task 2.3: Screen Reader Announcements
```tsx
// src/hooks/useScreenReader.ts
export const useScreenReader = () => {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;
    
    // Clear the region first
    liveRegionRef.current.textContent = '';
    liveRegionRef.current.setAttribute('aria-live', priority);
    
    // Add the message after a brief delay
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
    }, 100);
  }, []);
  
  const LiveRegionComponent = () => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
  
  return { announce, LiveRegionComponent };
};
```

### Phase 3: Visual Accessibility & High Contrast (2-3 days)

#### Task 3.1: High Contrast Mode
```css
/* src/styles/accessibility.css */
@media (prefers-contrast: high) {
  :root {
    --color-primary: #000000;
    --color-secondary: #ffffff;
    --color-accent: #ffff00;
    --color-error: #ff0000;
    --color-success: #00ff00;
    --color-border: #000000;
    --color-background: #ffffff;
  }
  
  .card {
    border: 3px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-primary);
  }
  
  .card.selected {
    background: var(--color-primary);
    color: var(--color-secondary);
  }
  
  .button {
    border: 2px solid var(--color-primary);
    background: var(--color-background);
    color: var(--color-primary);
  }
  
  .button:hover,
  .button:focus {
    background: var(--color-primary);
    color: var(--color-secondary);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Large text support */
@media (min-resolution: 2dppx) and (min-width: 1200px) {
  .large-text {
    font-size: 1.25em;
    line-height: 1.6;
  }
}
```

#### Task 3.2: Color and Contrast Utilities
```tsx
// src/utils/colorContrast.ts
export class ColorContrast {
  static calculateRatio(color1: string, color2: string): number {
    const getLuminance = (hex: string) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 
          ? sRGB / 12.92 
          : Math.pow((sRGB + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }
  
  static meetsWCAG(ratio: number, level: 'AA' | 'AAA' = 'AA'): boolean {
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  }
  
  static validateColorPair(foreground: string, background: string): boolean {
    const ratio = this.calculateRatio(foreground, background);
    return this.meetsWCAG(ratio);
  }
}

// Accessibility theme provider
export const AccessibilityThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState({
    highContrast: false,
    largeFonts: false,
    reducedMotion: false
  });
  
  useEffect(() => {
    // Detect user preferences
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    setTheme({
      highContrast: prefersHighContrast,
      largeFonts: false, // User controlled
      reducedMotion: prefersReducedMotion
    });
  }, []);
  
  return (
    <AccessibilityContext.Provider value={{ theme, setTheme }}>
      <div 
        className={`
          ${theme.highContrast ? 'high-contrast' : ''}
          ${theme.largeFonts ? 'large-fonts' : ''}
          ${theme.reducedMotion ? 'reduced-motion' : ''}
        `}
      >
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
};
```

#### Task 3.3: Accessible Form Components
```tsx
// src/components/AccessibleInput.tsx
export const AccessibleInput = ({
  label,
  error,
  required,
  description,
  ...inputProps
}: AccessibleInputProps) => {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;
  
  return (
    <div className="form-field">
      <label 
        htmlFor={inputId}
        className="form-label"
      >
        {label}
        {required && (
          <span aria-label="required" className="required-indicator">
            *
          </span>
        )}
      </label>
      
      {description && (
        <div 
          id={descriptionId}
          className="form-description"
        >
          {description}
        </div>
      )}
      
      <input
        id={inputId}
        aria-describedby={[
          description ? descriptionId : '',
          error ? errorId : ''
        ].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        className={`
          form-input
          ${error ? 'error' : ''}
          focus:ring-2 focus:ring-blue-500 focus:outline-none
        `}
        {...inputProps}
      />
      
      {error && (
        <div 
          id={errorId}
          role="alert"
          className="form-error"
        >
          {error}
        </div>
      )}
    </div>
  );
};
```

### Phase 4: Accessibility Testing & Validation (1-2 days)

#### Task 4.1: Automated Accessibility Testing
```typescript
// src/test/accessibility/automated.test.tsx
import { render } from '../utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibleCard } from '../../components/AccessibleCard';
import { AccessibleStoryList } from '../../components/AccessibleStoryList';

expect.extend(toHaveNoViolations);

describe('Accessibility Compliance', () => {
  it('Card component meets WCAG 2.1 AA standards', async () => {
    const { container } = render(
      <AccessibleCard 
        value={5} 
        isSelected={false}
        onSelect={jest.fn()}
      />
    );
    
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'aria-labels': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });

  it('Story list has proper ARIA structure', async () => {
    const stories = [
      { id: '1', title: 'Story 1', description: 'Description 1' },
      { id: '2', title: 'Story 2', description: 'Description 2' }
    ];
    
    const { container } = render(
      <AccessibleStoryList 
        stories={stories}
        activeStory={stories[0]}
        onStorySelect={jest.fn()}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Check specific ARIA attributes
    expect(container.querySelector('[role="listbox"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-activedescendant]')).toBeInTheDocument();
  });

  it('Form inputs have proper labeling', async () => {
    const { container } = render(
      <AccessibleInput 
        label="Story Title"
        required={true}
        description="Enter a descriptive title for the story"
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### Task 4.2: Keyboard Navigation Testing
```typescript
// src/test/accessibility/keyboard.test.tsx
import { render, screen, fireEvent } from '../utils';
import userEvent from '@testing-library/user-event';
import { VotingInterface } from '../../components/VotingInterface';

describe('Keyboard Navigation', () => {
  it('supports full keyboard navigation for voting', async () => {
    const user = userEvent.setup();
    
    render(<VotingInterface cards={[1, 2, 3, 5, 8]} />);
    
    // Tab to first card
    await user.tab();
    expect(screen.getByText('1')).toHaveFocus();
    
    // Arrow keys navigate between cards
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2')).toHaveFocus();
    
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('3')).toHaveFocus();
    
    // Enter or Space selects card
    await user.keyboard('{Enter}');
    expect(screen.getByText('3')).toHaveClass('selected');
    
    // Tab moves to next interactive element
    await user.tab();
    expect(screen.getByText('Reveal Cards')).toHaveFocus();
  });

  it('traps focus in modal dialogs', async () => {
    const user = userEvent.setup();
    
    render(<StoryCreatorModal isOpen={true} onClose={jest.fn()} />);
    
    // First focusable element should be focused
    expect(screen.getByLabelText('Story Title')).toHaveFocus();
    
    // Tab through all elements
    await user.tab(); // Description field
    await user.tab(); // Create button
    await user.tab(); // Cancel button
    await user.tab(); // Should wrap to first element
    
    expect(screen.getByLabelText('Story Title')).toHaveFocus();
  });

  it('handles Escape key to close modals', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(<StoryCreatorModal isOpen={true} onClose={onClose} />);
    
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

## Accessibility Features Documentation

### Keyboard Shortcuts
```typescript
// Documented keyboard shortcuts
const KEYBOARD_SHORTCUTS = {
  global: [
    { key: 'Alt + 1', action: 'Navigate to voting interface' },
    { key: 'Alt + 2', action: 'Navigate to story list' },
    { key: 'Alt + 3', action: 'Navigate to results' },
    { key: 'Escape', action: 'Close modal or cancel action' }
  ],
  voting: [
    { key: 'Arrow Keys', action: 'Navigate between cards' },
    { key: 'Enter/Space', action: 'Select card' },
    { key: 'Home', action: 'Select first card' },
    { key: 'End', action: 'Select last card' }
  ],
  storyList: [
    { key: 'Arrow Up/Down', action: 'Navigate between stories' },
    { key: 'Enter/Space', action: 'Select story' },
    { key: 'Delete', action: 'Delete story (with confirmation)' }
  ]
};
```

### Screen Reader Support
```typescript
// Screen reader compatible announcements
const SCREEN_READER_MESSAGES = {
  voteSubmitted: (value: number) => `Vote of ${value} story points submitted successfully`,
  cardsRevealed: () => 'Voting cards have been revealed. Results are now visible',
  storySelected: (title: string) => `Story "${title}" selected for estimation`,
  storyCreated: (title: string) => `New story "${title}" created and added to the list`,
  consensusReached: (value: number) => `Team consensus reached at ${value} story points`,
  timerStarted: (duration: number) => `Timer started for ${duration} minutes`,
  timerExpired: () => 'Timer has expired. Consider revealing the cards'
};
```

## Testing Strategy

### Manual Testing Checklist
```markdown
## WCAG 2.1 AA Compliance Checklist

### Perceivable
- [ ] All images have appropriate alt text
- [ ] Color is not the only means of conveying information
- [ ] Text has sufficient color contrast (4.5:1 ratio)
- [ ] Text can be resized up to 200% without scrolling
- [ ] Content adapts to different zoom levels

### Operable
- [ ] All functionality available via keyboard
- [ ] No keyboard traps exist
- [ ] Timing is adjustable or can be extended
- [ ] No content flashes more than 3 times per second
- [ ] Page has descriptive title
- [ ] Focus order is logical and intuitive

### Understandable
- [ ] Language of page is specified
- [ ] Focus does not cause unexpected context changes
- [ ] Navigation is consistent across pages
- [ ] Input errors are identified and described
- [ ] Labels and instructions are provided for inputs

### Robust
- [ ] Markup is valid and semantic
- [ ] ARIA attributes are used correctly
- [ ] Content is compatible with assistive technologies
```

### Automated Testing Tools
```typescript
// Accessibility testing pipeline
const accessibilityTests = {
  axe: 'Automated WCAG compliance testing',
  lighthouse: 'Accessibility scoring and recommendations',
  pa11y: 'Command-line accessibility testing',
  waveApi: 'Web accessibility evaluation',
  colorContrastAnalyzer: 'Color contrast validation'
};
```

## Success Metrics

### Compliance Targets
- [ ] 100% WCAG 2.1 AA compliance
- [ ] Lighthouse accessibility score ≥95
- [ ] Zero critical accessibility violations
- [ ] Full keyboard navigation support
- [ ] Screen reader compatibility (NVDA, JAWS, VoiceOver)

### User Experience Targets
- [ ] Task completion rate ≥90% for users with disabilities
- [ ] User satisfaction ≥4.0/5 for accessibility features
- [ ] Support ticket reduction ≥80% for accessibility issues
- [ ] Positive feedback from accessibility community

### Technical Targets
- [ ] All interactive elements have proper ARIA labels
- [ ] Focus indicators visible on all focusable elements
- [ ] Color contrast ratio ≥4.5:1 for all text
- [ ] High contrast mode support
- [ ] Reduced motion preference respected

This comprehensive accessibility implementation will ensure the Planning Poker application is inclusive and usable by all team members, regardless of their abilities or assistive technology needs.
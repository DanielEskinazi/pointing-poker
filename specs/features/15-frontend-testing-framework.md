# Feature 15: Frontend Testing Framework

## Status: Not Started
## Priority: Critical  
## Estimated Effort: 12-15 days
## Gap Analysis Source: Frontend Testing Missing (5% Complete)

## Problem Statement

The Planning Poker application currently has no React component testing infrastructure, creating significant risk for production deployment. Without comprehensive frontend testing, there's no confidence in component stability, user interaction workflows, or regression prevention.

**Current State:**
- Zero React component tests
- No testing framework setup
- No integration tests for user workflows
- No visual regression testing
- Backend has some tests (45% coverage) but frontend is untested

## Success Criteria

- [ ] React Testing Library setup with Jest
- [ ] 80%+ component test coverage
- [ ] Integration tests for critical user journeys
- [ ] Visual regression testing setup
- [ ] Automated testing pipeline integration
- [ ] Performance testing for components
- [ ] Accessibility testing automation

## Technical Requirements

### Testing Framework Architecture

```typescript
// Testing stack components
interface TestingStack {
  testRunner: 'Jest';
  componentTesting: 'React Testing Library';
  e2eFramework: 'Playwright' | 'Cypress';
  visualTesting: 'Chromatic' | 'Percy';
  mockingLibrary: 'MSW' | 'Jest Mocks';
  accessibilityTesting: 'jest-axe';
  performanceTesting: 'Lighthouse CI';
}

// Test environment configuration
interface TestConfig {
  setupFiles: string[];
  testEnvironment: 'jsdom';
  moduleNameMapping: Record<string, string>;
  coverageThreshold: {
    global: {
      branches: 80;
      functions: 80;
      lines: 80;
      statements: 80;
    };
  };
}
```

## Implementation Tasks

### Phase 1: Testing Infrastructure Setup (3-4 days)

#### Task 1.1: Jest and React Testing Library Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/test/__mocks__/fileMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
  ]
};
```

#### Task 1.2: Test Setup and Utilities
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Mock implementations
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
```

#### Task 1.3: Testing Utilities and Helpers
```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/toast';
import { GameStore } from '../store';

// Mock store provider
const MockStoreProvider = ({ children, initialState = {} }) => {
  return (
    <GameStore.Provider value={{ ...defaultState, ...initialState }}>
      {children}
    </GameStore.Provider>
  );
};

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <MemoryRouter>
      <MockStoreProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </MockStoreProvider>
    </MemoryRouter>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Additional test utilities
export const createMockPlayer = (overrides = {}) => ({
  id: 'player-1',
  name: 'Test Player',
  avatar: '👤',
  selectedCard: null,
  isSpectator: false,
  isHost: false,
  ...overrides
});

export const createMockStory = (overrides = {}) => ({
  id: 'story-1',
  title: 'Test Story',
  description: 'Test description',
  orderIndex: 0,
  createdAt: new Date().toISOString(),
  ...overrides
});
```

### Phase 2: Component Unit Tests (4-5 days)

#### Task 2.1: Core Component Tests
```typescript
// src/components/__tests__/Card.test.tsx
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { Card } from '../Card';
import { HapticFeedback } from '../../utils/haptics';

// Mock haptic feedback
jest.mock('../../utils/haptics');

describe('Card Component', () => {
  const defaultProps = {
    value: 5,
    isSelected: false,
    isRevealed: false,
    playerId: 'player-1',
    onClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card with correct value', () => {
    render(<Card {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows selected state correctly', () => {
    render(<Card {...defaultProps} isSelected={true} />);
    const card = screen.getByRole('button');
    expect(card).toHaveClass('selected');
  });

  it('handles click events', async () => {
    const mockClick = jest.fn();
    render(<Card {...defaultProps} onClick={mockClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state when submitting', () => {
    render(<Card {...defaultProps} />);
    // Simulate vote submission
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables card when voting is disabled', () => {
    render(<Card {...defaultProps} disabled={true} />);
    const card = screen.getByRole('button');
    expect(card).toBeDisabled();
  });

  it('provides proper accessibility attributes', () => {
    render(<Card {...defaultProps} />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', 'Vote 5 story points');
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles keyboard navigation', () => {
    const mockClick = jest.fn();
    render(<Card {...defaultProps} onClick={mockClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(mockClick).toHaveBeenCalled();
  });
});
```

#### Task 2.2: Story Management Tests
```typescript
// src/components/__tests__/StoryList.test.tsx
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { StoryList } from '../StoryList';
import { createMockStory } from '../../test/utils';

describe('StoryList Component', () => {
  const mockStories = [
    createMockStory({ id: '1', title: 'Story 1' }),
    createMockStory({ id: '2', title: 'Story 2', finalEstimate: 5 })
  ];

  it('renders empty state when no stories', () => {
    render(<StoryList />, {
      initialState: { stories: [] }
    });
    
    expect(screen.getByText('Ready to start estimating?')).toBeInTheDocument();
    expect(screen.getByText('Create First Story')).toBeInTheDocument();
  });

  it('renders story list correctly', () => {
    render(<StoryList />, {
      initialState: { stories: mockStories }
    });
    
    expect(screen.getByText('Story 1')).toBeInTheDocument();
    expect(screen.getByText('Story 2')).toBeInTheDocument();
  });

  it('shows story status correctly', () => {
    render(<StoryList />, {
      initialState: { stories: mockStories }
    });
    
    expect(screen.getByText('Ready to Vote')).toBeInTheDocument();
    expect(screen.getByText('Estimated')).toBeInTheDocument();
  });

  it('handles story selection', async () => {
    const mockSetActiveStory = jest.fn();
    render(<StoryList />, {
      initialState: { 
        stories: mockStories,
        setActiveStory: mockSetActiveStory
      }
    });
    
    fireEvent.click(screen.getByText('Story 1'));
    
    await waitFor(() => {
      expect(mockSetActiveStory).toHaveBeenCalledWith('1');
    });
  });

  it('collapses when voting is active', () => {
    render(<StoryList isVotingActive={true} />, {
      initialState: { stories: mockStories }
    });
    
    // Should be collapsed by default when voting is active
    expect(screen.queryByText('Story 1')).not.toBeInTheDocument();
  });
});
```

#### Task 2.3: Form Component Tests
```typescript
// src/components/__tests__/StoryCreator.test.tsx
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { StoryCreator } from '../StoryCreator';
import userEvent from '@testing-library/user-event';

describe('StoryCreator Component', () => {
  it('renders form fields correctly', () => {
    render(<StoryCreator isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create story/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<StoryCreator isOpen={true} onClose={jest.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: /create story/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockCreateStory = jest.fn();
    
    render(<StoryCreator isOpen={true} onClose={jest.fn()} />, {
      initialState: { createStory: mockCreateStory }
    });
    
    await user.type(screen.getByLabelText(/title/i), 'New Story');
    await user.type(screen.getByLabelText(/description/i), 'Story description');
    await user.click(screen.getByRole('button', { name: /create story/i }));
    
    await waitFor(() => {
      expect(mockCreateStory).toHaveBeenCalledWith({
        title: 'New Story',
        description: 'Story description'
      });
    });
  });

  it('closes modal on successful creation', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(<StoryCreator isOpen={true} onClose={mockOnClose} />);
    
    await user.type(screen.getByLabelText(/title/i), 'New Story');
    await user.click(screen.getByRole('button', { name: /create story/i }));
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
```

### Phase 3: Integration Tests (3-4 days)

#### Task 3.1: User Journey Tests
```typescript
// src/test/integration/voting-workflow.test.tsx
import { render, screen, fireEvent, waitFor } from '../utils';
import { App } from '../../App';
import userEvent from '@testing-library/user-event';

describe('Voting Workflow Integration', () => {
  it('completes full voting workflow', async () => {
    const user = userEvent.setup();
    
    // Render app with initial session
    render(<App />, {
      initialState: {
        sessionId: 'test-session',
        isConfigured: true,
        stories: [createMockStory({ title: 'Test Story' })],
        players: [createMockPlayer({ id: 'player-1', name: 'Test Player' })]
      }
    });
    
    // 1. Select a story
    await user.click(screen.getByText('Test Story'));
    
    // 2. Verify voting interface appears
    expect(screen.getByText('Select Your Estimate')).toBeInTheDocument();
    
    // 3. Select a card
    await user.click(screen.getByText('5'));
    
    // 4. Verify vote submission
    await waitFor(() => {
      expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
    });
    
    // 5. Reveal cards (as host)
    await user.click(screen.getByText('Reveal Cards'));
    
    // 6. Verify results are shown
    expect(screen.getByText('Voting Results')).toBeInTheDocument();
  });

  it('handles story creation workflow', async () => {
    const user = userEvent.setup();
    
    render(<App />, {
      initialState: {
        sessionId: 'test-session',
        isConfigured: true,
        stories: [],
        players: [createMockPlayer({ isHost: true })]
      }
    });
    
    // 1. Click create story
    await user.click(screen.getByText('Create First Story'));
    
    // 2. Fill form
    await user.type(screen.getByLabelText(/title/i), 'New Story');
    await user.type(screen.getByLabelText(/description/i), 'Story description');
    
    // 3. Submit
    await user.click(screen.getByRole('button', { name: /create story/i }));
    
    // 4. Verify story appears
    await waitFor(() => {
      expect(screen.getByText('New Story')).toBeInTheDocument();
    });
  });
});
```

#### Task 3.2: WebSocket Integration Tests
```typescript
// src/test/integration/websocket.test.tsx
import { render, screen, waitFor } from '../utils';
import { App } from '../../App';
import WS from 'jest-websocket-mock';

describe('WebSocket Integration', () => {
  let server: WS;
  
  beforeEach(() => {
    server = new WS('ws://localhost:3001');
  });
  
  afterEach(() => {
    WS.clean();
  });

  it('handles real-time vote updates', async () => {
    render(<App />, {
      initialState: {
        sessionId: 'test-session',
        isConfigured: true,
        stories: [createMockStory()],
        players: [createMockPlayer()]
      }
    });
    
    await server.connected;
    
    // Simulate incoming vote from another player
    server.send(JSON.stringify({
      type: 'vote:submit',
      data: {
        playerId: 'player-2',
        storyId: 'story-1',
        value: 8
      }
    }));
    
    // Verify UI updates with new vote
    await waitFor(() => {
      expect(screen.getByText('2 of 2 voted')).toBeInTheDocument();
    });
  });

  it('handles connection loss and recovery', async () => {
    render(<App />);
    
    await server.connected;
    
    // Simulate connection loss
    server.close();
    
    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
    
    // Reconnect
    server = new WS('ws://localhost:3001');
    await server.connected;
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
});
```

### Phase 4: Visual and Accessibility Testing (2-3 days)

#### Task 4.1: Accessibility Testing Setup
```typescript
// src/test/accessibility.test.tsx
import { render } from './utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Card } from '../components/Card';
import { StoryList } from '../components/StoryList';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('Card component has no accessibility violations', async () => {
    const { container } = render(
      <Card value={5} playerId="player-1" onClick={jest.fn()} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('StoryList component has no accessibility violations', async () => {
    const { container } = render(<StoryList />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('provides proper keyboard navigation', () => {
    render(<Card value={5} playerId="player-1" onClick={jest.fn()} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
    
    // Test keyboard interaction
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
  });

  it('provides screen reader support', () => {
    render(<StoryList />, {
      initialState: { stories: [createMockStory()] }
    });
    
    // Check for proper ARIA labels
    expect(screen.getByRole('region')).toHaveAttribute('aria-label');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
```

#### Task 4.2: Visual Regression Testing
```typescript
// src/test/visual.test.tsx
import { render } from './utils';
import { Card } from '../components/Card';
import { StoryList } from '../components/StoryList';

describe('Visual Regression Tests', () => {
  it('Card component matches snapshot', () => {
    const { container } = render(
      <Card value={5} isSelected={false} playerId="player-1" onClick={jest.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Selected card matches snapshot', () => {
    const { container } = render(
      <Card value={5} isSelected={true} playerId="player-1" onClick={jest.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Empty story list matches snapshot', () => {
    const { container } = render(<StoryList />, {
      initialState: { stories: [] }
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Story list with items matches snapshot', () => {
    const { container } = render(<StoryList />, {
      initialState: { stories: [createMockStory(), createMockStory()] }
    });
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Phase 5: Performance and E2E Testing (2-3 days)

#### Task 5.1: Performance Testing
```typescript
// src/test/performance.test.tsx
import { render, screen, fireEvent } from './utils';
import { Card } from '../components/Card';
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('Card component renders within performance budget', () => {
    const startTime = performance.now();
    
    render(<Card value={5} playerId="player-1" onClick={jest.fn()} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 16ms (60fps)
    expect(renderTime).toBeLessThan(16);
  });

  it('handles rapid card selections efficiently', () => {
    const mockClick = jest.fn();
    render(<Card value={5} playerId="player-1" onClick={mockClick} />);
    
    const card = screen.getByRole('button');
    
    // Simulate rapid clicks
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      fireEvent.click(card);
    }
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(100); // 100ms for 100 clicks
  });

  it('large story list renders efficiently', () => {
    const manyStories = Array.from({ length: 100 }, (_, i) => 
      createMockStory({ id: `story-${i}`, title: `Story ${i}` })
    );
    
    const startTime = performance.now();
    render(<StoryList />, {
      initialState: { stories: manyStories }
    });
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100); // Should render 100 stories in <100ms
  });
});
```

#### Task 5.2: End-to-End Testing Setup
```typescript
// e2e/voting-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Planning Poker E2E', () => {
  test('complete planning poker session', async ({ page, browser }) => {
    // Create a new session
    await page.goto('/');
    await page.click('text=Create Session');
    await page.fill('[data-testid=session-name]', 'Test Session');
    await page.click('text=Create');
    
    // Join as host
    await page.fill('[data-testid=player-name]', 'Host Player');
    await page.click('text=Join Session');
    
    // Create a story
    await page.click('text=Create First Story');
    await page.fill('[data-testid=story-title]', 'Test Story');
    await page.click('text=Create Story');
    
    // Select the story
    await page.click('text=Test Story');
    
    // Vote on the story
    await page.click('[data-testid=card-5]');
    
    // Verify vote submitted
    await expect(page.locator('text=Vote Submitted')).toBeVisible();
    
    // Open second browser as another player
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Join same session
    const sessionUrl = page.url();
    await page2.goto(sessionUrl);
    await page2.fill('[data-testid=player-name]', 'Player 2');
    await page2.click('text=Join Session');
    
    // Vote as second player
    await page2.click('[data-testid=card-8]');
    
    // Reveal cards as host
    await page.click('text=Reveal Cards');
    
    // Verify results on both pages
    await expect(page.locator('text=Voting Results')).toBeVisible();
    await expect(page2.locator('text=Voting Results')).toBeVisible();
  });

  test('mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Test mobile navigation works
    await expect(page.locator('.mobile-navigation')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid=card-5]');
    await expect(page.locator('.card-selected')).toBeVisible();
  });
});
```

## Testing Scripts and Configuration

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:visual": "chromatic --project-token=PROJECT_TOKEN",
    "test:accessibility": "jest --testPathPattern=accessibility",
    "test:performance": "jest --testPathPattern=performance"
  }
}
```

### GitHub Actions CI/CD
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Mock Data and Services

### MSW Setup for API Mocking
```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/sessions/:sessionId', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.sessionId,
        name: 'Test Session',
        hostId: 'player-1',
        players: [createMockPlayer()],
        stories: [createMockStory()]
      })
    );
  }),
  
  rest.post('/api/stories', (req, res, ctx) => {
    return res(
      ctx.json(createMockStory())
    );
  }),
  
  rest.post('/api/votes', (req, res, ctx) => {
    return res(
      ctx.json({ success: true })
    );
  })
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## Success Metrics

### Coverage Targets
- [ ] 80%+ line coverage across all components
- [ ] 80%+ branch coverage for conditional logic
- [ ] 90%+ function coverage for exported functions
- [ ] 100% coverage for critical user paths

### Test Performance
- [ ] Unit tests complete in <30 seconds
- [ ] Integration tests complete in <2 minutes
- [ ] E2E tests complete in <5 minutes
- [ ] Visual regression tests complete in <3 minutes

### Quality Metrics
- [ ] Zero accessibility violations in automated tests
- [ ] All components have snapshot tests
- [ ] Critical user journeys have integration tests
- [ ] Mobile responsive tests pass
- [ ] Performance tests within budgets

## Testing Strategy Documentation

### Test Categorization
```typescript
// Test file naming conventions
// Unit tests: Component.test.tsx
// Integration tests: integration/feature.test.tsx
// E2E tests: e2e/flow.spec.ts
// Performance tests: performance/component.perf.test.tsx
// Accessibility tests: accessibility/component.a11y.test.tsx
```

### Test Data Management
```typescript
// Centralized test data factories
export const TestDataFactory = {
  player: (overrides = {}) => createMockPlayer(overrides),
  story: (overrides = {}) => createMockStory(overrides),
  session: (overrides = {}) => createMockSession(overrides),
  vote: (overrides = {}) => createMockVote(overrides)
};
```

This comprehensive testing framework will provide confidence in code quality, catch regressions early, and ensure the Planning Poker application is robust and reliable for production use.
# Story 6: Comprehensive Testing Strategy

**Priority**: P1 - High  
**Estimate**: 2 days  
**Dependencies**: Stories 1-5 (All core features implemented)

## Problem Statement
The application needs a comprehensive testing strategy to ensure production readiness. This includes unit tests, integration tests, end-to-end tests, performance tests, and manual testing procedures.

## Testing Pyramid

### 1. Unit Tests (70%)
- Individual component logic
- Utility functions
- Store actions and reducers
- Service layer methods
- WebSocket event handlers

### 2. Integration Tests (20%)
- Component interactions
- API integration
- WebSocket communication
- State persistence
- Error handling flows

### 3. End-to-End Tests (10%)
- Complete user journeys
- Multi-user scenarios
- Cross-browser compatibility
- Real-time synchronization
- Mobile workflows

## Technical Implementation

### Unit Testing Setup
```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/main.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// src/test/setup.ts
import '@testing-library/jest-dom';
import { beforeEach, afterEach, vi } from 'vitest';

// Mock WebSocket
global.WebSocket = vi.fn();

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid',
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      generateKey: vi.fn()
    }
  }
});

beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup
  cleanup();
});
```

### Component Testing
```typescript
// src/components/__tests__/VotingCards.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VotingCards } from '../VotingCards';
import { TestProvider } from '@/test/providers';

describe('VotingCards', () => {
  const mockProps = {
    cards: ['1', '2', '3', '5', '8'],
    selectedCard: null,
    onSelectCard: vi.fn(),
    disabled: false
  };

  beforeEach(() => {
    mockProps.onSelectCard.mockClear();
  });

  it('renders all card values', () => {
    render(
      <TestProvider>
        <VotingCards {...mockProps} />
      </TestProvider>
    );

    mockProps.cards.forEach(card => {
      expect(screen.getByText(card)).toBeInTheDocument();
    });
  });

  it('calls onSelectCard when card is clicked', () => {
    render(
      <TestProvider>
        <VotingCards {...mockProps} />
      </TestProvider>
    );

    fireEvent.click(screen.getByText('5'));
    expect(mockProps.onSelectCard).toHaveBeenCalledWith('5');
  });

  it('highlights selected card', () => {
    render(
      <TestProvider>
        <VotingCards {...mockProps} selectedCard="3" />
      </TestProvider>
    );

    const selectedCard = screen.getByText('3');
    expect(selectedCard).toHaveClass('selected');
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <TestProvider>
        <VotingCards {...mockProps} disabled={true} />
      </TestProvider>
    );

    fireEvent.click(screen.getByText('5'));
    expect(mockProps.onSelectCard).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation', () => {
    render(
      <TestProvider>
        <VotingCards {...mockProps} />
      </TestProvider>
    );

    const firstCard = screen.getByText('1');
    firstCard.focus();
    
    fireEvent.keyDown(firstCard, { key: 'Enter' });
    expect(mockProps.onSelectCard).toHaveBeenCalledWith('1');
  });
});
```

### Store Testing
```typescript
// src/store/__tests__/voting.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../index';
import { TestProvider } from '@/test/providers';

describe('Voting Store', () => {
  it('should submit vote and update state', async () => {
    const { result } = renderHook(() => useStore(), {
      wrapper: TestProvider
    });

    const mockVote = { playerId: 'player1', card: '5', storyId: 'story1' };

    await act(async () => {
      await result.current.submitVote(mockVote);
    });

    expect(result.current.votes).toEqual({
      player1: { card: '5', timestamp: expect.any(Number) }
    });
  });

  it('should handle vote submission failure', async () => {
    // Mock API failure
    vi.mocked(api.voting.submitVote).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useStore(), {
      wrapper: TestProvider
    });

    const mockVote = { playerId: 'player1', card: '5', storyId: 'story1' };

    await act(async () => {
      try {
        await result.current.submitVote(mockVote);
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    // Optimistic update should be reverted
    expect(result.current.votes).toEqual({});
  });

  it('should sync votes from WebSocket events', () => {
    const { result } = renderHook(() => useStore(), {
      wrapper: TestProvider
    });

    act(() => {
      result.current.syncVotesFromWebSocket({
        player1: { card: '3', timestamp: Date.now() },
        player2: { card: '5', timestamp: Date.now() }
      });
    });

    expect(Object.keys(result.current.votes)).toHaveLength(2);
  });
});
```

### WebSocket Testing
```typescript
// src/services/__tests__/websocket.test.ts
import { WebSocketClient } from '../websocket/client';
import WS from 'jest-websocket-mock';

describe('WebSocketClient', () => {
  let server: WS;
  let client: WebSocketClient;

  beforeEach(() => {
    server = new WS('ws://localhost:3001');
    client = new WebSocketClient('ws://localhost:3001');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should connect and join session', async () => {
    await client.connect();
    await server.connected;

    client.joinSession('session123', 'player456');

    await expect(server).toReceiveMessage(
      JSON.stringify({
        type: 'join_session',
        sessionId: 'session123',
        playerId: 'player456'
      })
    );
  });

  it('should handle vote events', async () => {
    await client.connect();
    await server.connected;

    const onVote = vi.fn();
    client.on('vote_submitted', onVote);

    server.send(JSON.stringify({
      type: 'vote_submitted',
      playerId: 'player1',
      card: '5'
    }));

    expect(onVote).toHaveBeenCalledWith({
      playerId: 'player1',
      card: '5'
    });
  });

  it('should reconnect on connection loss', async () => {
    await client.connect();
    await server.connected;

    // Simulate connection loss
    server.close();

    // Wait for reconnection attempt
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should attempt to reconnect
    expect(client.connectionState).toBe('reconnecting');
  });
});
```

### Integration Testing
```typescript
// src/__tests__/integration/voting-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { server } from '@/test/mocks/server';

describe('Voting Flow Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should complete full voting flow', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create session
    await user.click(screen.getByText('Create Session'));
    await user.type(screen.getByLabelText('Your Name'), 'Test User');
    await user.click(screen.getByText('Create'));

    // Wait for session creation
    await waitFor(() => {
      expect(screen.getByText('Session Created')).toBeInTheDocument();
    });

    // Create story
    await user.click(screen.getByText('Add Story'));
    await user.type(screen.getByLabelText('Story Title'), 'Test Story');
    await user.type(screen.getByLabelText('Description'), 'Test Description');
    await user.click(screen.getByText('Create Story'));

    // Wait for story to appear
    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Submit vote
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText('Submit Vote'));

    // Verify vote was submitted
    await waitFor(() => {
      expect(screen.getByText('Vote submitted')).toBeInTheDocument();
    });

    // Reveal votes (as host)
    await user.click(screen.getByText('Reveal Cards'));

    // Verify results are shown
    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should handle real-time vote synchronization', async () => {
    // Test with two simulated users
    // Implementation depends on your WebSocket mocking strategy
  });
});
```

### End-to-End Testing with Playwright
```typescript
// e2e/tests/planning-poker.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Planning Poker E2E', () => {
  test('should create session and invite players', async ({ page, context }) => {
    // Navigate to app
    await page.goto('/');

    // Create session
    await page.click('text=Create Session');
    await page.fill('[data-testid="player-name"]', 'Host Player');
    await page.click('text=Create');

    // Verify session created
    await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
    const sessionId = await page.locator('[data-testid="session-id"]').textContent();

    // Open second browser context (simulate second player)
    const secondPage = await context.newPage();
    await secondPage.goto(`/?session=${sessionId}`);
    
    // Join as second player
    await secondPage.fill('[data-testid="player-name"]', 'Second Player');
    await secondPage.click('text=Join Session');

    // Verify both players appear in first page
    await expect(page.locator('text=Second Player')).toBeVisible();
  });

  test('should complete voting round with multiple players', async ({ page, context }) => {
    // Set up session with two players
    // ... setup code ...

    // Host creates story
    await page.click('[data-testid="add-story"]');
    await page.fill('[data-testid="story-title"]', 'Implement login feature');
    await page.fill('[data-testid="story-description"]', 'User should be able to log in');
    await page.click('text=Create Story');

    // Both players vote
    await page.click('[data-testid="card-5"]');
    await page.click('[data-testid="submit-vote"]');

    await secondPage.click('[data-testid="card-8"]');
    await secondPage.click('[data-testid="submit-vote"]');

    // Host reveals votes
    await page.click('[data-testid="reveal-votes"]');

    // Verify results on both pages
    await expect(page.locator('[data-testid="vote-result-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="vote-result-8"]')).toBeVisible();
    
    await expect(secondPage.locator('[data-testid="vote-result-5"]')).toBeVisible();
    await expect(secondPage.locator('[data-testid="vote-result-8"]')).toBeVisible();
  });

  test('should handle network disconnection gracefully', async ({ page }) => {
    // Create session and vote
    // ... setup code ...

    // Simulate network disconnection
    await page.setOfflineMode(true);

    // Try to vote while offline
    await page.click('[data-testid="card-3"]');
    await page.click('[data-testid="submit-vote"]');

    // Should show offline message
    await expect(page.locator('text=You are offline')).toBeVisible();

    // Reconnect
    await page.setOfflineMode(false);

    // Should automatically retry and sync
    await expect(page.locator('text=Connected')).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');

    // Create session
    await page.click('text=Create Session');
    await page.fill('[data-testid="player-name"]', 'Mobile User');
    await page.click('text=Create');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-bottom-nav"]')).toBeVisible();
    
    // Test swipe gestures (if implemented)
    await page.touchscreen.tap(200, 400);
    const startX = 100;
    const endX = 300;
    await page.touchscreen.tap(startX, 400);
    await page.mouse.move(endX, 400);
    
    // Verify card selection works on mobile
    await page.click('[data-testid="card-5"]');
    await expect(page.locator('[data-testid="card-5"]')).toHaveClass(/selected/);
  });
});
```

### Performance Testing
```typescript
// performance/load-test.ts
import { chromium } from 'playwright';

const performanceTest = async () => {
  const browser = await chromium.launch();
  const contexts = [];
  const pages = [];

  try {
    // Create 20 concurrent users
    for (let i = 0; i < 20; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    // Measure initial load time
    const startTime = Date.now();
    await Promise.all(pages.map(page => page.goto('/')));
    const loadTime = Date.now() - startTime;
    
    console.log(`Load time for 20 users: ${loadTime}ms`);

    // Create session with first user
    const hostPage = pages[0];
    await hostPage.click('text=Create Session');
    await hostPage.fill('[data-testid="player-name"]', 'Host');
    await hostPage.click('text=Create');
    
    const sessionId = await hostPage.locator('[data-testid="session-id"]').textContent();

    // Join all other users to the same session
    const joinPromises = pages.slice(1).map(async (page, index) => {
      await page.goto(`/?session=${sessionId}`);
      await page.fill('[data-testid="player-name"]', `Player${index + 1}`);
      await page.click('text=Join Session');
    });

    await Promise.all(joinPromises);

    // Create story and measure voting performance
    await hostPage.click('[data-testid="add-story"]');
    await hostPage.fill('[data-testid="story-title"]', 'Performance Test Story');
    await hostPage.click('text=Create Story');

    // All users vote simultaneously
    const voteStartTime = Date.now();
    const votePromises = pages.map(async (page, index) => {
      const cardValue = (index % 5) + 1; // Distribute votes across cards
      await page.click(`[data-testid="card-${cardValue}"]`);
      await page.click('[data-testid="submit-vote"]');
    });

    await Promise.all(votePromises);
    const voteTime = Date.now() - voteStartTime;
    
    console.log(`Vote submission time for 20 users: ${voteTime}ms`);

    // Measure reveal performance
    const revealStartTime = Date.now();
    await hostPage.click('[data-testid="reveal-votes"]');
    
    // Wait for all pages to show results
    await Promise.all(pages.map(page => 
      page.waitForSelector('[data-testid="voting-results"]')
    ));
    
    const revealTime = Date.now() - revealStartTime;
    console.log(`Vote reveal time for 20 users: ${revealTime}ms`);

  } finally {
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
    await browser.close();
  }
};

// Memory leak detection
const memoryLeakTest = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    for (let i = 0; i < 100; i++) {
      await page.goto('/');
      await page.click('text=Create Session');
      await page.fill('[data-testid="player-name"]', `User${i}`);
      await page.click('text=Create');
      
      // Measure memory usage
      const metrics = await page.metrics();
      console.log(`Iteration ${i}: JS Heap Used: ${metrics.JSHeapUsedSize}`);
      
      // Navigate away and back to trigger cleanup
      await page.goto('about:blank');
    }
  } finally {
    await browser.close();
  }
};
```

### Test Utilities
```typescript
// src/test/providers.tsx
export const TestProvider = ({ children }) => (
  <QueryClientProvider client={testQueryClient}>
    <ToastProvider>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </ToastProvider>
  </QueryClientProvider>
);

// src/test/mocks/api.ts
export const mockApiHandlers = [
  rest.post('/api/sessions', (req, res, ctx) => {
    return res(ctx.json({
      id: 'test-session-id',
      name: 'Test Session',
      createdAt: new Date().toISOString()
    }));
  }),

  rest.post('/api/sessions/:sessionId/stories', (req, res, ctx) => {
    return res(ctx.json({
      id: 'test-story-id',
      title: 'Test Story',
      description: 'Test Description',
      createdAt: new Date().toISOString()
    }));
  }),

  rest.post('/api/voting/submit', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  })
];

// src/test/mocks/websocket.ts
export class MockWebSocket {
  static instances: MockWebSocket[] = [];
  
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    MockWebSocket.instances.push(this);
    
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock sending data
    console.log('Mock WebSocket send:', data);
  }

  close() {
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close'));
    }, 10);
  }

  static sendToAll(message: any) {
    this.instances.forEach(instance => {
      instance.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(message)
      }));
    });
  }
}
```

## Testing Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:performance": "ts-node performance/load-test.ts",
    "test:a11y": "axe-playwright",
    "test:visual": "playwright test --grep visual",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

## Continuous Integration
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:performance
```

## Definition of Done
- Unit test coverage > 80%
- All integration tests passing
- E2E tests cover critical user journeys
- Performance tests validate scalability
- Accessibility tests pass WCAG standards
- Cross-browser compatibility verified
- Mobile testing completed
- CI/CD pipeline includes all test types
# Code Refactoring Plan - Planning Poker Application

## Overview

This document outlines specific code improvements and refactoring opportunities in the current codebase to improve maintainability, performance, and prepare for future features.

## Immediate Refactoring Needs

### 1. Remove Unused Code

#### SessionManager Component
**File**: `src/components/SessionManager.tsx`
**Issue**: Component exists but is never used
**Action**: Delete file or integrate its functionality properly

#### Unused CSS Animations
**File**: `src/index.css`
**Issue**: Card flip animations defined but never applied
```css
.card-flip {
  transform-style: preserve-3d;
  transition: transform 0.6s;
}
.card-flip.flipped {
  transform: rotateY(180deg);
}
```
**Action**: Either implement card flip animations or remove unused CSS

### 2. Component Refactoring

#### App.tsx Decomposition
**Current**: 140+ lines doing too much
**Proposed Structure**:
```typescript
// src/App.tsx - Main router only
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:sessionId" element={<GamePage />} />
    </Routes>
  );
};

// src/pages/HomePage.tsx
const HomePage = () => {
  // Game configuration logic
};

// src/pages/GamePage.tsx  
const GamePage = () => {
  // Game session logic
};

// src/components/GameBoard.tsx
const GameBoard = () => {
  // Active game UI
};
```

#### Extract Reusable Hooks
**Create**: `src/hooks/`
```typescript
// useSession.ts
export const useSession = () => {
  const store = useStore();
  // Session-specific logic
};

// usePlayer.ts
export const usePlayer = (playerId?: string) => {
  const store = useStore();
  // Player-specific logic
};

// useBroadcastSync.ts
export const useBroadcastSync = () => {
  // Extract broadcast channel logic
};
```

### 3. State Management Improvements

#### Store Optimization
**File**: `src/store.ts`
**Issues**:
1. Broadcasting entire state on every change
2. No action typing
3. No middleware for logging/debugging

**Improved Structure**:
```typescript
// src/store/types.ts
export interface GameState {
  session: SessionState;
  players: PlayersState;
  game: GameRoundState;
  ui: UIState;
}

// src/store/slices/sessionSlice.ts
export const createSessionSlice = (set, get) => ({
  session: {
    id: null,
    config: null,
    // session-specific state
  },
  // session actions
});

// src/store/index.ts
const useStore = create<GameState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...createSessionSlice(set, get),
      ...createPlayersSlice(set, get),
      ...createGameSlice(set, get),
      ...createUISlice(set, get),
    }))
  )
);
```

#### Selective Broadcasting
```typescript
// Only broadcast specific state changes
const broadcastMiddleware = (config) => (set, get, api) =>
  config(
    (args) => {
      set(args);
      const state = get();
      if (channel && shouldBroadcast(args)) {
        channel.postMessage({
          type: 'state-update',
          payload: extractBroadcastData(state),
        });
      }
    },
    get,
    api
  );
```

### 4. Type Safety Improvements

#### Constrain Card Values
```typescript
// src/types.ts
export type FibonacciValue = 0 | 1 | 2 | 3 | 5 | 8 | 13 | 21;
export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type CardValue = FibonacciValue | TShirtSize | '?' | '☕';

export interface CardDeck {
  name: string;
  values: CardValue[];
  type: 'fibonacci' | 'tshirt' | 'custom';
}
```

#### Add Runtime Validation
```typescript
// src/utils/validation.ts
import { z } from 'zod';

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  avatar: z.string().emoji(),
  selectedCard: z.string().nullable(),
});

export const validatePlayer = (data: unknown): Player => {
  return PlayerSchema.parse(data);
};
```

### 5. Performance Optimizations

#### Memoize Expensive Operations
```typescript
// src/components/PlayerAvatar.tsx
import { memo } from 'react';

export const PlayerAvatar = memo(({ player, size = 'medium' }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.player.id === nextProps.player.id &&
         prevProps.player.selectedCard === nextProps.player.selectedCard;
});
```

#### Virtualize Large Lists
```typescript
// For future use when player lists grow
import { FixedSizeList } from 'react-window';

const PlayerList = ({ players }) => (
  <FixedSizeList
    height={400}
    itemCount={players.length}
    itemSize={60}
  >
    {({ index, style }) => (
      <div style={style}>
        <PlayerAvatar player={players[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### 6. Error Handling

#### Add Error Boundaries
```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Game error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### Handle BroadcastChannel Errors
```typescript
// src/utils/broadcast.ts
export const createBroadcastChannel = (sessionId: string) => {
  try {
    const channel = new BroadcastChannel(`poker-${sessionId}`);
    
    channel.addEventListener('messageerror', (event) => {
      console.error('Broadcast error:', event);
      // Handle error
    });
    
    return channel;
  } catch (error) {
    console.warn('BroadcastChannel not supported:', error);
    // Fallback to localStorage events or polling
    return createFallbackChannel(sessionId);
  }
};
```

### 7. Component Structure Improvements

#### Consistent File Organization
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components
│   ├── game/            # Game-specific components
│   └── layout/          # Layout components
├── pages/               # Page components
├── hooks/               # Custom hooks
├── store/               # State management
│   ├── slices/          # Store slices
│   └── middleware/      # Store middleware
├── services/            # API/external services
├── utils/               # Utility functions
├── types/               # TypeScript types
└── constants/           # App constants
```

### 8. Testing Setup

#### Add Test Infrastructure
```typescript
// src/components/__tests__/Card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('handles click when not disabled', () => {
    const onClick = jest.fn();
    render(<Card value="5" onClick={onClick} />);
    
    fireEvent.click(screen.getByText('5'));
    expect(onClick).toHaveBeenCalledWith('5');
  });
});
```

#### Store Testing
```typescript
// src/store/__tests__/store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

describe('Store', () => {
  it('creates session with unique ID', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.createSession();
    });
    
    expect(result.current.sessionId).toBeTruthy();
    expect(result.current.isConfigured).toBe(true);
  });
});
```

### 9. Accessibility Improvements

#### Add ARIA Labels
```typescript
// src/components/Card.tsx
<motion.div
  role="button"
  aria-label={`Select ${value} story points`}
  aria-pressed={isSelected}
  tabIndex={disabled ? -1 : 0}
  onKeyPress={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick?.(value);
    }
  }}
>
```

#### Keyboard Navigation
```typescript
// src/hooks/useKeyboardNavigation.ts
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          // Close modals
          break;
        case 'Enter':
          // Submit action
          break;
        case 'Tab':
          // Handle focus
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

### 10. Code Quality Tools

#### ESLint Configuration
```javascript
// eslint.config.js - enhance existing
export default [
  {
    rules: {
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

#### Add Prettier
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
```

## Implementation Priority

1. **Immediate** (Before new features):
   - Remove unused code
   - Fix TypeScript issues
   - Add error boundaries
   - Extract reusable hooks

2. **Short-term** (Alongside Phase 1):
   - Refactor App.tsx
   - Optimize store broadcasting
   - Add basic tests
   - Improve accessibility

3. **Long-term** (During development):
   - Complete test coverage
   - Performance optimizations
   - Full accessibility compliance
   - Documentation

## Benefits of Refactoring

1. **Maintainability**: Easier to add new features
2. **Performance**: Reduced re-renders, smaller bundle
3. **Reliability**: Better error handling, type safety
4. **Developer Experience**: Clear structure, good testing
5. **User Experience**: Better performance, accessibility

## Metrics to Track

- Bundle size reduction (target: -30%)
- Test coverage (target: 80%+)
- Lighthouse scores (target: 90+)
- TypeScript errors (target: 0)
- Component render count (target: -50%)

## Conclusion

These refactoring improvements will create a more robust foundation for the Planning Poker application. Prioritizing the removal of unused code and improving type safety will provide immediate benefits, while the structural improvements will make future feature development significantly easier.
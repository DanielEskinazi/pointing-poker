# 20. Codebase Refactoring & Optimization Plan

## Overview

This comprehensive refactoring plan addresses technical debt, code duplication, and performance optimizations identified through detailed codebase analysis. The goal is to improve maintainability, reduce bundle size, and enhance development velocity while preserving existing functionality.

## Scope & Objectives

### Primary Goals
- **Reduce Code Duplication**: Eliminate 60-70% duplicate code in error boundaries and service layers
- **Improve Performance**: Target 15-25% bundle size reduction and 10-15% runtime performance improvement
- **Enhance Maintainability**: Split monolithic components and implement reusable patterns
- **Optimize Dependencies**: Remove unused packages and consolidate overlapping functionality

### Success Metrics
- Bundle size reduction from current baseline
- Reduced lines of code through consolidation
- Improved TypeScript coverage and type safety
- Faster build times
- Enhanced developer experience

## Phase 1: Immediate Optimizations (Week 1)

### 1.1 Remove Dead Code
**Priority**: High | **Effort**: Low | **Impact**: Medium

**Tasks:**
- [ ] Remove unused `useApiState.ts` hook (src/hooks/useApiState.ts:1-57)
- [ ] Clean up 26+ console.log statements across codebase
- [ ] Remove bcrypt dependency from backend (unused password hashing)
- [ ] Remove redundant type definitions in src/types.ts

**Files Affected:**
```
src/hooks/useApiState.ts (DELETE)
backend/package.json (remove bcrypt)
src/types.ts (cleanup VotingState, RevealResult interfaces)
Multiple files (console.log cleanup)
```

**Implementation:**
```bash
# Remove unused hook
rm src/hooks/useApiState.ts

# Update package.json
cd backend && npm uninstall bcrypt @types/bcrypt

# Clean console statements
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' '/console\./d'
```

### 1.2 Dependency Cleanup
**Priority**: High | **Effort**: Low | **Impact**: Medium

**Tasks:**
- [ ] Remove lz-string if only used for basic compression
- [ ] Replace node-fetch with native fetch in backend
- [ ] Evaluate if axios is needed alongside React Query

**Impact**: Estimated 200-300KB bundle size reduction

## Phase 2: Component Consolidation (Week 2-3)

### 2.1 Error Boundary Refactoring
**Priority**: High | **Effort**: Medium | **Impact**: High

**Current State:**
- 3 error boundary components with 60-70% duplicate code
- Similar retry/recovery mechanisms
- Repeated error handling patterns

**Solution Architecture:**
```typescript
// New base component
interface BaseErrorBoundaryProps {
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  children: ReactNode;
}

// Specialized boundaries extend base
interface SessionErrorBoundaryProps extends BaseErrorBoundaryProps {
  onSessionReset?: () => void;
}
```

**Implementation Tasks:**
- [ ] Create `BaseErrorBoundary` with common functionality
- [ ] Refactor `SessionErrorBoundary` to extend base
- [ ] Refactor `VotingErrorBoundary` to extend base  
- [ ] Refactor `ErrorBoundary` to extend base
- [ ] Create shared error recovery hooks

**Files:**
```
src/components/errors/BaseErrorBoundary.tsx (NEW)
src/components/errors/ErrorBoundary.tsx (REFACTOR)
src/components/errors/SessionErrorBoundary.tsx (REFACTOR)
src/components/errors/VotingErrorBoundary.tsx (REFACTOR)
src/hooks/useErrorRecovery.ts (NEW)
```

### 2.2 Loading Component Optimization
**Priority**: Medium | **Effort**: Low | **Impact**: Low

**Tasks:**
- [ ] Create theme system for consistent colors
- [ ] Consolidate loading states into single component with variants
- [ ] Replace hardcoded Tailwind classes with theme variables

## Phase 3: Store Architecture Refactoring (Week 3-4)

### 3.1 Split Monolithic Store
**Priority**: High | **Effort**: High | **Impact**: High

**Current Issues:**
- Single store file with 1,292 lines
- Mixed concerns (WebSocket, API, UI state)
- Difficult to test and maintain
- Unnecessary re-renders

**New Architecture:**
```
src/store/
├── index.ts              # Store composition
├── slices/
│   ├── sessionStore.ts   # Session management
│   ├── votingStore.ts    # Voting logic
│   ├── timerStore.ts     # Timer functionality
│   ├── uiStore.ts        # UI state
│   └── playerStore.ts    # Player management
├── middleware/
│   ├── persistence.ts    # State persistence
│   ├── websocket.ts      # WebSocket middleware
│   └── logger.ts         # State change logging
└── selectors/
    ├── session.ts        # Session selectors
    ├── voting.ts         # Voting selectors
    └── ui.ts             # UI selectors
```

**Implementation Tasks:**
- [ ] Extract session management to `sessionStore.ts`
- [ ] Extract voting logic to `votingStore.ts`
- [ ] Extract timer functionality to `timerStore.ts`
- [ ] Create UI-specific store for interface state
- [ ] Implement store composition in main index
- [ ] Create selector hooks for performance optimization
- [ ] Move WebSocket logic to middleware

**Performance Benefits:**
- Reduced re-renders through focused selectors
- Better code splitting potential
- Improved testability
- Clearer separation of concerns

### 3.2 WebSocket Service Extraction
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Tasks:**
- [ ] Extract WebSocket event handling from store
- [ ] Create dedicated WebSocket service class
- [ ] Implement event bus pattern for loose coupling
- [ ] Add proper error handling and reconnection logic

**New Files:**
```
src/services/websocket/
├── EventBus.ts           # Event management
├── WebSocketService.ts   # Core WebSocket logic
├── reconnection.ts       # Reconnection strategy
└── types.ts              # WebSocket type definitions
```

## Phase 4: Backend Service Optimization (Week 4-5)

### 4.1 Service Layer Refactoring
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Current Issues:**
- Repeated error handling patterns across all services
- Similar try-catch-log-throw patterns
- Database connection patterns duplicated

**Solution Architecture:**
```typescript
abstract class BaseService {
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`${context}: ${error.message}`, { error });
      throw new ServiceError(error.message, context);
    }
  }
}

class PlayerService extends BaseService {
  async createPlayer(data: CreatePlayerData): Promise<Player> {
    return this.executeWithErrorHandling(
      () => prisma.player.create({ data }),
      'createPlayer'
    );
  }
}
```

**Implementation Tasks:**
- [ ] Create `BaseService` abstract class
- [ ] Implement common error handling patterns
- [ ] Refactor all services to extend base class
- [ ] Create service decorators for cross-cutting concerns
- [ ] Implement dependency injection container

### 4.2 Database Query Optimization
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Current Issues:**
- Multiple sequential database calls
- Missing query optimization
- No query result caching

**Tasks:**
- [ ] Optimize `getSessionPlayers` with joins
- [ ] Implement query result caching
- [ ] Add database query performance monitoring
- [ ] Create database query builder patterns

## Phase 5: Performance Optimization (Week 5-6)

### 5.1 Bundle Size Optimization
**Priority**: High | **Effort**: Medium | **Impact**: High

**Current Issues:**
- Framer Motion used in 31 files (heavy library)
- Potential over-bundling of dependencies

**Strategy:**
```typescript
// Lazy load animations
const AnimatedComponent = lazy(() => import('./AnimatedComponent'));

// Use CSS transitions for simple animations
.card-hover {
  transition: transform 0.2s ease-in-out;
}

// Selective Framer Motion imports
import { motion } from 'framer-motion';
// Instead of importing everything
```

**Tasks:**
- [ ] Audit Framer Motion usage - identify candidates for CSS transitions
- [ ] Implement lazy loading for animation-heavy components
- [ ] Use selective imports for Framer Motion
- [ ] Consider lightweight animation library for simple cases
- [ ] Implement code splitting at route level

**Expected Impact**: 20-30% bundle size reduction

### 5.2 React Performance Optimization
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Tasks:**
- [ ] Implement React.memo for pure components
- [ ] Add useMemo/useCallback for expensive computations
- [ ] Create selector hooks to prevent unnecessary re-renders
- [ ] Optimize context providers with value memoization

**Example Implementation:**
```typescript
// Before
const VotingResults = ({ votes }) => {
  const stats = calculateVotingStats(votes); // Runs every render
  return <div>{stats.average}</div>;
};

// After
const VotingResults = memo(({ votes }) => {
  const stats = useMemo(() => calculateVotingStats(votes), [votes]);
  return <div>{stats.average}</div>;
});
```

## Phase 6: Type System Enhancement (Week 6-7)

### 6.1 Shared Type Definitions
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Current Issues:**
- Backend and frontend types not synchronized
- Multiple overlapping interfaces
- Inconsistent type definitions

**Solution:**
```
shared-types/
├── index.ts              # Main exports
├── api/
│   ├── session.ts        # Session-related types
│   ├── player.ts         # Player-related types
│   ├── voting.ts         # Voting-related types
│   └── websocket.ts      # WebSocket event types
├── database/
│   └── entities.ts       # Database entity types
└── common/
    ├── errors.ts         # Error types
    └── responses.ts      # API response types
```

**Implementation Tasks:**
- [ ] Create shared types package
- [ ] Generate types from OpenAPI schema
- [ ] Implement type validation at runtime
- [ ] Update both frontend and backend to use shared types

### 6.2 TypeScript Configuration Enhancement
**Priority**: Low | **Effort**: Low | **Impact**: Low

**Tasks:**
- [ ] Enable stricter TypeScript configuration
- [ ] Add path mapping for cleaner imports
- [ ] Implement consistent import/export patterns

## Implementation Timeline

### Week 1: Foundation Cleanup
- Remove dead code and unused dependencies
- Clean up console statements
- Basic performance wins

### Week 2-3: Component Architecture
- Refactor error boundaries
- Optimize loading components
- Begin store refactoring

### Week 3-4: Store & State Management
- Complete store splitting
- Extract WebSocket service
- Implement selectors

### Week 4-5: Backend Optimization
- Refactor service layer
- Optimize database queries
- Implement common patterns

### Week 5-6: Performance Tuning
- Bundle size optimization
- React performance improvements
- Animation optimization

### Week 6-7: Type System & Polish
- Shared type definitions
- Documentation updates
- Final testing and validation

## Risk Mitigation

### High-Risk Changes
1. **Store Refactoring**: Large-scale state management changes
   - **Mitigation**: Incremental migration, maintain backward compatibility
   - **Testing**: Comprehensive integration tests before/after

2. **Service Layer Changes**: Backend API modifications
   - **Mitigation**: Maintain existing API contracts
   - **Testing**: Full API test suite validation

### Testing Strategy
- [ ] Maintain 100% existing test coverage during refactoring
- [ ] Add integration tests for refactored components
- [ ] Performance regression testing
- [ ] Cross-browser compatibility testing

## Success Measurement

### Quantitative Metrics
- **Bundle Size**: Target 15-25% reduction
- **Build Time**: Target 20% improvement
- **Runtime Performance**: Target 10-15% improvement
- **Code Coverage**: Maintain >90%
- **Lines of Code**: Target 10-20% reduction through consolidation

### Qualitative Metrics
- Improved developer experience
- Easier onboarding for new contributors
- Reduced bug reports related to state management
- Improved code review efficiency

## Post-Refactoring Maintenance

### Documentation Updates
- [ ] Update architecture documentation
- [ ] Create component usage guidelines
- [ ] Document new patterns and conventions
- [ ] Update development setup instructions

### Monitoring & Alerts
- [ ] Set up bundle size monitoring
- [ ] Implement performance regression alerts
- [ ] Add code quality gates to CI/CD
- [ ] Create refactoring impact dashboard

## Conclusion

This refactoring plan addresses the major technical debt identified in the codebase while maintaining system stability and functionality. The phased approach allows for incremental improvements with measurable outcomes at each stage.

The estimated impact includes significant improvements in maintainability, performance, and developer experience, positioning the codebase for continued growth and feature development.
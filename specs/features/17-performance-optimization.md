# Feature 17: Performance Optimization

## Status: Not Started
## Priority: Medium  
## Estimated Effort: 6-8 days
## Gap Analysis Source: Performance Optimization Gaps (25% Complete)

## Problem Statement

The Planning Poker application lacks performance optimization, resulting in large bundle sizes, slow initial load times, and potential scaling issues. Without proper optimization, the application may provide poor user experience, especially on slower networks and devices.

**Current State:**
- Bundle size ~2MB (target: <1MB)
- No code splitting implemented
- No image optimization or lazy loading
- WebSocket events not optimized
- No caching strategy implemented
- Database queries not optimized

## Success Criteria

- [ ] Bundle size reduced to <1MB
- [ ] Initial page load time <3 seconds on 3G
- [ ] Lighthouse performance score >90
- [ ] Code splitting for route-based loading
- [ ] Image optimization and lazy loading
- [ ] WebSocket connection optimization
- [ ] Database query optimization
- [ ] Efficient caching strategies

## Technical Requirements

### Performance Targets

```typescript
interface PerformanceTargets {
  bundleSize: {
    total: '<1MB';
    vendor: '<500KB';
    app: '<400KB';
    css: '<100KB';
  };
  loadTimes: {
    firstContentfulPaint: '<1.5s';
    largestContentfulPaint: '<3s';
    timeToInteractive: '<3.5s';
    firstInputDelay: '<100ms';
  };
  runtime: {
    componentRenderTime: '<16ms';
    stateUpdateTime: '<10ms';
    webSocketLatency: '<100ms';
    apiResponseTime: '<500ms';
  };
}
```

### Performance Monitoring Architecture

```typescript
interface PerformanceMonitoring {
  metrics: {
    webVitals: CoreWebVitals;
    customMetrics: CustomPerformanceMetrics;
    userTimings: UserTimingMeasures;
  };
  monitoring: {
    realUserMonitoring: boolean;
    syntheticMonitoring: boolean;
    errorTracking: boolean;
    performanceBudgets: boolean;
  };
}
```

## Implementation Tasks

### Phase 1: Bundle Optimization (2-3 days)

#### Task 1.1: Code Splitting Implementation
```typescript
// src/utils/lazyLoad.ts
import { lazy, ComponentType } from 'react';
import { LoadingSpinner } from '../components/loading';

export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback = <LoadingSpinner />
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Route-based code splitting
export const routes = {
  Game: createLazyComponent(() => import('../pages/Game')),
  Settings: createLazyComponent(() => import('../pages/Settings')),
  Analytics: createLazyComponent(() => import('../pages/Analytics')),
  Export: createLazyComponent(() => import('../pages/Export'))
};
```

#### Task 1.2: Dynamic Imports for Features
```typescript
// src/components/ConditionalFeatures.tsx
export const ConditionalFeatures = () => {
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  
  const loadAdvancedFeatures = async () => {
    if (showAdvancedFeatures) {
      // Dynamically import advanced features only when needed
      const { AdvancedAnalytics } = await import('./AdvancedAnalytics');
      const { ExportTools } = await import('./ExportTools');
      const { TimerConfiguration } = await import('./TimerConfiguration');
      
      return { AdvancedAnalytics, ExportTools, TimerConfiguration };
    }
    return null;
  };
  
  return (
    <div>
      {/* Core features always loaded */}
      <VotingInterface />
      <StoryManagement />
      
      {/* Advanced features loaded on demand */}
      {showAdvancedFeatures && (
        <Suspense fallback={<LoadingSpinner />}>
          <AsyncAdvancedFeatures loader={loadAdvancedFeatures} />
        </Suspense>
      )}
    </div>
  );
};
```

#### Task 1.3: Vendor Bundle Optimization
```typescript
// vite.config.ts optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', '@headlessui/react'],
          'utils-vendor': ['zustand', 'axios', 'socket.io-client'],
          
          // Feature chunks
          'analytics': ['recharts', 'd3'],
          'export': ['html2canvas', 'jspdf'],
          'forms': ['react-hook-form', 'zod']
        }
      }
    },
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false, // Disable in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'framer-motion'
    ]
  }
});
```

### Phase 2: Runtime Performance Optimization (2-3 days)

#### Task 2.1: Component Optimization
```typescript
// src/components/optimized/OptimizedCard.tsx
import { memo, useMemo, useCallback } from 'react';

export const OptimizedCard = memo(({ 
  value, 
  isSelected, 
  isRevealed, 
  onSelect,
  disabled 
}: CardProps) => {
  // Memoize expensive calculations
  const cardStyles = useMemo(() => ({
    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
    backgroundColor: isSelected ? 'var(--primary-blue)' : 'white',
    borderColor: isSelected ? 'var(--primary-blue)' : '#e5e7eb'
  }), [isSelected]);
  
  // Optimize event handlers
  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(value);
    }
  }, [value, onSelect, disabled]);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSelect(value);
    }
  }, [value, onSelect, disabled]);
  
  return (
    <motion.button
      style={cardStyles}
      className="optimized-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.1 }} // Shorter transition
    >
      {value}
    </motion.button>
  );
});

OptimizedCard.displayName = 'OptimizedCard';
```

#### Task 2.2: State Update Optimization
```typescript
// src/store/optimizedStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

// Optimized store with selective subscriptions
export const useOptimizedGameStore = create<GameState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Optimized state updates
      updatePlayer: (playerId: string, updates: Partial<Player>) => {
        set(state => {
          const playerIndex = state.players.findIndex(p => p.id === playerId);
          if (playerIndex !== -1) {
            Object.assign(state.players[playerIndex], updates);
          }
        });
      },
      
      // Batch updates for better performance
      batchUpdatePlayers: (updates: Array<{ id: string; updates: Partial<Player> }>) => {
        set(state => {
          updates.forEach(({ id, updates: playerUpdates }) => {
            const playerIndex = state.players.findIndex(p => p.id === id);
            if (playerIndex !== -1) {
              Object.assign(state.players[playerIndex], playerUpdates);
            }
          });
        });
      },
      
      // Selective state subscription
      subscribeToVoting: (callback: (voting: VotingState) => void) => {
        return useOptimizedGameStore.subscribe(
          state => state.voting,
          callback,
          { equalityFn: shallow }
        );
      }
    }))
  )
);

// Optimized selectors
export const selectVotingProgress = (state: GameState) => ({
  votedCount: Object.keys(state.voting.votes).length,
  totalCount: state.players.filter(p => !p.isSpectator).length,
  hasVoted: state.voting.hasVoted
});

export const selectActiveStory = (state: GameState) => 
  state.stories.find(story => story.isActive) || null;
```

#### Task 2.3: Virtual Scrolling for Large Lists
```typescript
// src/components/VirtualizedStoryList.tsx
import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

const StoryItem = memo(({ index, style, data }: ListChildComponentProps) => {
  const story = data.stories[index];
  const { onStorySelect, activeStoryId } = data;
  
  return (
    <div style={style}>
      <StoryListItem
        story={story}
        isActive={story.id === activeStoryId}
        onSelect={() => onStorySelect(story.id)}
      />
    </div>
  );
});

export const VirtualizedStoryList = ({ 
  stories, 
  activeStoryId, 
  onStorySelect 
}: VirtualizedStoryListProps) => {
  const itemData = useMemo(() => ({
    stories,
    activeStoryId,
    onStorySelect
  }), [stories, activeStoryId, onStorySelect]);
  
  return (
    <List
      height={400} // Fixed height for virtualization
      itemCount={stories.length}
      itemSize={80} // Height of each story item
      itemData={itemData}
      overscanCount={5} // Render 5 extra items for smooth scrolling
    >
      {StoryItem}
    </List>
  );
};
```

### Phase 3: Asset and Network Optimization (1-2 days)

#### Task 3.1: Image Optimization
```typescript
// src/components/OptimizedImage.tsx
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  placeholder?: string;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  sizes = '100vw',
  priority = false,
  placeholder = 'blur'
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  
  useEffect(() => {
    // Generate responsive image URLs
    const generateSrcSet = (baseSrc: string) => {
      const breakpoints = [320, 640, 768, 1024, 1280];
      return breakpoints
        .map(width => `${baseSrc}?w=${width} ${width}w`)
        .join(', ');
    };
    
    // Preload critical images
    if (priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    }
    
    setCurrentSrc(src);
  }, [src, priority]);
  
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  return (
    <div className="optimized-image-container">
      {!isLoaded && placeholder === 'blur' && (
        <div className="image-placeholder blur-background" />
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        className={`
          optimized-image
          ${isLoaded ? 'loaded' : 'loading'}
        `}
      />
    </div>
  );
};
```

#### Task 3.2: Service Worker for Caching
```typescript
// public/sw.js
const CACHE_NAME = 'planning-poker-v1';
const STATIC_ASSETS = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Cache strategy: Network first, then cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone response for cache
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
        }
        
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});
```

#### Task 3.3: WebSocket Optimization
```typescript
// src/services/optimizedWebSocket.ts
export class OptimizedWebSocketClient {
  private socket: WebSocket | null = null;
  private messageQueue: string[] = [];
  private batchTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  // Batch messages to reduce WebSocket overhead
  private batchMessages(message: string) {
    this.messageQueue.push(message);
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = window.setTimeout(() => {
      this.flushMessageQueue();
    }, 50); // Batch messages for 50ms
  }
  
  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    const batchedMessage = JSON.stringify({
      type: 'batch',
      messages: this.messageQueue.map(msg => JSON.parse(msg))
    });
    
    this.socket?.send(batchedMessage);
    this.messageQueue = [];
    this.batchTimeout = null;
  }
  
  // Optimized connection with exponential backoff
  connect(url: string) {
    this.socket = new WebSocket(url);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.socket.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.pow(2, this.reconnectAttempts) * 1000;
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(url);
        }, delay);
      }
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle batched messages
        if (data.type === 'batch') {
          data.messages.forEach((msg: any) => this.handleMessage(msg));
        } else {
          this.handleMessage(data);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };
  }
  
  // Throttled message sending
  private throttledSend = throttle((message: string) => {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }, 100);
  
  send(data: any) {
    const message = JSON.stringify(data);
    
    // Use batching for non-critical messages
    if (data.priority === 'low') {
      this.batchMessages(message);
    } else {
      this.throttledSend(message);
    }
  }
}
```

### Phase 4: Database and API Optimization (1-2 days)

#### Task 4.1: Database Query Optimization
```sql
-- backend/database/optimized-queries.sql

-- Optimized session query with joins
CREATE INDEX CONCURRENTLY idx_sessions_active 
ON sessions (id, created_at) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_players_session 
ON players (session_id, created_at);

CREATE INDEX CONCURRENTLY idx_stories_session_active 
ON stories (session_id, is_active, order_index);

CREATE INDEX CONCURRENTLY idx_votes_story_player 
ON votes (story_id, player_id, created_at);

-- Optimized query for session data with all relations
SELECT 
  s.id,
  s.name,
  s.host_id,
  s.config,
  s.created_at,
  json_agg(
    DISTINCT jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'avatar', p.avatar,
      'is_spectator', p.is_spectator
    )
  ) as players,
  json_agg(
    DISTINCT jsonb_build_object(
      'id', st.id,
      'title', st.title,
      'description', st.description,
      'order_index', st.order_index,
      'is_active', st.is_active,
      'final_estimate', st.final_estimate,
      'created_at', st.created_at,
      'completed_at', st.completed_at
    )
  ) FILTER (WHERE st.id IS NOT NULL) as stories
FROM sessions s
LEFT JOIN players p ON s.id = p.session_id AND p.deleted_at IS NULL
LEFT JOIN stories st ON s.id = st.session_id AND st.deleted_at IS NULL
WHERE s.id = $1 AND s.deleted_at IS NULL
GROUP BY s.id, s.name, s.host_id, s.config, s.created_at;
```

#### Task 4.2: API Response Optimization
```typescript
// backend/src/middleware/compression.ts
import compression from 'compression';

export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress WebSocket upgrades
    if (req.headers['connection'] === 'upgrade') {
      return false;
    }
    return compression.filter(req, res);
  }
});

// backend/src/middleware/caching.ts
export const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set cache headers for static data
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${duration}`);
      res.setHeader('ETag', generateETag(req.url));
    }
    next();
  };
};

// Optimized session endpoint
export const getSessionOptimized = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  try {
    // Use database connection pooling
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        players: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            avatar: true,
            isSpectator: true
          }
        },
        stories: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            orderIndex: true,
            isActive: true,
            finalEstimate: true,
            createdAt: true,
            completedAt: true
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Add response compression
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

## Performance Monitoring Implementation

### Task 4.3: Performance Metrics Collection
```typescript
// src/utils/performanceMonitoring.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  private metrics: Record<string, number> = {};
  
  constructor() {
    this.initializeWebVitals();
    this.initializeCustomMetrics();
  }
  
  private initializeWebVitals() {
    getCLS(this.handleMetric);
    getFID(this.handleMetric);
    getFCP(this.handleMetric);
    getLCP(this.handleMetric);
    getTTFB(this.handleMetric);
  }
  
  private handleMetric = (metric: any) => {
    this.metrics[metric.name] = metric.value;
    
    // Send to analytics service
    this.sendMetric(metric.name, metric.value);
    
    // Log performance warnings
    if (this.isMetricPoor(metric)) {
      console.warn(`Poor ${metric.name}: ${metric.value}`);
    }
  };
  
  private isMetricPoor(metric: any): boolean {
    const thresholds = {
      CLS: 0.25,
      FID: 300,
      FCP: 3000,
      LCP: 4000,
      TTFB: 800
    };
    
    return metric.value > thresholds[metric.name as keyof typeof thresholds];
  }
  
  // Measure custom metrics
  measureComponentRender(componentName: string, fn: () => void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    const renderTime = end - start;
    this.sendMetric(`component-render-${componentName}`, renderTime);
    
    if (renderTime > 16) { // 60fps threshold
      console.warn(`Slow component render: ${componentName} took ${renderTime}ms`);
    }
  }
  
  measureStateUpdate(operation: string, fn: () => void) {
    performance.mark(`${operation}-start`);
    fn();
    performance.mark(`${operation}-end`);
    performance.measure(operation, `${operation}-start`, `${operation}-end`);
  }
  
  private sendMetric(name: string, value: number) {
    // Send to analytics service (e.g., Google Analytics, DataDog)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(value),
        custom_parameter: navigator.userAgent
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export const usePerformanceMonitoring = (componentName: string) => {
  useEffect(() => {
    performanceMonitor.measureComponentRender(componentName, () => {
      // Component render logic
    });
  }, [componentName]);
};
```

## Performance Testing Strategy

### Automated Performance Testing
```typescript
// performance/lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/game'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }]
      }
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: 'https://your-lhci-server.com'
    }
  }
};

// performance/bundle-analyzer.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};
```

### Load Testing
```typescript
// performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { WebSocket } from 'k6/experimental/websockets';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Error rate under 1%
  },
};

export default function () {
  // Test API endpoints
  let response = http.get('http://localhost:3001/api/sessions/test-session');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Test WebSocket connections
  const ws = new WebSocket('ws://localhost:3001');
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', sessionId: 'test-session' }));
  });
  
  sleep(1);
}
```

## Success Metrics

### Performance Budgets
```json
{
  "performanceBudgets": {
    "bundleSize": {
      "total": "1MB",
      "vendor": "500KB",
      "app": "400KB",
      "css": "100KB"
    },
    "loadTimes": {
      "firstContentfulPaint": "1.5s",
      "largestContentfulPaint": "3s",
      "timeToInteractive": "3.5s"
    },
    "runtime": {
      "componentRender": "16ms",
      "stateUpdate": "10ms",
      "apiResponse": "500ms"
    }
  }
}
```

### Monitoring Dashboards
- **Lighthouse CI**: Automated performance testing in CI/CD
- **Bundle Analyzer**: Track bundle size growth over time
- **Real User Monitoring**: Production performance metrics
- **Load Testing**: Scalability and stress testing results

### Performance KPIs
- [ ] Lighthouse Performance Score: >90
- [ ] First Contentful Paint: <1.5s
- [ ] Largest Contentful Paint: <3s
- [ ] Cumulative Layout Shift: <0.1
- [ ] First Input Delay: <100ms
- [ ] Bundle Size: <1MB total
- [ ] API Response Time: <500ms p95
- [ ] WebSocket Latency: <100ms

This comprehensive performance optimization will ensure the Planning Poker application provides fast, responsive user experience across all devices and network conditions while maintaining scalability for larger team sessions.
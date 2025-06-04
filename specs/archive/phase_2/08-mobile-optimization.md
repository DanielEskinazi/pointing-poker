# Story 08: Mobile Optimization & PWA

**Epic**: Polish & Production  
**Priority**: P3 - Low  
**Effort**: High (5-6 days)  
**Week**: 4

## User Story

**As a** team member using a mobile device  
**I want** the planning poker app to work seamlessly on my phone or tablet  
**So that** I can participate in estimation sessions from anywhere

## Problem Statement

The current application is designed primarily for desktop use. With remote and hybrid teams, many participants join from mobile devices, but the current UI doesn't provide a good mobile experience.

## Acceptance Criteria

### ✅ Mobile-Responsive Design
- [ ] App works well on phones (iOS/Android)
- [ ] App works well on tablets (iPad/Android tablets)
- [ ] Touch-friendly interface for all interactions
- [ ] Readable text and appropriately sized buttons
- [ ] Efficient use of small screen real estate

### ✅ Progressive Web App (PWA)
- [ ] App can be installed on mobile home screen
- [ ] Works offline with basic functionality
- [ ] Push notifications for session updates
- [ ] Fast loading and smooth performance
- [ ] App-like navigation and feel

### ✅ Mobile-Optimized Features
- [ ] Swipe gestures for card selection
- [ ] Pull-to-refresh for session updates
- [ ] Mobile-optimized voting interface
- [ ] Collapsible panels for space efficiency
- [ ] One-handed operation support

### ✅ Performance Optimization
- [ ] Fast loading on mobile networks
- [ ] Efficient data usage
- [ ] Smooth animations on mobile devices
- [ ] Battery usage optimization
- [ ] Works well on slower devices

## Technical Requirements

### Responsive Design Implementation
```css
/* Mobile-first responsive breakpoints */
.voting-cards {
  /* Mobile: Stack cards vertically */
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  /* Tablet: 2-column grid */
  @media (min-width: 769px) and (max-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  /* Desktop: Horizontal layout */
  @media (min-width: 1025px) {
    display: flex;
    flex-direction: row;
    gap: 1rem;
  }
}
```

### PWA Configuration
```typescript
// PWA manifest (public/manifest.json):
{
  "name": "Planning Poker",
  "short_name": "PlanPoker", 
  "description": "Agile estimation tool for teams",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// Service worker for offline functionality:
// sw.js - Cache essential assets and API responses
```

### Mobile-Optimized Components
```typescript
// Components to create/optimize:
- src/components/mobile/MobileVotingCards.tsx
- src/components/mobile/MobilePlayerList.tsx  
- src/components/mobile/MobileSessionHeader.tsx
- src/components/mobile/MobileNavigation.tsx
- src/components/mobile/SwipeableCard.tsx
```

## Mobile UI/UX Design

### Mobile Voting Interface
```
┌─ Planning Poker ────────────────────┐
│ ← Team Sprint Planning         ⚙️   │
├─────────────────────────────────────┤
│ 📖 Current Story                    │
│ US-123: User Authentication         │
│ "As a user, I want to login..."     │
├─────────────────────────────────────┤
│ 👥 Players (2/3 voted)              │
│ 👤 Alice ✅  👤 Bob ⏳  👤 Carol ✅   │
├─────────────────────────────────────┤
│ 🗳️ Your Vote                        │
│ ┌─────┬─────┬─────┬─────┐           │
│ │  1  │  2  │  3  │  5  │           │
│ └─────┴─────┴─────┴─────┘           │
│ ┌─────┬─────┬─────┬─────┐           │
│ │  8  │ 13  │  ?  │ ☕  │           │
│ └─────┴─────┴─────┴─────┘           │
├─────────────────────────────────────┤
│ [Reveal Cards] [Reset] [Settings]   │
└─────────────────────────────────────┘
```

### Mobile Navigation Pattern
```
┌─ Planning Poker ────────────────────┐
│ ≡ Menu                      Alice ▼ │
├─────────────────────────────────────┤
│                                     │
│         Main Content Area           │
│                                     │
├─────────────────────────────────────┤
│ [Vote] [Players] [Stories] [Stats]  │
└─────────────────────────────────────┘
```

### Tablet Optimized Layout
```
┌─ Planning Poker ──────────────────────────────────┐
│ Team Sprint Planning          Alice (Host)     ⚙️ │
├─────────────────────┬─────────────────────────────┤
│ 📖 Current Story     │ 👥 Players (3)              │
│ US-123: User Auth    │ ┌─ Alice ────────────────┐  │
│ "As a user..."       │ │ Host • Voted ✅        │  │
│                     │ └───────────────────────┘  │
│ 🗳️ Your Vote         │ ┌─ Bob ──────────────────┐  │
│ ┌───┬───┬───┬───┐   │ │ Voting... ⏳          │  │
│ │ 1 │ 2 │ 3 │ 5 │   │ └───────────────────────┘  │
│ ├───┼───┼───┼───┤   │ ┌─ Carol ────────────────┐  │
│ │ 8 │13 │ ? │ ☕│   │ │ Voted ✅               │  │
│ └───┴───┴───┴───┘   │ └───────────────────────┘  │
├─────────────────────┴─────────────────────────────┤
│ [Reveal Cards] [Reset Voting] [Next Story]        │
└───────────────────────────────────────────────────┘
```

## Touch Interactions

### Swipe Gestures
```typescript
// Implement swipe-to-select for cards:
const SwipeableCard = ({ value, onSelect }) => {
  const [isSelected, setIsSelected] = useState(false)
  
  const handleSwipe = useSwipe({
    onSwipeUp: () => onSelect(value),
    onSwipeDown: () => onSelect(null),
    threshold: 50
  })
  
  return (
    <div 
      {...handleSwipe}
      className={`card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(value)}
    >
      {value}
    </div>
  )
}
```

### Touch-Friendly Sizing
```css
/* Minimum touch target sizes */
.mobile-button {
  min-height: 44px; /* iOS minimum */
  min-width: 44px;
  padding: 12px 16px;
  touch-action: manipulation; /* Disable double-tap zoom */
}

.voting-card {
  min-height: 60px;
  min-width: 60px;
  font-size: 1.25rem;
}

/* Increase tap areas for small elements */
.close-button::before {
  content: '';
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
}
```

### Pull-to-Refresh
```typescript
// Implement pull-to-refresh for session updates:
const usePullToRefresh = (onRefresh: () => void) => {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  
  const handleTouchStart = (e: TouchEvent) => {
    // Track initial touch position
  }
  
  const handleTouchMove = (e: TouchEvent) => {
    // Calculate pull distance
    // Show refresh indicator when threshold reached
  }
  
  const handleTouchEnd = () => {
    if (pullDistance > REFRESH_THRESHOLD) {
      onRefresh()
    }
    setIsPulling(false)
    setPullDistance(0)
  }
}
```

## PWA Features

### Service Worker for Offline Support
```typescript
// Basic offline functionality:
const CACHE_NAME = 'planning-poker-v1'
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})
```

### Push Notifications
```typescript
// Push notification service:
const NotificationService = {
  async requestPermission() {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  },
  
  async showNotification(title: string, options?: NotificationOptions) {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        ...options
      })
    }
  }
}

// Use for session events:
wsClient.on('cards:revealed', () => {
  if (!document.hasFocus()) {
    NotificationService.showNotification('Cards Revealed!', {
      body: 'Check the results in your planning session',
      tag: 'cards-revealed'
    })
  }
})
```

### App Installation Prompt
```typescript
// PWA installation prompt:
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setShowInstall(false)
    }
  }
  
  if (!showInstall) return null
  
  return (
    <div className="install-prompt">
      <p>Install Planning Poker for a better experience!</p>
      <button onClick={handleInstall}>Install App</button>
    </div>
  )
}
```

## Performance Optimization

### Mobile-Specific Optimizations
```typescript
// Lazy loading for mobile:
const LazyPlayerList = lazy(() => import('./MobilePlayerList'))
const LazyStatistics = lazy(() => import('./StatisticsPanel'))

// Reduce bundle size for mobile:
const isMobile = window.innerWidth < 768
const StatsComponent = isMobile ? null : LazyStatistics

// Optimize images for mobile:
const useResponsiveImage = (src: string) => {
  const [imageSrc, setImageSrc] = useState(src)
  
  useEffect(() => {
    const img = new Image()
    img.src = isMobile ? `${src}?w=300` : `${src}?w=600`
    img.onload = () => setImageSrc(img.src)
  }, [src])
  
  return imageSrc
}
```

### Data Usage Optimization
```typescript
// Reduce WebSocket data for mobile:
const mobileWebSocketConfig = {
  heartbeatInterval: isMobile ? 60000 : 30000, // Less frequent on mobile
  maxReconnectAttempts: isMobile ? 3 : 5,
  dataCompression: true
}

// Lazy load non-essential data:
const useOptionalData = (sessionId: string) => {
  const isOnline = useOnlineStatus()
  const isMobile = useIsMobile()
  
  return useQuery({
    queryKey: ['statistics', sessionId],
    queryFn: () => statisticsApi.get(sessionId),
    enabled: isOnline && !isMobile, // Skip on mobile
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
```

## Testing Strategy

### Mobile Testing Requirements
- Cross-browser testing on mobile Safari, Chrome Mobile
- Device testing on various screen sizes (iPhone, Android, tablets)  
- Touch interaction testing (tap, swipe, pinch)
- Performance testing on slower mobile networks
- PWA functionality testing (installation, offline mode)
- Push notification testing across platforms
- Battery usage testing for WebSocket connections

### Responsive Design Testing
```typescript
// Automated responsive testing:
const viewports = [
  { width: 375, height: 667 }, // iPhone SE
  { width: 414, height: 896 }, // iPhone 11 Pro Max
  { width: 768, height: 1024 }, // iPad
  { width: 1024, height: 768 }, // iPad Landscape
]

viewports.forEach(viewport => {
  test(`should render correctly at ${viewport.width}x${viewport.height}`, () => {
    cy.viewport(viewport.width, viewport.height)
    cy.visit('/session/test-id')
    cy.matchImageSnapshot()
  })
})
```

## Definition of Done
- [ ] App is fully responsive and works well on mobile devices
- [ ] Touch interactions feel native and responsive
- [ ] PWA can be installed and works offline
- [ ] Push notifications work for session events
- [ ] Performance is good on mobile networks and devices
- [ ] Battery usage is optimized
- [ ] Cross-platform mobile testing passes
- [ ] App store guidelines are met (if pursuing app store distribution)
- [ ] Mobile-specific features enhance the user experience
- [ ] Accessibility works with screen readers on mobile

## Dependencies
- All core functionality (Stories 01-06) must be complete
- WebSocket real-time sync for mobile offline/online handling

## Risks & Mitigation
- **Risk**: Performance issues on slower mobile devices
- **Mitigation**: Aggressive optimization, performance budgets

- **Risk**: Complex PWA implementation
- **Mitigation**: Start with basic PWA features, enhance iteratively

- **Risk**: Cross-platform compatibility issues
- **Mitigation**: Extensive device testing, progressive enhancement

## Testing Strategy
- Unit tests for mobile-specific components
- Integration tests for PWA features  
- Cross-browser mobile testing
- Device testing on real hardware
- Performance testing on 3G networks
- Accessibility testing with mobile screen readers
- PWA audit with Lighthouse
- Touch interaction testing
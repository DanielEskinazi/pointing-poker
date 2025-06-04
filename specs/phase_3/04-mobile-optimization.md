# Story 4: Mobile Optimization & Responsive Design

**Priority**: P1 - High  
**Estimate**: 2 days  
**Dependencies**: Story 1 (Core functionality working)

## Problem Statement
The current application lacks mobile optimization despite Phase 2 specifications promising mobile-friendly interfaces. With remote teams using various devices, mobile support is essential for inclusive planning sessions.

## Current Issues
- No responsive design implementation
- Desktop-only layout assumptions
- Touch interactions not optimized
- Small text and buttons on mobile
- No mobile-specific UI patterns

## Acceptance Criteria

### 1. Responsive Layout
- [ ] App works seamlessly on phones (375px+ width)
- [ ] Tablet optimization (768px - 1024px)
- [ ] Adaptive layouts for different screen sizes
- [ ] No horizontal scrolling on mobile
- [ ] Touch-friendly minimum button sizes (44px)

### 2. Mobile-Optimized Components
- [ ] Swipe gestures for card selection
- [ ] Touch-friendly voting interface
- [ ] Collapsible sections for space efficiency
- [ ] Mobile-optimized modals and forms
- [ ] Readable typography on small screens

### 3. Navigation & UX
- [ ] Bottom navigation for key actions
- [ ] Simplified mobile header
- [ ] Gesture-based interactions
- [ ] Mobile-friendly context menus
- [ ] Quick access to common actions

### 4. Performance Optimization
- [ ] Fast loading on mobile networks
- [ ] Optimized images and assets
- [ ] Lazy loading for non-critical components
- [ ] Efficient touch event handling
- [ ] Battery-friendly animations

## Technical Implementation

### Responsive Design System
```typescript
// src/styles/breakpoints.ts
export const breakpoints = {
  sm: '640px',   // Phone landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px'   // Large desktop
} as const;

export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<keyof typeof breakpoints>('lg');
  
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else setBreakpoint('xl');
    };
    
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);
  
  return breakpoint;
};
```

### Mobile Layout Components
```typescript
// src/components/mobile/MobileLayout.tsx
const MobileLayout = ({ children }) => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'sm';
  
  if (!isMobile) return children;
  
  return (
    <div className="mobile-layout">
      <MobileHeader />
      <main className="mobile-main">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
};

// src/components/mobile/MobileHeader.tsx
const MobileHeader = () => {
  const { session, connectionStatus } = useStore();
  
  return (
    <header className="mobile-header">
      <div className="header-content">
        <button className="menu-button">
          <Menu size={24} />
        </button>
        
        <div className="session-info">
          <span className="session-id">{session?.id}</span>
          <ConnectionIndicator status={connectionStatus} />
        </div>
        
        <button className="share-button">
          <Share2 size={24} />
        </button>
      </div>
    </header>
  );
};

// src/components/mobile/MobileBottomNav.tsx
const MobileBottomNav = () => {
  const { isHost, currentView, setCurrentView } = useStore();
  
  const navItems = [
    { id: 'stories', icon: FileText, label: 'Stories' },
    { id: 'voting', icon: Vote, label: 'Vote' },
    { id: 'players', icon: Users, label: 'Players' },
    { id: 'stats', icon: BarChart, label: 'Stats' }
  ];
  
  if (isHost) {
    navItems.push({ id: 'controls', icon: Settings, label: 'Controls' });
  }
  
  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={cn(
            'nav-item',
            currentView === item.id && 'active'
          )}
          onClick={() => setCurrentView(item.id)}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
```

### Mobile Voting Interface
```typescript
// src/components/mobile/MobileVotingCards.tsx
const MobileVotingCards = () => {
  const { cardValues, selectedCard, selectCard } = useStore();
  const [isSwipeMode, setIsSwipeMode] = useState(false);
  
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => selectNextCard(),
    onSwipedRight: () => selectPrevCard(),
    onSwipedUp: () => setIsSwipeMode(!isSwipeMode),
    trackMouse: false,
    trackTouch: true
  });
  
  return (
    <div className="mobile-voting" {...swipeHandlers}>
      <div className="voting-header">
        <h3>Select Your Estimate</h3>
        <button
          className="swipe-mode-toggle"
          onClick={() => setIsSwipeMode(!isSwipeMode)}
        >
          {isSwipeMode ? <Grid3x3 /> : <ArrowLeftRight />}
          {isSwipeMode ? 'Grid' : 'Swipe'}
        </button>
      </div>
      
      {isSwipeMode ? (
        <SwipeCardSelector
          cards={cardValues}
          selectedCard={selectedCard}
          onSelect={selectCard}
        />
      ) : (
        <GridCardSelector
          cards={cardValues}
          selectedCard={selectedCard}
          onSelect={selectCard}
        />
      )}
      
      <div className="voting-actions">
        <button
          className="submit-vote-btn"
          disabled={!selectedCard}
          onClick={() => submitVote(selectedCard)}
        >
          Submit Vote
        </button>
      </div>
    </div>
  );
};

// src/components/mobile/SwipeCardSelector.tsx
const SwipeCardSelector = ({ cards, selectedCard, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(
    cards.findIndex(card => card === selectedCard) || 0
  );
  
  const nextCard = () => {
    const newIndex = (currentIndex + 1) % cards.length;
    setCurrentIndex(newIndex);
    onSelect(cards[newIndex]);
  };
  
  const prevCard = () => {
    const newIndex = currentIndex === 0 ? cards.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onSelect(cards[newIndex]);
  };
  
  return (
    <div className="swipe-card-selector">
      <button className="prev-btn" onClick={prevCard}>
        <ChevronLeft size={32} />
      </button>
      
      <div className="card-display">
        <div className="card-stack">
          {cards.map((card, index) => (
            <motion.div
              key={card}
              className={cn(
                'swipe-card',
                index === currentIndex && 'active'
              )}
              animate={{
                scale: index === currentIndex ? 1 : 0.8,
                opacity: Math.abs(index - currentIndex) <= 1 ? 1 : 0,
                zIndex: cards.length - Math.abs(index - currentIndex)
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {card}
            </motion.div>
          ))}
        </div>
        
        <div className="card-indicator">
          {currentIndex + 1} of {cards.length}
        </div>
      </div>
      
      <button className="next-btn" onClick={nextCard}>
        <ChevronRight size={32} />
      </button>
    </div>
  );
};
```

### Mobile Story Management
```typescript
// src/components/mobile/MobileStoryList.tsx
const MobileStoryList = () => {
  const { stories, currentStory, isHost } = useStore();
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  
  return (
    <div className="mobile-story-list">
      <div className="story-header">
        <h2>Stories</h2>
        {isHost && (
          <button className="add-story-btn">
            <Plus size={20} />
            Add Story
          </button>
        )}
      </div>
      
      <div className="current-story">
        {currentStory && (
          <MobileStoryCard
            story={currentStory}
            isActive={true}
            expanded={expandedStory === currentStory.id}
            onToggle={() => setExpandedStory(
              expandedStory === currentStory.id ? null : currentStory.id
            )}
          />
        )}
      </div>
      
      <div className="story-queue">
        <h3>Upcoming Stories</h3>
        {stories
          .filter(s => s.id !== currentStory?.id)
          .map(story => (
            <MobileStoryCard
              key={story.id}
              story={story}
              isActive={false}
              expanded={expandedStory === story.id}
              onToggle={() => setExpandedStory(
                expandedStory === story.id ? null : story.id
              )}
            />
          ))}
      </div>
    </div>
  );
};

// src/components/mobile/MobileStoryCard.tsx
const MobileStoryCard = ({ story, isActive, expanded, onToggle }) => {
  return (
    <motion.div
      className={cn(
        'mobile-story-card',
        isActive && 'active'
      )}
      layout
    >
      <div className="story-header" onClick={onToggle}>
        <div className="story-info">
          <h4>{story.title}</h4>
          {story.estimate && (
            <span className="estimate-badge">{story.estimate}</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="story-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="story-description">{story.description}</p>
            
            {story.votes && (
              <div className="vote-summary">
                <h5>Votes</h5>
                <div className="vote-chips">
                  {Object.entries(story.votes).map(([playerId, vote]) => (
                    <span key={playerId} className="vote-chip">
                      {vote.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {isActive && (
              <div className="story-actions">
                <button className="action-btn edit">Edit</button>
                <button className="action-btn skip">Skip</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

### Touch Gestures
```typescript
// src/hooks/useSwipeGestures.ts
export const useSwipeGestures = (options: SwipeOptions) => {
  const [touchStart, setTouchStart] = useState<Touch | null>(null);
  const [touchEnd, setTouchEnd] = useState<Touch | null>(null);
  
  const minSwipeDistance = 50;
  
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]);
  };
  
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0]);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = getTouchDistance(touchStart, touchEnd);
    const isLeftSwipe = touchStart.clientX - touchEnd.clientX > minSwipeDistance;
    const isRightSwipe = touchEnd.clientX - touchStart.clientX > minSwipeDistance;
    const isUpSwipe = touchStart.clientY - touchEnd.clientY > minSwipeDistance;
    const isDownSwipe = touchEnd.clientY - touchStart.clientY > minSwipeDistance;
    
    if (isLeftSwipe && options.onSwipeLeft) options.onSwipeLeft();
    if (isRightSwipe && options.onSwipeRight) options.onSwipeRight();
    if (isUpSwipe && options.onSwipeUp) options.onSwipeUp();
    if (isDownSwipe && options.onSwipeDown) options.onSwipeDown();
  };
  
  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};
```

### Responsive Styles
```css
/* Mobile-first responsive design */
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  z-index: 50;
}

.mobile-main {
  flex: 1;
  padding-top: 56px;
  padding-bottom: 72px;
  overflow-y: auto;
}

.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 50;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 12px;
  min-width: 44px;
  min-height: 44px;
}

.nav-item.active {
  color: #3b82f6;
}

/* Touch-friendly cards */
.mobile-voting .voting-card {
  min-width: 60px;
  min-height: 80px;
  font-size: 24px;
  margin: 8px;
}

.swipe-card {
  width: 120px;
  height: 160px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  position: absolute;
}

/* Responsive breakpoints */
@media (max-width: 640px) {
  .desktop-only { display: none; }
  .mobile-only { display: block; }
  
  /* Increase touch targets */
  button { min-height: 44px; }
  input, select { min-height: 44px; }
  
  /* Readable text */
  body { font-size: 16px; }
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 18px; }
}

@media (min-width: 641px) {
  .mobile-only { display: none; }
  .desktop-only { display: block; }
}

/* PWA-friendly viewport */
@supports (padding-top: env(safe-area-inset-top)) {
  .mobile-header {
    padding-top: env(safe-area-inset-top);
    height: calc(56px + env(safe-area-inset-top));
  }
  
  .mobile-main {
    padding-top: calc(56px + env(safe-area-inset-top));
  }
  
  .mobile-bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(72px + env(safe-area-inset-bottom));
  }
}
```

## Performance Optimizations
```typescript
// Lazy loading for mobile
const MobileStats = lazy(() => import('./components/mobile/MobileStats'));
const MobileExport = lazy(() => import('./components/mobile/MobileExport'));

// Optimized touch event handling
const useOptimizedTouchEvents = () => {
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Passive listeners for better performance
  }, []);
  
  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, [handleTouchStart]);
};

// Battery-friendly animations
const mobileAnimationConfig = {
  duration: 0.2,
  ease: 'easeOut'
};
```

## Testing Requirements
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on tablets (iPad, Android tablets)
- [ ] Verify touch gestures work correctly
- [ ] Check readability on small screens
- [ ] Test with slow network connections
- [ ] Verify PWA installation works
- [ ] Test landscape/portrait orientation changes

## Definition of Done
- Application works seamlessly on mobile devices
- Touch interactions are smooth and responsive
- All text is readable without zooming
- Navigation is intuitive on small screens
- Performance is optimized for mobile networks
- PWA features work correctly
- Swipe gestures enhance user experience
- No horizontal scrolling on any screen size
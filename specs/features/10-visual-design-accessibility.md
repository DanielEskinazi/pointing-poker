# Feature 10: Visual Design & Accessibility

## Status: Pending
## Priority: High
## Estimated Effort: Medium

## Problem Statement

Current visual design has critical accessibility and usability issues:

1. **Poor Color Contrast**: Blue buttons on white backgrounds don't meet WCAG AA standards
2. **Timer Visibility**: Critical timer element (05:00) lacks visual prominence and is easily missed
3. **Player State Confusion**: No visual distinction between players who are waiting vs have voted
4. **Accessibility Gaps**: Missing focus indicators, poor screen reader support, inadequate color contrast

## Success Criteria

- [ ] All color combinations meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Timer is visually prominent and impossible to miss
- [ ] Clear visual distinction between different player states
- [ ] Full keyboard navigation with visible focus indicators
- [ ] Screen reader compatible with proper ARIA labels
- [ ] Color-blind friendly design patterns

## Technical Requirements

### Color System Overhaul

1. **Contrast Audit & Fixes**
   - Audit all current color combinations against WCAG AA
   - Create compliant color palette
   - Update CSS custom properties/Tailwind config

2. **Primary Actions**
   - High contrast for CTAs (7:1 ratio minimum)
   - Clear visual hierarchy through contrast
   - Color-independent action identification

3. **State Indicators**
   - Timer: High contrast, larger size, prominent position
   - Player states: Distinct visual treatments beyond color
   - Voting status: Clear patterns, icons, typography

### Accessibility Implementation

1. **Keyboard Navigation**
   - Tab order follows logical flow
   - Visible focus indicators on all interactive elements
   - Escape key handling for modals/overlays
   - Arrow key navigation for card selection

2. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels for all interactive elements
   - Live regions for dynamic content updates
   - Descriptive alt text for visual elements

3. **Motor Accessibility**
   - Larger touch targets (44px minimum)
   - Reduced motion preferences respected
   - Click/tap delays for accidental activation prevention

## Design Specifications

### Updated Color Palette

```scss
// Primary Colors (WCAG AA Compliant)
--primary-blue: #0056D6;      // 4.8:1 on white
--primary-blue-dark: #003B94; // 7.2:1 on white
--primary-blue-light: #E6F2FF; // High contrast background

// Success/Error States
--success-green: #0F7B0F;     // 4.5:1 on white
--error-red: #D12727;         // 4.8:1 on white
--warning-orange: #B45309;    // 4.5:1 on white

// Neutral Colors
--text-primary: #1A1A1A;      // 15.3:1 on white
--text-secondary: #4A4A4A;    // 9.7:1 on white
--text-tertiary: #6B7280;     // 4.5:1 on white

// Background Colors
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
```

### Timer Design

1. **Visual Prominence**
   - Larger font size: `text-2xl` minimum
   - High contrast color: `--error-red` or `--primary-blue-dark`
   - Background highlight or border
   - Fixed position (doesn't scroll away)

2. **State Indicators**
   - Normal: Blue color, steady display
   - Warning (<2 min): Orange color, subtle animation
   - Critical (<30s): Red color, stronger animation
   - Expired: Red background, clear "TIME'S UP" message

### Player Status Indicators

1. **Waiting State**
   - Neutral gray avatar border
   - "Waiting..." text or thinking icon
   - Reduced opacity (70%)

2. **Voted State**
   - Green checkmark overlay
   - Solid green border
   - Full opacity
   - "Voted" text confirmation

3. **Host Indicators**
   - Crown or star icon
   - Distinct border color
   - Special typography treatment

## Implementation Tasks

### Phase 1: Color System
- [ ] Audit all current color combinations for WCAG compliance
- [ ] Create new compliant color palette
- [ ] Update Tailwind config with new color system
- [ ] Replace all non-compliant color usage

### Phase 2: Critical Elements
- [ ] Redesign timer with prominence and state indicators
- [ ] Update primary CTA buttons with high contrast
- [ ] Implement player state visual indicators
- [ ] Add focus indicators for all interactive elements

### Phase 3: Accessibility Features
- [ ] Implement keyboard navigation throughout app
- [ ] Add ARIA labels and semantic markup
- [ ] Create live regions for dynamic updates
- [ ] Add screen reader testing and optimization

### Phase 4: Advanced Accessibility
- [ ] Implement reduced motion preferences
- [ ] Add high contrast mode support
- [ ] Create color-blind friendly alternatives
- [ ] Add skip links and landmark navigation

## Accessibility Checklist

### Visual Design
- [ ] 4.5:1 contrast ratio for normal text
- [ ] 3:1 contrast ratio for large text (18pt+)
- [ ] 3:1 contrast ratio for UI components
- [ ] Information not conveyed by color alone
- [ ] Focus indicators visible on all interactive elements

### Keyboard Navigation
- [ ] All functionality available via keyboard
- [ ] Logical tab order throughout interface
- [ ] Escape key closes modals/overlays
- [ ] Arrow keys navigate similar elements (cards)

### Screen Reader Support
- [ ] Semantic HTML structure (headings, lists, etc.)
- [ ] ARIA labels for all form controls
- [ ] Live regions announce dynamic changes
- [ ] Alternative text for informative images
- [ ] Skip links for main content areas

### Motor Accessibility
- [ ] Touch targets minimum 44px
- [ ] No time-based interactions (except timer feature)
- [ ] Click/drag distance requirements reasonable
- [ ] No content that flashes more than 3 times per second

## Testing Strategy

1. **Automated Testing**
   - axe-core accessibility testing
   - Color contrast validation tools
   - Lighthouse accessibility audit
   - WAVE browser extension validation

2. **Manual Testing**
   - Keyboard-only navigation testing
   - Screen reader testing (NVDA, JAWS, VoiceOver)
   - High contrast mode testing
   - Color blindness simulation

3. **User Testing**
   - Testing with users who have disabilities
   - Assistive technology user feedback
   - Usability testing with accessibility constraints

## Dependencies

- Coordinates with all other UI improvement features
- May require Tailwind config updates
- Could impact existing component styling
- Should align with brand guidelines (if any)

## Success Metrics

- 100% WCAG AA compliance on automated testing
- Successful keyboard-only navigation by test users
- Positive screen reader user feedback
- Improved Lighthouse accessibility scores
- Reduced accessibility-related support requests

## Risks & Mitigation

1. **Risk**: Color changes may impact brand recognition
   - **Mitigation**: Gradual transition, maintain brand personality while improving contrast

2. **Risk**: Accessibility improvements may impact visual design appeal
   - **Mitigation**: Focus on inclusive design principles, accessibility can enhance aesthetics

3. **Risk**: Implementation complexity for full keyboard navigation
   - **Mitigation**: Implement progressively, start with most critical flows

## Implementation Priority

### Critical (Must Have)
- Color contrast fixes for primary actions
- Timer visibility improvements  
- Basic keyboard navigation

### Important (Should Have)
- Player state visual indicators
- Screen reader optimization
- Focus indicator improvements

### Nice to Have (Could Have)
- Advanced accessibility features
- High contrast mode
- Reduced motion preferences

## Notes

Accessibility improvements should be considered foundational rather than optional. They benefit all users, not just those with disabilities, by creating clearer, more usable interfaces.
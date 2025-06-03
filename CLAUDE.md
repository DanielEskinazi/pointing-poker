# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start the development server with hot module replacement
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## Architecture

This is a client-side Planning Poker application built with React, TypeScript, and Vite. It requires no backend and uses the browser's BroadcastChannel API for real-time synchronization across tabs/windows.

### State Management

The application uses Zustand for global state management with a single store pattern in `src/store.ts`. The store handles:

- Session management (create/join via URL parameters)
- Player management (add/remove players, card selection)
- Game state (current story, card reveal, timer)
- Real-time synchronization via BroadcastChannel

Key store actions:

- `createSession()` - Initialize a new session
- `joinSession(sessionId, playerName)` - Join existing session
- `selectCard(playerId, card)` - Player card selection
- `revealCards()` / `resetCards()` - Game flow control

### Component Structure

Components are functional with TypeScript and follow a presentational pattern:

- `App.tsx` - Main component with routing logic (home → join → game flow)
- `components/` - UI components that consume store state
- All components use Framer Motion for animations

### Key Technologies

- **React 18.3** with TypeScript 5.5 (strict mode)
- **Vite 5.4** for fast builds and HMR
- **Tailwind CSS** for styling
- **Zustand 4.5** for state management
- **Framer Motion 11** for animations
- **BroadcastChannel API** for real-time sync (no WebSockets needed)

## Workflow Memories

- Whenever we are done implementing any work that we derive from "/specs" folder, lets move it to "/specs/archive"

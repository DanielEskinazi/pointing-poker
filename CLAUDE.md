# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

- Whenever we create bug tickets, let's add them to the "/specs/bugs" folder, once we complete bugs, let's move that .md file for the bug to "/specs/bugs/archive"
- Whenever we come up with features, let's add them to the "/specs/features" folder, once we complete features, let's move that .md file for the feature to "/specs/features/archive"

## MCP Tools

### GitHub MCP Tool

**Repository Information:**

Default repository: DanielEskinazi/pointing-poker
Use GitHub MCP tools (prefixed with mcp**github**) for all GitHub operations: pull requests, issues, code search, file operations, and repository management. Prefer these over CLI commands.

### Playwright MCP Tool

You have access to Playwright MCP for browser automation. Can navigate pages, interact with elements, take screenshots, extract content, fill forms, and execute JavaScript. Always navigate first, wait for elements to load, use specific selectors, and close browsers when done.

## Logging

Log Structure:

Location: backend/server.log (development) or /app/logs/\*.log (production)
Format: [Timestamp] [Level] [Component] Message {metadata}
Levels: ERROR, WARN, INFO, DEBUG

## 🔍 Logging Analysis Prompt Template

### Quick Start Command

```bash
# Copy this entire block to get instant log insights
echo "=== CURRENT LOG STATUS $(date) ==="
echo "📊 Overview:"
echo "- Total log entries: $(wc -l < backend/server.log 2>/dev/null || echo 'No log file found')"
echo "- Errors today: $(grep -c "$(date '+%Y-%m-%d').*[Ee]rror" backend/server.log 2>/dev/null || echo '0')"
echo "- Warnings today: $(grep -c "$(date '+%Y-%m-%d').*[Ww]arn" backend/server.log 2>/dev/null || echo '0')"
echo ""
echo "🚨 Recent Errors (last 10):"
grep -i "error\|exception\|failed" backend/server.log 2>/dev/null | tail -10 || echo "No errors found"
echo ""
echo "⚡ Performance Snapshot:"
grep -E "\[info\].*HTTP.*ms" backend/server.log 2>/dev/null | \
  awk '{match($0, /([0-9]+)ms/, arr); if(arr[1]) print arr[1]}' | \
  awk 'BEGIN{min=999999} {sum+=$1; count++; if($1>max) max=$1; if($1<min) min=$1} END {if(count>0) print "Requests:", count, "| Avg:", int(sum/count) "ms | Min:", min "ms | Max:", max "ms"; else print "No performance data"}' || echo "No performance metrics found"
```

## For Error Investigation:

### Get error context with timestamps

grep -B 2 -A 2 -i "error\|exception\|failed" backend/server.log | grep -A 4 -B 4 "$(date '+%Y-%m-%d')" | head -50

### Extract slow requests (>1000ms)

grep -E "HTTP.\*[0-9]{4,}ms" backend/server.log | sort -t: -k2 -r | head -20

### Database connection problems

grep -E "(Prisma|postgres|database|connection|timeout)" backend/server.log | grep -i "error\|fail\|timeout" | tail -30

### WebSocket events

grep -E "(websocket|socket\.io|disconnect|reconnect)" backend/server.log | tail -50

### Run this for a complete diagnostic report

(
echo "=== DIAGNOSTIC REPORT $(date) ==="
  echo ""
  echo "📊 24-HOUR SUMMARY"
  echo "────────────────"
  echo "Total Requests: $(grep -c "HTTP" backend/server.log)"
  echo "Error Rate: $(echo "scale=2; $(grep -ci error backend/server.log) * 100 / $(wc -l < backend/server.log)" | bc)%"
  echo ""
  echo "🔴 TOP ERROR TYPES"
  echo "─────────────────"
  grep -i "error\|exception" backend/server.log | sed -E 's/.*\[(ERROR|error)\][ :]*//' | cut -d' ' -f1-5 | sort | uniq -c | sort -nr | head -5
  echo ""
  echo "⚡ PERFORMANCE METRICS"
  echo "────────────────────"
  grep -oE "[0-9]+ms" backend/server.log | sed 's/ms//' | awk '{sum+=$1; sumsq+=$1*$1; n++} END {if(n>0){mean=sum/n; print "Average Response: " int(mean) "ms"; print "Std Deviation: " int(sqrt(sumsq/n - mean*mean)) "ms"}}'
  echo ""
  echo "🔍 RECENT CRITICAL EVENTS"
  echo "───────────────────────"
  grep -E "(CRITICAL|FATAL|ERROR.*failed|timeout|disconnect)" backend/server.log | tail -5
) > log_diagnostic_$(date +%Y%m%d*%H%M%S).txt && echo "Report saved to: log_diagnostic*$(date +%Y%m%d\_%H%M%S).txt"

# 🐳 Docker Development (No Local NPM!)

```bash
# Daily workflow
make up          # Start all services
make logs        # Watch logs (Ctrl+C to exit)
make down        # Stop services

# Fresh start
make clean && make build && make up && make db-migrate && make db-seed

# Quick restart: make down && make up
# Reset database: make db-reset

# Access URLs
Frontend: http://localhost:3001
Backend:  http://localhost:3000
```

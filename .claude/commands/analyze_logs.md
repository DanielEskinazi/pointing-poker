## Logging

> Analyze the logs to and summarize findings.

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

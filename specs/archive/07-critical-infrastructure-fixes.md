# Critical Infrastructure Fixes Plan

## Overview
This document outlines the plan to fix critical database connectivity and performance issues identified through log analysis.

## Issues Identified

### 🚨 Critical Issues

1. **Database Authentication Failure**
   - Error: P1000 - Invalid credentials for `ppuser`
   - Impact: Server cannot start, complete system failure
   - Priority: **CRITICAL**

2. **Performance Degradation**
   - Average response time: 11.4 seconds
   - Standard deviation: 10.3 seconds
   - Priority: **HIGH**

3. **High Error Rate**
   - 21.09% error rate across system
   - Priority: **HIGH**

## Fix Plan

### Phase 1: Database Connectivity (CRITICAL)

#### 1.1 Database Credentials Verification
- [ ] Check environment variables in `.env` files
- [ ] Verify database user `ppuser` exists in PostgreSQL
- [ ] Reset database password if needed
- [ ] Test connection manually using psql

**Files to check:**
- `backend/.env`
- `backend/.env.local`
- `docker-compose.yml`
- `backend/src/config/index.ts`

#### 1.2 Database Server Status
- [ ] Verify PostgreSQL is running
- [ ] Check database server logs
- [ ] Ensure database is accessible on configured port
- [ ] Verify firewall/network connectivity

**Commands to run:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# Or if local installation
brew services list | grep postgresql

# Test connection
psql -h localhost -U ppuser -d planning_poker -c "SELECT 1;"
```

#### 1.3 Database Schema Verification
- [ ] Run Prisma migrations
- [ ] Verify all tables exist
- [ ] Check table permissions for `ppuser`
- [ ] Seed database with test data

**Commands:**
```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### Phase 2: Performance Issues (HIGH)

#### 2.1 Query Performance Analysis
- [ ] Enable query logging in PostgreSQL
- [ ] Identify slow queries (>1000ms)
- [ ] Add missing database indexes
- [ ] Optimize Prisma queries

#### 2.2 Connection Pool Optimization
- [ ] Review Prisma connection pool settings
- [ ] Adjust pool size based on load
- [ ] Configure connection timeouts
- [ ] Implement connection retry logic

**Configuration to review:**
```typescript
// backend/src/database/connection.ts
datasource: {
  connectionLimit: 10,
  pool: {
    timeout: 20000,
    idleTimeout: 30000
  }
}
```

#### 2.3 Application Performance
- [ ] Profile memory usage
- [ ] Check for memory leaks
- [ ] Optimize WebSocket connections
- [ ] Add response time monitoring

### Phase 3: Logging and Monitoring (MEDIUM)

#### 3.1 Improve Error Handling
- [ ] Add structured logging for database errors
- [ ] Implement proper error categorization
- [ ] Add retry mechanisms with exponential backoff
- [ ] Create error alerting system

#### 3.2 Performance Monitoring
- [ ] Add request/response time logging
- [ ] Implement health check endpoints
- [ ] Add database connection monitoring
- [ ] Create performance dashboards

#### 3.3 Log Analysis Tools
- [ ] Set up log rotation
- [ ] Implement log aggregation
- [ ] Add automated log analysis
- [ ] Create alerting for critical errors

## Implementation Steps

### Step 1: Immediate Database Fix
1. **Check Docker Compose Configuration**
   ```bash
   docker-compose down
   docker-compose up -d postgres
   docker logs planning-poker-postgres
   ```

2. **Verify Environment Variables**
   ```bash
   cd backend
   cat .env | grep DATABASE
   ```

3. **Test Database Connection**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

### Step 2: Application Recovery
1. **Clear Node Modules and Reinstall**
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Run Database Migrations**
   ```bash
   npx prisma migrate reset --force
   npx prisma db seed
   ```

3. **Start Application**
   ```bash
   npm run dev
   ```

### Step 3: Performance Validation
1. **Monitor Startup Logs**
   ```bash
   tail -f backend/server.log
   ```

2. **Test API Endpoints**
   ```bash
   curl -X GET http://localhost:3001/api/health
   curl -X GET http://localhost:3001/api/sessions
   ```

3. **Load Testing**
   ```bash
   # Install artillery if not present
   npm install -g artillery
   
   # Run basic load test
   artillery quick --count 10 --num 5 http://localhost:3001/api/health
   ```

## Success Criteria

### Database Connectivity
- [ ] Server starts without database errors
- [ ] All API endpoints respond successfully
- [ ] Database queries execute in <100ms
- [ ] Connection pool maintains stable connections

### Performance
- [ ] Average response time <500ms
- [ ] Error rate <1%
- [ ] Memory usage stable
- [ ] WebSocket connections stable

### Monitoring
- [ ] Structured logs with proper levels
- [ ] Health check endpoint responds
- [ ] Performance metrics collected
- [ ] Error alerts configured

## Risk Mitigation

### Backup Plan
1. **Database Backup**
   ```bash
   docker exec planning-poker-postgres pg_dump -U ppuser planning_poker > backup.sql
   ```

2. **Configuration Backup**
   ```bash
   cp backend/.env backend/.env.backup
   cp docker-compose.yml docker-compose.yml.backup
   ```

### Rollback Strategy
1. If fixes fail, restore from backup
2. Use Docker Compose to reset environment
3. Restore previous working configuration

## Timeline

- **Phase 1**: 2-4 hours (immediate fix)
- **Phase 2**: 1-2 days (performance optimization)
- **Phase 3**: 2-3 days (monitoring implementation)

## Next Steps

1. Begin with Phase 1 database connectivity fixes
2. Validate each step before proceeding
3. Document all changes made
4. Monitor system stability after each phase
5. Move completed plan to specs/archive/ when done
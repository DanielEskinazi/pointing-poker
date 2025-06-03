# Story 10: CI/CD and Deployment Pipeline

## Summary
Set up continuous integration and deployment pipeline using GitHub Actions, including automated testing, building, and deployment to a cloud platform (Vercel/Railway/Fly.io).

## Acceptance Criteria
- [ ] GitHub Actions workflow for CI/CD
- [ ] Automated testing on pull requests
- [ ] Build verification for both frontend and backend
- [ ] Automated deployment to staging on merge
- [ ] Production deployment with manual approval
- [ ] Environment secrets management
- [ ] Database migration automation
- [ ] Rollback capability
- [ ] Deployment status notifications

## Technical Details

### GitHub Actions Workflow Structure
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  NODE_VERSION: '20'
  POSTGRES_VERSION: '15'

jobs:
  # Lint and type check
  lint:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci --workspace=frontend
          npm ci --workspace=backend
      
      - name: Run ESLint
        run: |
          npm run lint --workspace=frontend
          npm run lint --workspace=backend
      
      - name: TypeScript type check
        run: |
          npm run type-check --workspace=frontend
          npm run type-check --workspace=backend

  # Test job
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: planning_poker_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci --workspace=frontend
          npm ci --workspace=backend
      
      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/planning_poker_test
        run: |
          npm run migrate --workspace=backend
      
      - name: Run backend tests
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/planning_poker_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
        run: |
          npm run test:ci --workspace=backend
      
      - name: Run frontend tests
        run: |
          npm run test:ci --workspace=frontend
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # Build job
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci --workspace=frontend
          npm ci --workspace=backend
      
      - name: Build frontend
        run: |
          npm run build --workspace=frontend
        env:
          VITE_API_URL: ${{ secrets.STAGING_API_URL }}
          VITE_WS_URL: ${{ secrets.STAGING_WS_URL }}
      
      - name: Build backend
        run: |
          npm run build --workspace=backend
      
      - name: Upload frontend artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-dist
          path: frontend/dist
      
      - name: Upload backend artifacts
        uses: actions/upload-artifact@v3
        with:
          name: backend-dist
          path: backend/dist

  # Deploy to staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.planningpoker.app
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
      
      - name: Deploy backend to Railway
        uses: railwayapp/deploy-action@v1
        with:
          service_id: ${{ secrets.RAILWAY_SERVICE_ID }}
          api_token: ${{ secrets.RAILWAY_API_TOKEN }}
          environment: staging
      
      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          alias-domains: staging.planningpoker.app
      
      - name: Run database migrations
        run: |
          npm run migrate:deploy --workspace=backend
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  # Deploy to production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://planningpoker.app
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
      
      - name: Create deployment
        uses: chrnorm/deployment-action@v2
        id: deployment
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: production
      
      - name: Deploy backend to Railway
        uses: railwayapp/deploy-action@v1
        with:
          service_id: ${{ secrets.RAILWAY_PROD_SERVICE_ID }}
          api_token: ${{ secrets.RAILWAY_API_TOKEN }}
          environment: production
      
      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROD_PROJECT_ID }}
          vercel-args: '--prod'
          alias-domains: |
            planningpoker.app
            www.planningpoker.app
      
      - name: Run database migrations
        run: |
          npm run migrate:deploy --workspace=backend
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      
      - name: Update deployment status
        if: always()
        uses: chrnorm/deployment-status@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          state: ${{ job.status }}
          deployment-id: ${{ steps.deployment.outputs.deployment_id }}
```

### Database Migration Workflow
```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        type: choice
        options:
          - staging
          - production
      migration:
        description: 'Migration command'
        required: true
        default: 'migrate:latest'

jobs:
  migrate:
    name: Run Migration
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci --workspace=backend
      
      - name: Run migration
        run: |
          npm run ${{ inputs.migration }} --workspace=backend
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Notify completion
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Migration ${{ inputs.migration }} completed on ${{ inputs.environment }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Rollback Workflow
```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version/commit to rollback to'
        required: true

jobs:
  rollback:
    name: Rollback to ${{ inputs.version }}
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}
      
      - name: Rollback backend
        run: |
          # Railway rollback command
          echo "Rolling back to ${{ inputs.version }}"
      
      - name: Rollback frontend
        run: |
          # Vercel rollback command
          echo "Rolling back to ${{ inputs.version }}"
      
      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Rollback to ${{ inputs.version }} completed on ${{ inputs.environment }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Environment Configuration
```yaml
# .github/environments/staging.yml
name: staging
protection_rules:
  required_reviewers: 1
  
secrets:
  STAGING_API_URL
  STAGING_WS_URL
  STAGING_DATABASE_URL
  RAILWAY_SERVICE_ID
  VERCEL_PROJECT_ID

# .github/environments/production.yml  
name: production
protection_rules:
  required_reviewers: 2
  environment_url: https://planningpoker.app
  
secrets:
  PRODUCTION_API_URL
  PRODUCTION_WS_URL
  PRODUCTION_DATABASE_URL
  RAILWAY_PROD_SERVICE_ID
  VERCEL_PROD_PROJECT_ID
```

### Backend Deployment Configuration
```javascript
// backend/railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ALWAYS"
  }
}

// backend/package.json scripts
{
  "scripts": {
    "start:prod": "node dist/server.js",
    "migrate:deploy": "node dist/database/migrate.js",
    "migrate:latest": "npm run migrate:deploy -- latest",
    "migrate:rollback": "npm run migrate:deploy -- rollback"
  }
}
```

### Frontend Deployment Configuration
```json
// frontend/vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Health Check Endpoint
```typescript
// backend/src/routes/health.ts
import { Router } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

const router = Router();

router.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'checking',
    redis: 'checking',
    timestamp: new Date().toISOString()
  };
  
  try {
    // Check database
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }
  
  try {
    // Check Redis
    await redis.ping();
    checks.redis = 'ok';
  } catch (error) {
    checks.redis = 'error';
  }
  
  const allHealthy = Object.values(checks).every(
    status => status === 'ok' || typeof status === 'string'
  );
  
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

### Monitoring Integration
```yaml
# .github/workflows/monitoring.yml
name: Setup Monitoring

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types: [completed]
    branches: [main]

jobs:
  setup-monitoring:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - name: Configure Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.sha }}
      
      - name: Create Datadog Deployment Event
        run: |
          curl -X POST "https://api.datadoghq.com/api/v1/events" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: ${{ secrets.DATADOG_API_KEY }}" \
            -d '{
              "title": "Deployment to Production",
              "text": "Version ${{ github.sha }} deployed",
              "tags": ["environment:production", "service:planning-poker"]
            }'
```

## Implementation Steps
1. Set up GitHub repository secrets
2. Create workflow files
3. Configure deployment platforms
4. Set up environment protection rules
5. Implement health check endpoints
6. Configure monitoring integrations
7. Test deployment pipeline
8. Document deployment process
9. Set up rollback procedures

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 6-8 hours

## Dependencies
- GitHub repository access
- Cloud platform accounts (Vercel/Railway)
- Domain name configured
- SSL certificates

## Testing Requirements
- CI runs on all pull requests
- Tests pass before deployment
- Staging deployment works
- Production deployment requires approval
- Rollback procedure tested
- Health checks functional
- Monitoring alerts configured

## Definition of Done
- [ ] GitHub Actions workflows created
- [ ] All tests automated
- [ ] Deployment to staging automatic
- [ ] Production deployment with approval
- [ ] Environment secrets configured
- [ ] Rollback procedure documented
- [ ] Monitoring integrated
- [ ] Documentation complete
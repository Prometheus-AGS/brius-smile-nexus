# Mastra Production Agent Deployment Guide

## Overview
This document provides comprehensive guidance for deploying the Mastra business intelligence agent to production, including configuration, validation, and rollback procedures.

## Pre-Deployment Checklist

### ✅ Configuration Requirements
- [ ] Production Mastra server running at `https://mastra.brius.com`
- [ ] Valid API key obtained from Mastra server
- [ ] Environment variables configured in `.env`
- [ ] Feature flags set for production deployment
- [ ] SSL certificates valid for HTTPS communication

### ✅ Code Requirements
- [ ] `src/services/mastra/mastra-config.ts` created with production settings
- [ ] Mastra client updated with retry logic and error handling
- [ ] Feature flags configured to enable agent for all users
- [ ] Migration bridge updated with production configuration
- [ ] Connectivity test utility available for validation

### ✅ Dependencies
- [ ] All Mastra packages up to date (`@mastra/client-js`, `@mastra/core`, etc.)
- [ ] TypeScript compilation successful with no errors
- [ ] ESLint validation passing
- [ ] Build process completing successfully

## Environment Configuration

### Required Environment Variables
```bash
# Mastra Production Configuration
VITE_MASTRA_SERVER_URL=https://mastra.brius.com
VITE_MASTRA_API_KEY=your-production-api-key-here
VITE_MASTRA_AGENT_ID=business-intelligence-agent

# Mastra Feature Flags (Production Settings)
VITE_MASTRA_ENABLED=true
VITE_MASTRA_FALLBACK_ENABLED=true
VITE_MASTRA_DEBUG=false
VITE_MASTRA_USER_CONTEXT_ENABLED=true
VITE_MASTRA_MEMORY_PERSISTENCE_ENABLED=true
```

### Security Considerations
- **API Key Security**: Store API key securely, never commit to version control
- **HTTPS Only**: All communication must use HTTPS in production
- **Environment Isolation**: Use separate API keys for development/staging/production
- **Access Control**: Implement proper authentication before agent access

## Deployment Steps

### 1. Pre-Deployment Validation
```bash
# Run connectivity tests
yarn dev
# In browser console:
import { runConnectivityTest } from '/src/utils/mastra-connectivity-test';
runConnectivityTest().then(console.log);
```

### 2. Environment Setup
1. Update `.env` file with production values
2. Replace `your-production-api-key-here` with actual API key
3. Verify all environment variables are set correctly
4. Test environment variable loading

### 3. Build and Deploy
```bash
# Build for production
yarn build

# Verify build artifacts
ls -la dist/

# Deploy to production environment
# (deployment method depends on your hosting platform)
```

### 4. Post-Deployment Validation
1. **Health Check**: Verify `/health` endpoint responds correctly
2. **Agent Info**: Confirm agent information retrieval works
3. **User Context**: Test user context creation and management
4. **Basic Interaction**: Test simple agent query/response
5. **Feature Flags**: Verify feature flags are working correctly

## Validation Commands

### Manual Testing
```javascript
// In browser console after deployment:

// 1. Check configuration status
import { configurationStatus } from '/src/services/mastra';
console.log('Configuration:', configurationStatus);

// 2. Run connectivity test
import { runConnectivityTest } from '/src/utils/mastra-connectivity-test';
const result = await runConnectivityTest();
console.log('Connectivity Test:', result);

// 3. Quick health check
import { quickHealthCheck } from '/src/utils/mastra-connectivity-test';
const health = await quickHealthCheck();
console.log('Health Check:', health);

// 4. Test agent interaction
import { testAgentInteraction } from '/src/utils/mastra-connectivity-test';
const interaction = await testAgentInteraction();
console.log('Agent Interaction:', interaction);
```

### Expected Results
- **Configuration**: `isValid: true`, no errors
- **Connectivity**: `passed: true`, response time < 5000ms
- **Agent Info**: Valid agent data with capabilities list
- **User Context**: Context creation and retrieval successful
- **Health Check**: `healthy: true`
- **Agent Interaction**: Successful response from agent

## Feature Flag Management

### Production Settings
```typescript
const productionFlags: BIFeatureFlags = {
  useMastraAgent: true,           // Enable for all users
  enableUserContext: true,        // User personalization
  enableMemoryPersistence: true,  // Session persistence
  fallbackToLegacy: true,         // Safety fallback
  debugMode: false,               // Disable debug in production
};
```

### Gradual Rollout (Alternative)
If you prefer gradual rollout instead of immediate full deployment:

```typescript
// Enable for percentage of users
const rolloutPercentage = 10; // Start with 10%
const shouldEnableForUser = (userId: string) => {
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash) % 100 < rolloutPercentage;
};
```

## Monitoring and Observability

### Key Metrics to Monitor
1. **Agent Response Time**: Average < 5 seconds
2. **Success Rate**: > 95% successful responses
3. **Error Rate**: < 5% of requests
4. **Fallback Usage**: Monitor legacy system usage
5. **User Adoption**: Track agent usage vs legacy system

### Logging Configuration
- **Production Logging**: Structured JSON logs
- **Error Tracking**: Comprehensive error capture
- **Performance Metrics**: Response times and throughput
- **User Analytics**: Usage patterns and preferences

## Rollback Procedures

### Immediate Rollback (Emergency)
```bash
# 1. Disable Mastra agent via environment
export VITE_MASTRA_ENABLED=false

# 2. Or disable via feature flags in application
# In browser console:
import { featureFlagsManager } from '/src/services/feature-flags';
featureFlagsManager.disableMastraAgent();

# 3. Rebuild and redeploy if necessary
yarn build
```

### Gradual Rollback
```javascript
// Reduce rollout percentage gradually
featureFlagsManager.updateFlags({
  useMastraAgent: false, // Disable for new users
  fallbackToLegacy: true, // Ensure fallback works
});
```

### Complete Rollback
1. Set `VITE_MASTRA_ENABLED=false` in environment
2. Rebuild application: `yarn build`
3. Deploy updated build
4. Verify all users are using legacy system
5. Monitor for any residual issues

## Troubleshooting

### Common Issues

#### 1. API Key Authentication Errors
**Symptoms**: 401/403 errors from Mastra server
**Solution**: 
- Verify API key is correct
- Check API key permissions
- Ensure proper Authorization header format

#### 2. Network Connectivity Issues
**Symptoms**: Timeout errors, connection refused
**Solution**:
- Verify server URL is correct
- Check firewall/network policies
- Validate SSL certificate

#### 3. Agent Not Responding
**Symptoms**: Empty responses, timeout errors
**Solution**:
- Check agent status on Mastra server
- Verify agent ID configuration
- Review server logs for errors

#### 4. Feature Flags Not Working
**Symptoms**: Agent not enabled despite configuration
**Solution**:
- Clear localStorage: `localStorage.clear()`
- Reset feature flags: `featureFlagsManager.resetToEnvironment()`
- Verify environment variable loading

### Debug Mode
Enable debug mode for troubleshooting:
```bash
VITE_MASTRA_DEBUG=true
```

This will provide detailed logging for:
- API requests and responses
- Retry attempts and failures
- Feature flag changes
- User context operations

## Success Criteria

### Deployment Success Indicators
- [ ] All connectivity tests pass
- [ ] Agent responds to test queries within 5 seconds
- [ ] User context creation works correctly
- [ ] Feature flags respond to changes
- [ ] Fallback to legacy system works when needed
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser
- [ ] Health check endpoint returns healthy status

### Performance Benchmarks
- **Response Time**: < 5 seconds for typical queries
- **Availability**: > 99.5% uptime
- **Error Rate**: < 1% of requests
- **Fallback Rate**: < 5% of requests use fallback

## Post-Deployment Monitoring

### Week 1: Intensive Monitoring
- Monitor every 15 minutes for first 24 hours
- Check error rates and response times hourly
- Review user feedback and support tickets
- Validate fallback system usage

### Week 2-4: Standard Monitoring
- Daily health checks
- Weekly performance reviews
- Monthly user satisfaction surveys
- Quarterly system optimization reviews

## Contact Information

### Support Escalation
- **Level 1**: Application logs and basic troubleshooting
- **Level 2**: Mastra server administration and configuration
- **Level 3**: Infrastructure and network connectivity issues

### Documentation Updates
This document should be updated after:
- Configuration changes
- New features or capabilities
- Performance optimizations
- Security updates
- Lessons learned from incidents
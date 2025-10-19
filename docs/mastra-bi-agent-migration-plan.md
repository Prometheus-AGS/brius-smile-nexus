# Mastra Business Intelligence Agent Migration Plan

## Overview

This document outlines the migration from the current custom BI analytics system to the improved Mastra business intelligence agent. The migration uses a gradual, feature-flag-controlled approach to ensure zero downtime and maintain backward compatibility.

## Architecture Summary

### Current System
- Custom BI analytics hooks ([`use-bi-analytics.ts`](../src/hooks/use-bi-analytics.ts))
- BI dashboard and query builder components with manual tracking
- Custom Langfuse integration for observability
- Zustand stores for state management

### Target System
- Mastra business intelligence agent running on server
- Client-side communication via REST API
- User context and session management
- Per-user memory persistence
- Enhanced observability and performance tracking

## Migration Components Built

### ✅ Core Infrastructure
1. **Mastra Client Service** ([`mastra-client.ts`](../src/services/mastra/mastra-client.ts))
   - REST API client for communicating with Mastra server
   - Streaming support for real-time responses
   - Health check and error handling

2. **User Context Manager** ([`user-context-manager.ts`](../src/services/mastra/user-context-manager.ts))
   - Supabase user ID integration
   - Session management and persistence
   - User preference tracking

3. **Migration Bridge** ([`bi-migration-bridge.ts`](../src/services/mastra/bi-migration-bridge.ts))
   - Gradual transition between legacy and Mastra systems
   - Feature flag-controlled routing
   - Fallback mechanisms

4. **Type Definitions** ([`mastra-agent.ts`](../src/types/mastra-agent.ts))
   - Complete TypeScript interfaces
   - Request/response types
   - User context and configuration types

5. **Feature Flags Service** ([`feature-flags.ts`](../src/services/feature-flags.ts))
   - Environment-based configuration
   - Runtime flag management
   - Persistence and change notifications

6. **Migration Utilities** ([`migration-helpers.ts`](../src/utils/migration-helpers.ts))
   - Data transformation functions
   - Compatibility validation
   - Performance comparison tools

7. **React Hook** ([`use-mastra-bi-agent.ts`](../src/hooks/use-mastra-bi-agent.ts))
   - Clean component interface
   - Error handling and loading states
   - Feature flag integration

## Environment Configuration

### Required Environment Variables
```bash
# Mastra Server Configuration
VITE_MASTRA_SERVER_URL=http://localhost:4111
VITE_MASTRA_API_KEY=your-mastra-api-key-here
VITE_MASTRA_AGENT_ID=business-intelligence-agent

# Mastra Feature Flags
VITE_MASTRA_ENABLED=false
VITE_MASTRA_FALLBACK_ENABLED=true
VITE_MASTRA_DEBUG=false
```

## Migration Strategy

### Phase 1: Infrastructure Setup ✅ COMPLETED
- [x] Install Mastra dependencies
- [x] Create client service and user context management
- [x] Implement migration bridge with feature flags
- [x] Set up type definitions and utilities

### Phase 2: Component Migration (NEXT STEPS)
- [ ] Migrate BI Dashboard component
- [ ] Migrate BI Query Builder component
- [ ] Update component imports and dependencies
- [ ] Test component functionality with both systems

### Phase 3: Gradual Rollout
- [ ] Enable Mastra agent for development environment
- [ ] A/B test with subset of users
- [ ] Monitor performance and error rates
- [ ] Gradually increase Mastra agent usage

### Phase 4: Legacy System Deprecation
- [ ] Disable legacy system for new users
- [ ] Migrate remaining users to Mastra agent
- [ ] Remove legacy code and dependencies
- [ ] Update documentation

## Component Migration Guide

### For BI Dashboard Component

**Current Usage:**
```typescript
const {
  loadDashboard,
  refreshDashboard,
  executeQuery,
  generateReport,
} = useBIAnalytics();
```

**New Usage:**
```typescript
const {
  loadDashboard,
  executeQuery,
  generateReport,
  currentSource, // 'mastra' | 'legacy'
  isHealthy,
} = useMastraBIAgent();
```

### For BI Query Builder Component

**Current Usage:**
```typescript
const {
  executeQuery,
  executeBatch,
  analyzeData,
} = useBIAnalytics();
```

**New Usage:**
```typescript
const {
  executeQuery,
  generateReport, // Replaces executeBatch and analyzeData
  updateUserPreferences,
} = useMastraBIAgent();
```

## User Context Integration

### User Context Structure
```typescript
interface UserBIContext {
  userId: string;           // Supabase user ID
  name?: string;           // User display name
  company?: string;        // Company name
  role?: string;           // User role
  department?: string;     // Department
  sessionId: string;       // Unique session identifier
  
  analyticalPreferences: {
    focusAreas: string[];           // Areas of analytical focus
    defaultTimeRange: string;       // Default time range for queries
    preferredChartTypes: string[];  // Preferred visualization types
    reportingStyle: 'summary' | 'detailed' | 'executive';
  };
  
  businessContext: {
    industry?: string;              // Industry context
    keyMetrics: string[];          // Important business metrics
    reportingFrequency: string;    // How often reports are needed
    complianceRequirements: string[]; // Compliance needs
  };
}
```

### Memory Persistence
- User context is automatically persisted to session storage
- Agent memory is maintained server-side with user/session identification
- Context is restored on page refresh and new sessions

## Feature Flag Management

### Available Flags
- `useMastraAgent`: Enable/disable Mastra agent usage
- `enableUserContext`: Enable user context tracking
- `enableMemoryPersistence`: Enable memory persistence
- `fallbackToLegacy`: Enable fallback to legacy system on errors
- `debugMode`: Enable debug logging and information

### Runtime Control
```typescript
const { 
  enableMastraAgent, 
  disableMastraAgent, 
  updateFeatureFlags 
} = useMastraBIAgent();

// Enable Mastra agent
enableMastraAgent();

// Update specific flags
updateFeatureFlags({ 
  debugMode: true,
  fallbackToLegacy: false 
});
```

## Error Handling and Fallback

### Automatic Fallback
- If Mastra agent fails and `fallbackToLegacy` is enabled, requests automatically route to legacy system
- Error tracking and performance comparison between systems
- Health monitoring for both systems

### Manual Fallback
- Components can manually disable Mastra agent
- Feature flags can be updated at runtime
- Migration status tracking for debugging

## Performance Monitoring

### Built-in Metrics
- Response time comparison between systems
- Error rate tracking
- Cache hit rates
- System health monitoring

### Migration Status Tracking
- Per-component migration status
- Performance comparisons
- Error logs and recovery actions
- Overall system health assessment

## Testing Strategy

### Component Testing
1. Test components with legacy system (baseline)
2. Enable Mastra agent and test same functionality
3. Compare performance and accuracy
4. Test fallback scenarios
5. Validate user context persistence

### Integration Testing
1. Test user context creation and persistence
2. Test session management across page refreshes
3. Test feature flag changes at runtime
4. Test error scenarios and fallback behavior

## Deployment Checklist

### Pre-Deployment
- [ ] Mastra server is running and accessible
- [ ] Business intelligence agent is deployed on server
- [ ] Environment variables are configured
- [ ] Feature flags are set to safe defaults (Mastra disabled)

### Deployment
- [ ] Deploy client application with migration infrastructure
- [ ] Verify legacy system still works
- [ ] Test Mastra agent connectivity
- [ ] Enable Mastra agent for development/staging

### Post-Deployment
- [ ] Monitor error rates and performance
- [ ] Gradually enable Mastra agent for users
- [ ] Collect feedback and performance data
- [ ] Plan legacy system deprecation

## Rollback Plan

### Immediate Rollback
1. Set `VITE_MASTRA_ENABLED=false` in environment
2. Restart application
3. All traffic routes to legacy system

### Gradual Rollback
1. Use feature flags to disable Mastra agent
2. Monitor system stability
3. Investigate and fix issues
4. Re-enable when ready

## Next Steps

1. **Complete Component Migration**
   - Update BI dashboard component to use [`useMastraBIAgent()`](../src/hooks/use-mastra-bi-agent.ts)
   - Update BI query builder component
   - Test functionality with both systems

2. **Enable Gradual Rollout**
   - Set up monitoring and alerting
   - Create user feedback collection
   - Plan phased rollout schedule

3. **Performance Optimization**
   - Optimize API calls and caching
   - Implement request batching if needed
   - Monitor and tune performance

4. **Documentation and Training**
   - Update user documentation
   - Create troubleshooting guides
   - Train team on new system

## Success Metrics

- **Functionality**: All existing BI features work with Mastra agent
- **Performance**: Response times equal or better than legacy system
- **Reliability**: Error rates below 1%
- **User Experience**: Seamless transition with enhanced capabilities
- **Memory**: User context and preferences properly maintained

## Support and Troubleshooting

### Debug Information
- Feature flag status: `useMastraBIAgent().getFeatureFlags()`
- Migration status: `migrationStatusTracker.getMigrationSummary()`
- System health: `useMastraBIAgent().checkHealth()`
- User context: `useMastraBIAgent().getCurrentUserContext()`

### Common Issues
1. **Mastra server not accessible**: Check `VITE_MASTRA_SERVER_URL`
2. **User context not persisting**: Check localStorage availability
3. **Performance degradation**: Enable fallback and investigate
4. **Type errors**: Ensure all type definitions are up to date

This migration plan provides a comprehensive, safe approach to transitioning to the enhanced Mastra business intelligence agent while maintaining full backward compatibility and providing robust error handling.
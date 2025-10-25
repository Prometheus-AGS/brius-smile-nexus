# Mastra Best Practices - Quick Reference

**Last Updated**: 2025-01-25  
**Source**: brius-mastra-final (Architecture Grade: A-, 90/100)  
**For Detailed Patterns**: See [`mastra-integration-patterns.md`](./mastra-integration-patterns.md)

## Quick Navigation

1. [Type System](#1-type-system)
2. [Agent Context](#2-agent-context)
3. [Memory Architecture](#3-memory-architecture)
4. [Error Handling](#4-error-handling)
5. [State Management](#5-state-management)
6. [Security](#6-security)

---

## 1. Type System

### ✅ DO: Central Type Exports

```typescript
// src/types/index.ts - Single source of truth
export * from './agent-context';
export * from './memory';
export * from './ai-agent';
```

### ❌ DON'T: Duplicate Types

Never create the same type in multiple files. Always check `src/types/` first.

---

## 2. Agent Context

### ✅ DO: Use AgentInputContext

```typescript
import { AgentInputContext } from '@/types/agent-context';

async function executeAgent(
  request: AgentRequest,
  context: AgentInputContext  // Standardized context
) {
  // Access user info
  console.log(context.userId, context.roles, context.permissions);
  
  // Check permissions
  if (hasPermission(context, 'analytics', 'query')) {
    // Execute analytics query
  }
}
```

### ✅ DO: Process Supabase Auth Correctly

```typescript
import { processSupabaseAuth } from '@/lib/agent-context-processor';

const result = await processSupabaseAuth(user, session, {
  sessionId: 'session-123',
  applicationName: 'brius-dashboard',
  streaming: true,
});

const context = result.context; // AgentInputContext
```

---

## 3. Memory Architecture

### ✅ DO: Use Dual Memory System

```typescript
// User-scoped memory (personal preferences)
interface UserMemory {
  id: string;
  userId: string;  // Belongs to specific user
  content: string;
  category?: MemoryCategory;
  embedding?: number[]; // For semantic search
}

// Global memory (organizational knowledge)
interface GlobalMemory {
  id: string;
  createdBy: string;
  content: string;
  accessControl?: string[]; // Role-based access
  embedding?: number[];
}
```

### ✅ DO: Implement Semantic Search

```typescript
interface MemorySearchParams {
  query: string;
  scope: 'user' | 'global' | 'all';
  threshold: number; // 0-1 similarity score
  limit: number;
}
```

---

## 4. Error Handling

### ✅ DO: Use Circuit Breaker for External Calls

```typescript
import { executeAgentCallWithProtection } from '@/lib/error-handling';

// Automatic circuit breaker protection
const result = await executeAgentCallWithProtection(
  'business-intelligence',
  () => agent.generate(input),
  () => fallbackAgent.generate(input) // Optional fallback
);
```

### ✅ DO: Implement Graceful Degradation

```typescript
import { executeWithFallback } from '@/lib/error-handling';

const result = await executeWithFallback({
  primary: () => fetchFromPrimaryAPI(),
  fallback: () => fetchFromCache(),
  secondaryFallback: () => fetchFromBackup(),
});

if (result.success) {
  console.log(`Data from: ${result.source}`); // 'primary' | 'fallback' | 'secondary_fallback'
}
```

### ✅ DO: Use Retry Logic

```typescript
import { executeWithRetry, isRetryableError } from '@/lib/error-handling';

const data = await executeWithRetry(
  () => fetchData(),
  {
    maxRetries: 3,
    initialBackoffMs: 1000,
    isRetryable: isRetryableError, // Network, timeout, rate limit, server errors
  }
);
```

---

## 5. State Management

### ✅ DO: Hook-Based Store Access (MANDATORY)

```typescript
// Custom hook orchestrates data loading
const useAgentData = () => {
  const data = useStore(state => state.data);
  const isLoading = useStore(state => state.isLoading);
  const error = useStore(state => state.error);
  const fetch = useStore(state => state.fetchData);
  
  useEffect(() => {
    if (!data) fetch();
  }, [data, fetch]);
  
  return { data, isLoading, error };
};

// Component stays pure
const Component = () => {
  const { data, isLoading, error } = useAgentData();
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <div>{data}</div>;
};
```

### ❌ DON'T: Direct Store Access in Components

```typescript
// FORBIDDEN - Never do this
const Component = () => {
  const data = useStore(state => state.data);
  const fetchData = useStore(state => state.fetchData);
  
  useEffect(() => {
    fetchData(); // Data orchestration in component - WRONG!
  }, []);
  
  return <div>{data}</div>;
};
```

---

## 6. Security

### ✅ DO: Validate Permissions

```typescript
import { hasPermission, validateRequiredPermissions } from '@/types/agent-context';

// Single permission check
if (hasPermission(context, 'analytics', 'query')) {
  // Execute query
}

// Multiple permission check
const validation = validateRequiredPermissions(context, [
  { resource: 'analytics', action: 'query' },
  { resource: 'reports', action: 'create' },
]);

if (!validation.valid) {
  throw new Error(`Missing permissions: ${validation.missing.join(', ')}`);
}
```

### ✅ DO: Handle Anonymous Users

```typescript
import { isAnonymousContext, DEFAULT_ANONYMOUS_PERMISSIONS } from '@/types/agent-context';

if (isAnonymousContext(context)) {
  // Apply restrictions
  return restrictedResponse;
}
```

---

## Common Patterns

### Pattern 1: Agent Call with Full Protection

```typescript
import { executeAgentCallWithProtection } from '@/lib/error-handling';
import { processSupabaseAuth } from '@/lib/agent-context-processor';

async function callAgent(user: User, session: Session, query: string) {
  // 1. Process context
  const { context } = await processSupabaseAuth(user, session);
  
  // 2. Validate permissions
  if (!hasPermission(context, 'analytics', 'query')) {
    throw new Error('Insufficient permissions');
  }
  
  // 3. Execute with circuit breaker
  return executeAgentCallWithProtection(
    'business-intelligence',
    () => agent.generate({ query }, context),
    () => fallbackAgent.generate({ query }, context)
  );
}
```

### Pattern 2: Memory Search with Context

```typescript
interface MemorySearchParams {
  query: string;
  userId: string;
  scope: 'user' | 'global' | 'all';
  threshold: 0.7; // Similarity threshold
  limit: 10;
}

const memories = await searchMemories(params);
```

### Pattern 3: Permission-Based UI Rendering

```typescript
const Component = () => {
  const { data, context } = useAgentData();
  
  return (
    <div>
      {hasPermission(context, 'analytics', 'export') && (
        <Button onClick={exportData}>Export</Button>
      )}
      {isAdmin(context) && (
        <AdminPanel />
      )}
    </div>
  );
};
```

---

## Implementation Checklist

### For New Agent Integration

- [ ] Import `AgentInputContext` from `@/types/agent-context`
- [ ] Use `processSupabaseAuth()` to create context
- [ ] Validate permissions before execution
- [ ] Wrap external calls with circuit breaker
- [ ] Implement fallback strategies
- [ ] Add proper error handling
- [ ] Log important operations
- [ ] Test with anonymous users

### For New Memory Features

- [ ] Define user-scoped and global types
- [ ] Implement semantic search capability
- [ ] Add category and importance fields
- [ ] Plan for pgvector embeddings
- [ ] Create list/search/update/delete operations
- [ ] Implement access control for global memories
- [ ] Add bulk operations support

### For Error Handling

- [ ] Use circuit breaker for external services
- [ ] Implement exponential backoff retry
- [ ] Add graceful degradation
- [ ] Classify errors appropriately
- [ ] Log errors with context
- [ ] Provide user-friendly error messages
- [ ] Test failure scenarios

---

## Quick Commands

### Create Agent Context

```typescript
// From Supabase auth
const result = await processSupabaseAuth(user, session);
const context = result.context;

// For testing
const testContext = createTestContext({ roles: ['admin'] });

// Anonymous
const anonContext = createAnonymousContext('session-id');
```

### Check Permissions

```typescript
// Single check
const canQuery = hasPermission(context, 'analytics', 'query');

// Multiple checks
const { valid, missing } = validateRequiredPermissions(context, [
  { resource: 'analytics', action: 'query' },
]);

// Is admin
const admin = isAdmin(context);
```

### Circuit Breaker Usage

```typescript
// Agent call
await executeAgentCallWithProtection('agent-name', () => call(), () => fallback());

// Database call
await executeDatabaseCallWithProtection('operation', () => query());

// External API
await executeExternalAPIWithProtection('api-name', () => fetch());
```

---

## File Locations

| Component | File Path |
|-----------|-----------|
| Agent Context Types | `src/types/agent-context.ts` |
| Memory Types | `src/types/memory.ts` |
| Context Processor | `src/lib/agent-context-processor.ts` |
| Error Handling | `src/lib/error-handling.ts` |
| Integration Patterns | `docs/mastra-integration-patterns.md` |
| Decision Log | `docs/decisionLog.md` |

---

## Key Takeaways

1. **✅ Type Safety First**: Use `AgentInputContext` for all agent interactions
2. **✅ Hook-Based Orchestration**: Never access stores directly in components
3. **✅ Circuit Breaker Protection**: Wrap all external service calls
4. **✅ Permission Validation**: Always check permissions before operations
5. **✅ Dual Memory**: Separate user and global memory with proper access control
6. **✅ Graceful Degradation**: Implement fallback strategies for resilience
7. **✅ Central Types**: Export all shared types through `src/types/index.ts`
8. **✅ Anonymous Support**: Handle unauthenticated users with restricted permissions

---

## Common Mistakes to Avoid

❌ **Using `any` type** - Always use proper type definitions  
❌ **Direct store access in components** - Use custom hooks  
❌ **Forgetting permission checks** - Validate before operations  
❌ **No circuit breaker on external calls** - Always protect external services  
❌ **Ignoring anonymous users** - Support both authenticated and anonymous  
❌ **Duplicating types** - Check `src/types/` first  
❌ **No error fallbacks** - Always implement graceful degradation  
❌ **Mixing user/global memory** - Keep scopes separate  

---

## Next Steps

### Immediate (Phase 1) ✅
- [x] Create type definitions
- [x] Implement context processor
- [x] Add error handling patterns
- [x] Document architecture decisions

### Short-term (Phase 2)
- [ ] Update agent services to use AgentInputContext
- [ ] Add environment variable documentation
- [ ] Implement memory operations (when backend ready)
- [ ] Add observability hooks

### Long-term (Phase 3)
- [ ] Full LangFuse observability integration
- [ ] Complete 14 memory tools implementation
- [ ] Tool registry pattern if needed
- [ ] Knowledge base / RAG capabilities

---

## Support

- **Full Documentation**: [`docs/mastra-integration-patterns.md`](./mastra-integration-patterns.md)
- **Decision Log**: [`docs/decisionLog.md`](./decisionLog.md)
- **Mastra Framework**: <https://mastra.ai/docs>
- **Source Reference**: `/Users/gqadonis/Projects/prometheus/brius/brius-mastra-final`

**Remember**: These patterns are from a production-grade system scored A- (90/100). Follow them for scalable, maintainable AI agent applications.
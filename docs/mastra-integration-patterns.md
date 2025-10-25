# Mastra Integration Patterns

**Source**: brius-mastra-final Mastra Agent Server
**Architecture Grade**: A- (90/100)
**Last Updated**: 2025-01-25

## Overview

This document captures the key architectural patterns from the production-grade Mastra agent server that should be adopted in the brius-smile-nexus project. These patterns represent best practices for building scalable, maintainable AI agent systems.

## Integration Approach

**Strategy**: Adopt architectural patterns without external dependencies
- Keep Supabase authentication but align type structures
- Implement simplified memory architecture
- Duplicate and document type definitions for clarity

---

## 1. Type System Architecture

### Central Type Exports Pattern

**Source**: `src/mastra/types/index.ts`

**Pattern**: All shared types must be exported through a central barrel file to prevent duplication and ensure single source of truth.

```typescript
// src/types/index.ts - Central type exports
// All shared types MUST be exported through this file

// Memory system types
export * from './memory.js';

// Knowledge base types
export * from './knowledge.js';

// Agent and chat types
export * from './agents.js';

// Workflow system types
export * from './workflows.js';

// API interface types
export * from './api.js';

// Observability and tracing types
export * from './observability.js';

// Re-export commonly used Zod for validation
export { z } from 'zod';
```

**Benefits**:
- ✅ Single source of truth for all types
- ✅ Prevents type duplication across codebase
- ✅ Easy to refactor and maintain
- ✅ Clear dependency structure

**Implementation in brius-smile-nexus**:
- Update `src/types/index.ts` to follow this pattern
- Organize types by feature/domain
- Use proper barrel exports

---

## 2. Agent Context System

### AgentInputContext Interface

**Source**: `src/mastra/types/agent-input.ts` and `docs/AGENT_CONTEXT_SYSTEM.md`

**Pattern**: Standardized context structure that all agents receive, supporting both authenticated and anonymous users.

```typescript
interface AgentInputContext {
  // User identification
  userId: string;
  sessionId: string;
  conversationId?: string;
  
  // Authentication
  jwt?: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  
  // Authorization
  roles: string[];
  permissions: PermissionMatrix;
  departmentScope: string[];
  
  // Application context
  applicationName: string;
  streaming?: boolean;
  
  // Metadata
  timestamp: Date;
  metadata?: Record<string, unknown>;
  
  // User preferences
  preferences?: UserPreferences;
}
```

**Key Features**:
1. **JWT Processing**: Extracts user info, roles, and permissions from JWT tokens
2. **Custom Headers**: Supports X-Context-User, X-Context-Roles, X-Context-Stream, X-Context-App
3. **Anonymous Fallback**: Gracefully handles unauthenticated users with SUPABASE_ANON_KEY
4. **Role Merging**: Combines JWT roles with header overrides (when allowed)

**Context Processing Flow**:
```typescript
// 1. Extract headers
const rawContext = {
  authorization: req.headers.authorization,
  contextUser: req.headers['x-context-user'],
  contextRoles: req.headers['x-context-roles'],
  contextStream: req.headers['x-context-stream'],
  contextApp: req.headers['x-context-app'],
};

// 2. Process JWT if provided
const jwtPayload = extractJWTPayload(rawContext.authorization);
const userId = rawContext.contextUser || jwtPayload.sub;
const jwtRoles = extractJWTRoles(jwtPayload);

// 3. Merge roles with priority to headers
const mergedRoles = allowRoleOverride && headerRoles.length > 0 
  ? [...new Set([...headerRoles, ...jwtRoles])]
  : jwtRoles;

// 4. Create context or use anonymous fallback
const context: AgentInputContext = {
  userId,
  sessionId: generateSessionId(),
  roles: mergedRoles,
  isAuthenticated: !!jwtPayload,
  isAnonymous: !jwtPayload,
  // ... other fields
};
```

**Implementation in brius-smile-nexus**:
- Create `src/types/agent-context.ts` with AgentInputContext interface
- Create `src/lib/agent-context-processor.ts` for Supabase-to-AgentInputContext transformation
- Update all agent services to use standardized context

---

## 3. Memory Architecture

### Dual Memory System

**Source**: `src/mastra/memory/` and `MEMORY_INTEGRATION_SUMMARY.md`

**Pattern**: Separate user-scoped and global memory stores with semantic search capabilities.

#### Memory Types

```typescript
// User-scoped memory (personal context and preferences)
interface UserMemory {
  id: string;
  userId: string;
  content: string;
  category?: string;
  importance?: number;
  embedding?: number[]; // pgvector embedding
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Global memory (organizational knowledge sharing)
interface GlobalMemory {
  id: string;
  content: string;
  category?: string;
  importance?: number;
  embedding?: number[]; // pgvector embedding
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  accessControl?: string[]; // roles with access
}
```

#### Memory Tools Pattern (14 total)

**Core Operations**:
1. `store-memory` - Store user-scoped memory
2. `store-global-memory` - Store global memory
3. `search-user-memory` - Semantic search user memories
4. `search-global-memory` - Semantic search global memories
5. `search-all-memory` - Search both user and global
6. `update-memory` - Update memory content/metadata
7. `delete-memory` - Delete individual memory
8. `memory-stats` - Get memory statistics

**Enhanced Operations**:
9. `list-user-memories` - Paginated listing of user memories
10. `list-global-memories` - Paginated listing (admin-only)
11. `bulk-delete-memories` - Bulk deletion
12. `export-memories` - JSON export functionality
13. `import-memories` - JSON import functionality
14. `memory-inspection` - Advanced debugging (admin-only)

**Semantic Search Pattern**:
```typescript
interface MemorySearchParams {
  query: string;
  userId: string;
  scope: 'user' | 'global' | 'all';
  limit?: number;
  threshold?: number; // similarity threshold (0-1)
  category?: string;
}

interface MemorySearchResult {
  memory: UserMemory | GlobalMemory;
  similarity: number;
  rank: number;
}
```

**Implementation in brius-smile-nexus**:
- Update `src/types/memory.ts` with user-scoped and global memory definitions
- Consider implementing simplified memory tools for MVP
- Plan for future pgvector integration

---

## 4. Tool Registry Pattern

### Shared Tool System

**Source**: `src/mastra/agents/shared-tools.ts` and `src/mastra/tools/`

**Pattern**: Multi-layered tool system with centralized registry accessible to all agents.

#### Tool Layers

```typescript
// 1. MCP Tools - External integrations via Model Context Protocol
const mcpTools = await loadMCPTools();

// 2. Bedrock Tools - AWS Bedrock native tools
const bedrockTools = getBedrockTools();

// 3. Knowledge Tools - RAG and vector search
const knowledgeTools = getKnowledgeTools();

// 4. Memory Tools - User and global memory operations
const memoryTools = getMemoryTools();

// 5. Domain-Specific Tools - Business logic tools
const orthodonticTools = getOrthodonticIntelligenceTools();
```

#### Tool Map Pattern

```typescript
/**
 * Get shared tool map accessible to all agents
 * Tools are loaded dynamically with proper error handling
 */
export async function getSharedToolMap(): Promise<Record<string, Tool>> {
  const toolMap: Record<string, Tool> = {};
  
  try {
    // Load MCP tools with fallback
    const mcpTools = await loadMCPToolsWithFallback();
    Object.assign(toolMap, mcpTools);
  } catch (error) {
    console.warn('MCP tools unavailable, continuing with other tools');
  }
  
  // Add other tool layers
  Object.assign(toolMap, 
    getBedrockTools(),
    getKnowledgeTools(),
    getMemoryTools(),
    getDomainTools()
  );
  
  return toolMap;
}
```

#### Tool Definition Pattern

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema; // Zod validation schema
  execute: (input: unknown) => Promise<unknown>;
  metadata?: {
    category?: string;
    requiresAuth?: boolean;
    adminOnly?: boolean;
  };
}
```

**Implementation in brius-smile-nexus**:
- Review `src/services/mastra-agent-manager.ts`
- Ensure it follows shared tool registry pattern
- Implement proper tool loading with fallbacks

---

## 5. Workflow Composition Pattern

### Workflow Structure

**Source**: `src/mastra/workflows/intent-classifier.ts`

**Pattern**: Use createWorkflow() and createStep() with proper Zod schema validation.

```typescript
import { createWorkflow, createStep } from '@mastra/core';
import { z } from 'zod';

// 1. Define input/output schemas with Zod
const InputSchema = z.object({
  prompt: z.string(),
  context: z.record(z.unknown()).optional(),
});

const OutputSchema = z.object({
  classification: z.object({
    intent: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
  }),
  complexity_analysis: z.object({
    score: z.number(),
    factors: z.array(z.string()),
  }),
  routing_decision: z.object({
    targetAgent: z.string(),
    rationale: z.string(),
  }),
});

// 2. Create workflow steps
const classifyStep = createStep({
  id: 'classify-intent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  execute: async ({ inputData }) => {
    // Business logic here
    const factors = analyzeFactors(inputData.prompt, inputData.context ?? {});
    const complexityScore = calculateComplexityScore(factors);
    const classification = buildClassification(inputData.prompt, complexityScore, factors);
    
    return {
      classification,
      complexity_analysis: { score: complexityScore, factors },
      routing_decision: { targetAgent: 'business-intelligence', rationale: '...' },
    } satisfies z.infer<typeof OutputSchema>;
  },
});

// 3. Compose workflow
export const intentClassifierWorkflow = createWorkflow({
  id: 'intent-classification',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
  .then(classifyStep)
  .commit();
```

**Key Principles**:
1. ✅ Always define input/output schemas with Zod
2. ✅ Use `satisfies` for type checking in execute functions
3. ✅ Separate business logic into testable functions
4. ✅ Chain steps with `.then()` and finalize with `.commit()`
5. ✅ Include comprehensive metadata in outputs

**Implementation in brius-smile-nexus**:
- Ensure all workflows use proper Zod schemas
- Verify step composition follows pattern
- Add metadata for debugging and monitoring

---

## 6. Agent Orchestration Pattern

### Planner-Executor Architecture

**Source**: `src/mastra/agents/business-intelligence.ts`

**Pattern**: Two-phase execution with planning step followed by execution step.

```typescript
/**
 * Business Intelligence Agent with Planner-Executor Pattern
 */
export const businessIntelligenceAgent = new ValidatedBusinessIntelligenceAgent({
  name: 'business-intelligence-agent',
  description: 'Provides executive-ready analysis using sophisticated planner-executor architecture.',
  instructions: BUSINESS_INTELLIGENCE_INSTRUCTIONS,
  model: chatModel, // Bedrock Claude 4 Sonnet
  tools: async () => getSharedToolMap(),
  memory: getMemoryStore(), // Can be disabled with proper fallback
});

/**
 * Extended Agent Class with Validation
 */
class ValidatedBusinessIntelligenceAgent extends Agent {
  async generate(input: AgentInput, context?: AgentContext) {
    // 1. Validate input messages
    const validatedMessages = this.validateMessages(input.messages);
    
    // 2. Planning phase - analyze and create plan
    const plan = await this.executePlanningWorkflow(validatedMessages, context);
    
    // 3. Execution phase - execute plan steps
    const result = await this.executeWorkflowSteps(plan, context);
    
    // 4. Return comprehensive response
    return this.formatResponse(result);
  }
  
  private validateMessages(messages: Message[]): Message[] {
    // Input sanitization and validation
    return messages.map(msg => ({
      ...msg,
      content: sanitizeContent(msg.content),
    }));
  }
}
```

**Intent Classification Pattern**:
```typescript
/**
 * Orchestrator Agent - Routes requests to specialized agents
 */
export const orchestratorAgent = new Agent({
  name: 'orchestrator-agent',
  description: 'Primary routing agent that classifies intent and routes queries',
  instructions: ORCHESTRATOR_INSTRUCTIONS,
  model: chatModel,
  tools: async () => getSharedToolMap(),
  memory: getMemoryStore(),
});

/**
 * Intent Classification Workflow
 */
const intentClassificationWorkflow = createWorkflow({
  id: 'intent-classification',
  inputSchema: IntentInputSchema,
  outputSchema: IntentOutputSchema,
})
  .then(analyzeComplexityStep)
  .then(classifyIntentStep)
  .then(routeToAgentStep)
  .commit();
```

**Implementation in brius-smile-nexus**:
- Review `src/stores/mastra-orchestrator-store.ts`
- Ensure orchestration matches Mastra patterns
- Implement intent-based routing if needed

---

## 7. Error Handling Pattern

### Circuit Breaker Pattern

**Source**: `src/mastra/services/circuit-breaker.ts`

**Pattern**: Implement circuit breakers for external service calls with graceful degradation.

```typescript
interface CircuitBreakerConfig {
  timeout: number; // Request timeout in ms
  errorThresholdPercentage: number; // Threshold to open circuit
  resetTimeoutMs: number; // Time before retry
  volumeThreshold: number; // Min requests before calculating
}

enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
    }
  }
  
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
    }
  }
  
  private shouldOpenCircuit(): boolean {
    const totalRequests = this.failureCount + this.successCount;
    if (totalRequests < this.config.volumeThreshold) {
      return false;
    }
    
    const errorRate = (this.failureCount / totalRequests) * 100;
    return errorRate >= this.config.errorThresholdPercentage;
  }
}
```

**Graceful Degradation Pattern**:
```typescript
/**
 * Tool loading with fallback
 */
async function loadToolsWithFallback(): Promise<ToolMap> {
  const tools: ToolMap = {};
  
  // Try to load MCP tools
  try {
    const mcpTools = await loadMCPTools();
    Object.assign(tools, mcpTools);
  } catch (error) {
    console.warn('MCP tools unavailable, using fallback');
    Object.assign(tools, getFallbackTools());
  }
  
  // Always include core tools
  Object.assign(tools, getCoreTools());
  
  return tools;
}
```

**Implementation in brius-smile-nexus**:
- Create `src/lib/error-handling.ts` with circuit breaker
- Implement graceful degradation for external services
- Add proper error logging and monitoring

---

## 8. Observability Integration

### LangFuse Integration Pattern

**Source**: `src/mastra/observability/langfuse-client.ts`

**Pattern**: Comprehensive tracing for agents, workflows, and tools.

```typescript
interface ObservabilityConfig {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  baseUrl: string;
  
  // Feature flags
  agentTracing: boolean;
  workflowTracing: boolean;
  toolTracing: boolean;
  
  // Capture settings
  captureInput: boolean;
  captureOutput: boolean;
}

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  userId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Trace agent execution
 */
async function traceAgentExecution(
  agentName: string,
  input: AgentInput,
  context: TraceContext
): Promise<void> {
  if (!observabilityConfig.enabled || !observabilityConfig.agentTracing) {
    return;
  }
  
  await langfuse.trace({
    id: context.traceId,
    name: `agent-${agentName}`,
    userId: context.userId,
    sessionId: context.sessionId,
    input: observabilityConfig.captureInput ? input : undefined,
    metadata: {
      agentName,
      ...context.metadata,
    },
  });
}
```

**Implementation in brius-smile-nexus**:
- Plan for future LangFuse integration
- Document required environment variables
- Design tracing hooks for agents

---

## 9. Environment Configuration

### Required Environment Variables

**Source**: `.env.example` and `src/mastra/config/environment.ts`

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Required)
PGVECTOR_DATABASE_URL=postgresql://postgres:password@localhost:5432/mastra_bi
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration (Required)
SUPABASE_JWT_SECRET=your-jwt-secret

# AWS Bedrock Configuration (Required for embeddings)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
BEDROCK_CLAUDE_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_TITAN_MODEL_ID=amazon.titan-embed-text-v2:0

# LangFuse Observability (Optional but Recommended)
LANGFUSE_PUBLIC_KEY=your-public-key
LANGFUSE_SECRET_KEY=your-secret-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_ENABLED=true

# Agent Context Configuration
CONTEXT_SESSION_TIMEOUT=86400000          # 24 hours in ms
CONTEXT_REFRESH_THRESHOLD=3600000         # 1 hour in ms
CONTEXT_DEFAULT_APP_NAME=anonymous
CONTEXT_ALLOW_ROLE_OVERRIDE=true
CONTEXT_MAX_ROLES=10

# Memory Configuration
MEMORY_USER_TABLE=user_memories
MEMORY_GLOBAL_TABLE=global_memories
MEMORY_CACHE_TTL=3600
MEMORY_MAX_CONTEXT_ITEMS=10

# Observability Configuration
TOOL_TRACING_ENABLED=true
AGENT_TRACING_ENABLED=true
WORKFLOW_TRACING_ENABLED=true
TRACING_CAPTURE_INPUT=true
TRACING_CAPTURE_OUTPUT=true
```

**Implementation in brius-smile-nexus**:
- Update `.env.example` with required variables
- Add validation for critical environment variables
- Document purpose of each variable

---

## 10. Best Practices Summary

### Type Safety
- ✅ Never use `any` type explicitly
- ✅ Use Zod schemas for runtime validation
- ✅ Implement central type exports
- ✅ Use proper generics and utility types

### Architecture
- ✅ Feature-based organization
- ✅ Separation of concerns
- ✅ Dependency injection for testability
- ✅ Single responsibility principle

### Error Handling
- ✅ Circuit breakers for external services
- ✅ Graceful degradation patterns
- ✅ Comprehensive error logging
- ✅ Proper error types and categories

### State Management
- ✅ Never access stores directly from components
- ✅ Always use custom hooks for orchestration
- ✅ Implement proper loading/error states
- ✅ Keep components pure and focused on rendering

### Security
- ✅ JWT validation with proper fallbacks
- ✅ Role-based access control
- ✅ Permission validation
- ✅ Secure environment variable handling

### Performance
- ✅ Connection pooling for databases
- ✅ Batch processing for large operations
- ✅ Caching strategies where appropriate
- ✅ Lazy loading for tools and resources

### Testing
- ✅ Unit tests for business logic
- ✅ Integration tests for workflows
- ✅ Mock external dependencies
- ✅ Test error scenarios and edge cases

---

## Implementation Priority

### Phase 1: Foundation (Current)
1. ✅ Create this documentation
2. [ ] Align type definitions with Mastra patterns
3. [ ] Update agent context structure
4. [ ] Implement memory type definitions

### Phase 2: Core Integration
5. [ ] Review and update agent manager
6. [ ] Create context processor
7. [ ] Update agent services
8. [ ] Review orchestrator store

### Phase 3: Infrastructure
9. [ ] Document environment variables
10. [ ] Implement error handling patterns
11. [ ] Update memory bank documentation
12. [ ] Create best practices summary

---

## References

- **Mastra Server**: `/Users/gqadonis/Projects/prometheus/brius/brius-mastra-final`
- **Best Practices**: `brius-mastra-final/docs/MASTRA_BEST_PRACTICES.md`
- **Agent Context**: `brius-mastra-final/docs/AGENT_CONTEXT_SYSTEM.md`
- **Memory Integration**: `brius-mastra-final/MEMORY_INTEGRATION_SUMMARY.md`

---

## Conclusion

These patterns represent production-ready best practices from a sophisticated Mastra agent server. Adopting them will ensure:

- **Scalability**: Clean architecture that grows with project needs
- **Maintainability**: Clear patterns and separation of concerns
- **Reliability**: Proper error handling and graceful degradation
- **Type Safety**: Comprehensive type definitions with runtime validation
- **Testability**: Dependency injection and proper abstractions

Follow these patterns consistently across the brius-smile-nexus codebase to maintain high code quality and alignment with Mastra framework best practices.
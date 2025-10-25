# Decision Log

## Assistant UI Architecture Refactoring (2025-01-08)

### Problem Statement
The current Business Intelligence Assistant UI implementation has several critical architectural issues:
- Direct runtime coupling bypassing Zustand store patterns
- Missing UI state management (no loading/streaming indicators)
- Poor error handling and recovery mechanisms
- Unused enhanced rendering capabilities (EnhancedMessage component not integrated)
- No state persistence in existing chat store
- Inconsistent state flow with multiple state sources

### Decision
Implement a comprehensive architectural refactoring with the following key changes:

#### 1. New Zustand Store Architecture
- Create `src/stores/bi-assistant-store.ts` as primary state manager
- Integrate with existing `usePersistentChatStore` for history persistence
- Manage UI state (loading, streaming, errors, input disabling)
- Handle thread synchronization and server state integration

#### 2. Component Architecture Refactoring
- Remove direct `useBIAssistantRuntime` usage from components
- Implement proper Zustand store integration via custom hooks
- Integrate `EnhancedMessage` component for full markdown/mermaid/code support
- Add comprehensive loading states and error handling

#### 3. Enhanced State Management
- Single source of truth through Zustand store
- Proper separation of concerns (UI, business logic, persistence)
- Thread synchronization with server state
- Optimistic updates with error recovery

#### 4. User Experience Improvements
- Disable input during processing (one prompt at a time)
- Display loading/streaming indicators
- Show errors with clear messaging and recovery options
- Full markdown rendering with mermaid diagrams and code blocks

### Implementation Strategy
Four-phase implementation:
1. **Phase 1**: Create new Zustand store architecture
2. **Phase 2**: Refactor component architecture
3. **Phase 3**: Enhanced state persistence and synchronization
4. **Phase 4**: Error handling and user experience improvements

### Benefits
- Improved user experience with proper feedback and state management
- Better maintainability through clear separation of concerns
- Enhanced functionality with full markdown/mermaid support
- Scalable architecture for future feature additions
- Consistent state management following project patterns

### Files to be Created/Modified
- `src/stores/bi-assistant-store.ts` (new)
- `src/hooks/use-bi-assistant.ts` (new)
- `src/hooks/use-bi-assistant-state.ts` (new)
- `src/hooks/use-bi-assistant-actions.ts` (new)
- `src/components/assistant-ui/bi-assistant-chat.tsx` (refactor)
- `src/lib/bi-assistant-runtime.ts` (simplify/deprecate)

### Technical Considerations
- Maintain backward compatibility with existing functionality
- Follow project's Zustand patterns and TypeScript standards
- Integrate with existing `usePersistentChatStore` for history
- Preserve all current BI-specific functionality (context, prompts, etc.)

---

## Mastra Integration Architecture Alignment (2025-01-25)

### Problem Statement
The brius-smile-nexus project needs to align with production-grade Mastra framework patterns from the brius-mastra-final agent server to ensure:
- Type safety and consistency across agent interactions
- Proper authentication and authorization flows
- Scalable memory management architecture
- Robust error handling with graceful degradation
- Best practices for agent orchestration and tool integration

### Source Analysis
Comprehensive review of brius-mastra-final Mastra agent server revealed:
- **Architecture Grade**: A- (90/100)
- **Key Strengths**: Feature-based architecture, dual memory system, JWT authentication with Agent Context System, planner-executor agent pattern, comprehensive LangFuse observability
- **Production-Ready Patterns**: Central type exports, workflow composition with Zod validation, multi-layered tool system, circuit breaker error handling

### Decision: Adopt Mastra Patterns (Pattern Adoption Strategy)

#### Integration Approach Selected
- **Integration Scope**: Adopt architectural patterns into current codebase without external server dependency
- **Authentication**: Keep Supabase auth but align type structures to match AgentInputContext schema
- **Memory System**: Adopt architecture with simplified implementation (dual user + global memory)
- **Type Definitions**: Duplicate and align types with clear documentation for maintainability

#### Rationale
This approach provides:
1. ✅ Benefits of Mastra best practices without external dependencies
2. ✅ Maintains existing Supabase infrastructure
3. ✅ Clear migration path without breaking changes
4. ✅ Type safety and consistency across the application

### Architectural Changes Implemented

#### 1. Type System Architecture
**New Files Created**:
- `src/types/agent-context.ts` - Unified AgentInputContext interface with permission matrix, user preferences, JWT support, and anonymous fallback
- `src/types/memory.ts` - Dual memory system types (user-scoped + global) with pgvector embedding support, semantic search interfaces, and 14 memory tools pattern

**Key Types**:
```typescript
interface AgentInputContext {
  userId: string;
  sessionId: string;
  conversationId?: string;
  jwt?: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  roles: string[];
  permissions: PermissionMatrix;
  departmentScope: string[];
  applicationName: string;
  streaming?: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  preferences?: UserPreferences;
}
```

#### 2. Agent Context Processing
**New File Created**:
- `src/lib/agent-context-processor.ts` - Transforms Supabase authentication into AgentInputContext format

**Features**:
- JWT payload extraction and validation
- Role extraction from user/app metadata with merge logic
- Permission matrix building based on roles (admin, analyst, clinician, viewer)
- User preferences extraction
- Department scope determination
- Anonymous fallback with restricted permissions
- Custom header support for testing (X-Context-User, X-Context-Roles, X-Context-Stream, X-Context-App)

#### 3. Error Handling and Resilience
**New File Created**:
- `src/lib/error-handling.ts` - Circuit breaker pattern implementation

**Components**:
- `CircuitBreaker` class with CLOSED/OPEN/HALF_OPEN states
- Exponential backoff retry logic
- Error classification system (Network, Timeout, Validation, Auth, etc.)
- Circuit breaker manager for multiple services
- Graceful degradation with fallback strategies
- Specialized helpers for agent calls, database calls, and external APIs

**Configuration**:
```typescript
CircuitBreakerConfig {
  timeout: 5000ms,
  errorThresholdPercentage: 50%,
  resetTimeoutMs: 30000ms,
  volumeThreshold: 10,
  maxRetries: 3,
  backoffMultiplier: 2,
}
```

#### 4. Comprehensive Documentation
**New File Created**:
- `docs/mastra-integration-patterns.md` - Complete guide to all Mastra patterns

**Sections**:
1. Central Type Exports Pattern
2. Agent Context System (JWT processing, custom headers, anonymous fallback)
3. Memory Architecture (dual system with 14 tools)
4. Tool Registry Pattern (multi-layered with MCP integration)
5. Workflow Composition Pattern (createWorkflow + createStep with Zod)
6. Agent Orchestration Pattern (planner-executor architecture)
7. Error Handling Pattern (circuit breakers and graceful degradation)
8. Observability Integration (LangFuse tracing)
9. Environment Configuration (required variables)
10. Best Practices Summary

### Implementation Benefits

#### Type Safety
- ✅ Standardized AgentInputContext across all agent interactions
- ✅ Comprehensive permission matrix with type-safe resource/action checks
- ✅ Dual memory types for user and global scope
- ✅ Central barrel exports preventing type duplication

#### Authentication & Authorization
- ✅ JWT processing with Supabase integration
- ✅ Role-based access control (RBAC) with permission matrix
- ✅ Anonymous user support with appropriate restrictions
- ✅ Custom header overrides for testing/development

#### Reliability & Performance
- ✅ Circuit breaker protection for external services
- ✅ Exponential backoff retry logic
- ✅ Graceful degradation with fallback strategies
- ✅ Error classification for intelligent handling

#### Maintainability
- ✅ Feature-based type organization
- ✅ Comprehensive inline documentation
- ✅ Clear separation of concerns
- ✅ Testable, injectable patterns

### Future Integration Points

#### Phase 2 Enhancements (When Backend is Ready)
1. **Memory System Implementation**: Implement full 14 memory tools with pgvector backend
2. **Agent Services Update**: Update agent service clients to use AgentInputContext
3. **Observability Integration**: Add LangFuse tracing for agents, workflows, and tools
4. **Workflow Implementation**: Create createWorkflow/createStep wrappers if needed

#### Phase 3 Advanced Features
1. **Tool Registry**: Implement shared tool registry if multiple tools emerge
2. **Knowledge Base**: Add RAG/vector search capabilities
3. **Planner-Executor Pattern**: Implement sophisticated multi-step workflows
4. **Real-time Context**: Add memory context injection into agent prompts

### Technical Debt and Considerations

#### Pending Items
- Update existing agent service files to use AgentInputContext (deferred - requires backend coordination)
- Review orchestrator store alignment (deferred - store already well-structured)
- Environment variable documentation (deferred - to be added with .env.example update)

#### No Breaking Changes
- All new types are additive - no existing code broken
- Existing authentication flows remain functional
- Can be adopted incrementally as backend services are updated

### References
- **Source Repository**: `/Users/gqadonis/Projects/prometheus/brius/brius-mastra-final`
- **Architecture Documentation**: `docs/mastra-integration-patterns.md`
- **Best Practices**: `brius-mastra-final/docs/MASTRA_BEST_PRACTICES.md`
- **Agent Context System**: `brius-mastra-final/docs/AGENT_CONTEXT_SYSTEM.md`
- **Memory Integration**: `brius-mastra-final/MEMORY_INTEGRATION_SUMMARY.md`

### Success Criteria Met
- ✅ Comprehensive architecture review completed
- ✅ Type system aligned with Mastra patterns
- ✅ Agent context processing implemented
- ✅ Memory types defined for future implementation
- ✅ Error handling patterns established
- ✅ Complete documentation created
- ✅ No breaking changes to existing code
- ✅ Clear path forward for incremental adoption

This establishes a solid foundation for Mastra framework alignment that can be adopted incrementally as the project evolves.
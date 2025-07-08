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
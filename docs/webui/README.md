# Client Integration Guide

This directory contains comprehensive documentation for integrating client applications with Mastra agents, with a focus on modern React patterns and state management.

## 🎯 Primary Focus: Business Intelligence Agent

The documentation prioritizes the **Business Intelligence Agent** with comprehensive examples, then provides general patterns for other agents (Database Agent, Migration Agent).

## 🏗️ Architecture Pattern: Components → Hooks → Stores

All examples follow the clean separation pattern:
- **Components**: Pure UI components that only call hooks
- **Hooks**: Custom React hooks that interface with stores
- **Stores**: Zustand stores with persistent state management

## 📚 Documentation Structure

### Quick Start
- [`quick-start-bi-agent.md`](./quick-start-bi-agent.md) - Get running with BI agent in 5 minutes

### Business Intelligence Focus
- [`business-intelligence/`](./business-intelligence/) - Comprehensive BI agent integration
  - Overview and capabilities
  - Basic and advanced query patterns
  - Data visualization integration
  - Real-time analytics with streaming

### Modern React Setup
- [`setup/`](./setup/) - React 19 + Vite 7 + TypeScript setup guides
- [`ui-patterns/`](./ui-patterns/) - Assistant-UI and Shadcn/UI integration patterns

### State Management
- **Zustand + Assistant-UI**: Persistent chat stores with ag-ui connections
- **Components → Hooks → Stores**: Clean architecture patterns
- **Persistent Conversations**: Cross-session chat history

### General Agent Patterns
- [`general-agents/`](./general-agents/) - Database and Migration agent examples
- [`production/`](./production/) - Error handling, performance, security

### API Reference
- [`api-reference/`](./api-reference/) - Complete Mastra client API documentation

## 🚀 Key Technologies

- **React 19**: Latest React features and patterns
- **Vite 7**: Modern build tool with fast HMR
- **TypeScript**: Strict typing with nullish coalescing
- **Zustand**: State management with persistence
- **Assistant-UI**: AI chat interface components
- **Shadcn/UI**: Modern component library
- **Tailwind CSS**: Utility-first styling
- **pnpm**: Package manager

## 🎨 UI Library Approaches

### Assistant-UI (Recommended for Chat)
- Purpose-built for AI conversations
- Built-in streaming support
- Runtime integration patterns
- 550+ code examples available

### Shadcn/UI (Recommended for General UI)
- Modern component library
- Tailwind CSS integration
- Customizable and accessible
- 1000+ examples available

### Hybrid Approach
- Assistant-UI for chat interfaces
- Shadcn/UI for application shell
- Seamless integration patterns

## 🔄 State Management Philosophy

### Zustand Store Pattern
```typescript
// Clean separation: Components → Hooks → Stores
const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isRunning: false,
      // Actions that modify state
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
    }),
    { name: 'chat-storage' }
  )
);
```

### Custom Hook Pattern
```typescript
// Hooks interface with stores, components stay pure
export function useBIChat() {
  const store = useChatStore();
  const runtime = useExternalStoreRuntime({
    messages: store.messages,
    onNew: store.handleNewMessage,
  });
  return { runtime, ...store };
}
```

### Component Pattern
```typescript
// Components only call hooks, no direct store access
export function BIChatInterface() {
  const { runtime, messages, isRunning } = useBIChat();
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

## 🔗 Agent Integration

### Business Intelligence Agent (Primary)
- **Agent ID**: `businessIntelligenceAgent`
- **Capabilities**: Revenue analysis, operational metrics, cost optimization
- **Memory**: Persistent conversation history with vector search
- **Tools**: MCP tools for database access and analysis

### Database Agent
- **Agent ID**: `databaseAgent`
- **Capabilities**: Legacy database queries and analysis
- **Tools**: PostgreSQL MCP tools

### Migration Agent
- **Agent ID**: `migrationAgent`
- **Capabilities**: Data migration workflows and validation
- **Tools**: Migration-specific MCP tools

## 📖 Getting Started

1. **Quick Start**: Begin with [`quick-start-bi-agent.md`](./quick-start-bi-agent.md)
2. **Setup Environment**: Follow [`setup/react-vite-2025.md`](./setup/react-vite-2025.md)
3. **Choose UI Pattern**: Review [`ui-patterns/`](./ui-patterns/) for your approach
4. **Implement State Management**: Use Zustand patterns from examples
5. **Production Ready**: Apply patterns from [`production/`](./production/)

## 🎯 Best Practices

- **Type Safety**: Use strict TypeScript with nullish coalescing (`??`)
- **Performance**: Implement proper memoization with `useCallback`
- **Persistence**: Use Zustand persist middleware for chat history
- **Error Handling**: Implement comprehensive error boundaries
- **Testing**: Test components, hooks, and stores separately
- **Security**: Validate all inputs with Zod schemas

## 🔧 Development Tools

- **Package Manager**: pnpm (required)
- **Build Tool**: Vite 7 with React 19 support
- **Type Checking**: TypeScript strict mode
- **Linting**: ESLint with React 19 rules
- **Formatting**: Prettier with consistent config
- **Testing**: Vitest with React Testing Library

---

**Next Steps**: Start with the [Quick Start Guide](./quick-start-bi-agent.md) to get your first BI agent integration running in minutes.
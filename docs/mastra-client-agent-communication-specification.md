# Mastra Client-Agent Communication Specification

## Core Principle

**The client application should NEVER communicate directly with workflows. The ONLY job this application has is to communicate with the businessIntelligence agent. That is it.**

## Architecture Overview

```
Web Application → Mastra Client → businessIntelligence Agent → [Agent handles workflows internally]
```

## Communication Rules

### ✅ ALLOWED
- Direct communication with the `businessIntelligence` agent via standard agent endpoints
- Sending user messages to the agent
- Receiving agent responses
- Basic agent health checks
- Agent configuration and context management

### ❌ FORBIDDEN
- Direct workflow API calls
- Workflow orchestration on the client side
- Conversation adjustment logic on the client side
- Direct tool calls to workflows
- Client-side business logic that should be handled by the agent

## API Endpoints

### Primary Agent Communication
```
POST /api/agents/businessIntelligenceAgent/generate
```

**Request Format:**
```typescript
{
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  resourceId: string,
  threadId: string,
  userContext: UserBIContext,
  options?: {
    maxSteps?: number;
    temperature?: number;
    output?: Record<string, unknown>;
  }
}
```

**Response Format:**
```typescript
{
  text: string;
  object?: Record<string, unknown>;
  metadata?: {
    executionTime: number;
    [key: string]: unknown;
  };
}
```

### Agent Health Check
```
GET /api/agents/businessIntelligenceAgent/health
```

## Client Responsibilities

1. **Message Formatting**: Format user input into proper message structure
2. **Context Management**: Maintain user context and session information
3. **Error Handling**: Handle network errors and agent unavailability
4. **Response Processing**: Display agent responses to the user
5. **Authentication**: Manage user authentication and authorization

## Agent Responsibilities

1. **Business Logic**: All business intelligence logic resides in the agent
2. **Workflow Orchestration**: Agent internally manages workflows as needed
3. **Data Processing**: Agent handles all data gathering and analysis
4. **Response Generation**: Agent provides complete, final answers
5. **Tool Management**: Agent manages all tool calls internally

## Implementation Guidelines

### Client-Side Code Structure
```typescript
// ✅ CORRECT - Simple agent communication
const response = await mastraClient.generate(messages, userContext, options);

// ❌ WRONG - Direct workflow calls
const workflowResult = await mastraClient.executeWorkflow(question, context);
```

### Message Flow
1. User types a question in the UI
2. Client formats the question into a message array
3. Client sends messages to the businessIntelligence agent
4. Agent processes the request (internally using workflows if needed)
5. Agent returns a complete response
6. Client displays the response to the user

## Error Handling

The client should only handle:
- Network connectivity errors
- Authentication errors
- Agent unavailability
- Response parsing errors

The client should NOT handle:
- Business logic errors (agent's responsibility)
- Data validation errors (agent's responsibility)
- Workflow execution errors (agent's responsibility)

## Configuration

### Environment Variables
```
VITE_MASTRA_SERVER_URL=http://localhost:4111
VITE_MASTRA_AGENT_ID=businessIntelligenceAgent
VITE_MASTRA_API_KEY=optional_api_key
```

### Client Configuration
```typescript
const mastraClient = new MastraClient({
  baseUrl: 'http://localhost:4111',
  agentId: 'businessIntelligenceAgent',
  // No workflow-specific configuration needed
});
```

## Key Benefits of This Architecture

1. **Separation of Concerns**: Client handles UI, agent handles business logic
2. **Maintainability**: Changes to business logic don't require client updates
3. **Scalability**: Agent can evolve workflows without breaking client compatibility
4. **Simplicity**: Client code remains simple and focused
5. **Reliability**: Agent ensures complete responses and proper error handling

## Migration Strategy

When updating the client to work with an evolved agent:
1. Keep the same agent communication endpoints
2. Update only the agent's internal implementation
3. Ensure agent maintains backward compatibility for client requests
4. Test that existing client code continues to work without modification

This specification ensures a clean separation between the client application and the agent's internal workflow management.
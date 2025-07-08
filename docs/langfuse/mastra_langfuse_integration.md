### 13. Advanced Tool Call Analysis Features

#### Performance Monitoring
```typescript
// Create custom metrics for tool call performance
export function createToolCallMetrics() {
  return {
    trackToolCallDuration: (toolName: string, duration: number) => {
      langfuse.event({
        name: 'tool-call-performance',
        metadata: {
          toolName,
          duration,
          performanceCategory: duration > 5000 ? 'slow' : duration > 1000 ? 'medium' : 'fast',
        },
      });
    },

    trackToolCallError: (toolName: string, error: Error) => {
      langfuse.event({
        name: 'tool-call-error',
        metadata: {
          toolName,
          errorType: error.constructor.name,
          errorMessage: error.# Langfuse Integration Guide for Mastra Business Intelligence Agent

This guide provides the proper way to integrate Langfuse observability into your dental manufacturing business intelligence Mastra agent, focusing on agent-level configuration for a React 19 + Vite 7 client application.

## Overview

Your dental manufacturing business intelligence agent requires comprehensive observability to track complex BI workflows, database queries, vector searches, and RAG operations. Langfuse integration will capture all agent interactions, including the extensive tool usage and high step counts (1,000,000 maxSteps) configured for BI operations.

## Prerequisites

- Existing Mastra project with business intelligence agent
- Langfuse account (cloud or self-hosted)  
- pnpm as package manager
- React 19 + Vite 7 client application architecture
- PostgreSQL with vector store capabilities

## Installation

Install the required Langfuse package using pnpm:

```bash
pnpm add langfuse-vercel
```

## Environment Configuration

Add Langfuse credentials to your environment configuration:

```env
# Your LLM API keys
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dental_manufacturing
POSTGRES_VECTOR_CONNECTION_STRING=postgresql://user:password@localhost:5432/dental_manufacturing

# Langfuse credentials
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com  # Optional, defaults to cloud.langfuse.com

# Server configuration
PORT=4113
HOST=0.0.0.0
```

## Complete Prompt, Response, and Tool Call Logging Configuration

To ensure ALL prompts, responses, AND tool calls are captured for every agent, you need to configure several aspects including tool call instrumentation:

### 1. Enhanced Langfuse Exporter Configuration for Tool Call Capture

```typescript
// Create Langfuse exporter with comprehensive logging configuration including tool calls
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  // Optimize for complete prompt/response/tool capture
  flushAt: 1, // Send every single event immediately
  flushInterval: 1000, // Flush every second as backup
  // Ensure ALL data is captured including tool calls
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  // Enhanced metadata for tool call tracking
  metadata: {
    industry: 'dental-manufacturing',
    agentTypes: ['database', 'bedrock', 'business-intelligence', 'migration'],
    maxSteps: 1000000,
    hasVectorSearch: true,
    hasRAG: true,
    hasMCPTools: true,
    captureMode: 'complete-with-tools',
    toolCallLogging: true,
    environment: process.env.NODE_ENV || 'development',
  },
  // Additional configuration for tool call capture
  captureToolCalls: true, // If supported by langfuse-vercel
  captureToolResponses: true, // If supported by langfuse-vercel
});
```

### 2. Enhanced Telemetry Configuration for Tool Call Capture

```typescript
telemetry: {
  serviceName: "ai", // CRITICAL: Must be "ai" for LangfuseExporter
  enabled: true,
  sampling: {
    type: "always_on", // Capture ALL agent interactions including tool calls
    probability: 1.0, // Ensure 100% capture rate
  },
  export: {
    type: "custom",
    exporter: langfuseExporter,
  },
  // Enhanced telemetry options for tool calls
  instrumentations: {
    // Instrument all AI SDK operations including tool calls
    aiSdk: {
      enabled: true,
      captureToolCalls: true,
      captureToolResults: true,
    },
    // Instrument HTTP requests for MCP tools
    http: {
      enabled: true,
      captureHeaders: true,
      captureBody: true,
    },
  },
},
```

### 3. MCP Tool Call Instrumentation

Create a wrapper around your MCP client to log all tool interactions:

```typescript
// Enhanced MCP client with Langfuse logging
import { mcpClient as originalMcpClient } from '../mcp-config';
import { langfuse } from 'langfuse';

class InstrumentedMCPClient {
  private mcpClient = originalMcpClient;
  private langfuseClient = langfuse;

  async getTools() {
    const trace = this.langfuseClient.trace({
      name: 'mcp-get-tools',
      metadata: {
        operation: 'getTools',
        client: 'mcp',
      },
    });

    try {
      const tools = await this.mcpClient.getTools();
      trace.update({
        output: { toolCount: Object.keys(tools).length, toolNames: Object.keys(tools) },
      });
      return tools;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw error;
    }
  }

  // Wrap tool calls with Langfuse tracing
  async callTool(toolName: string, args: any) {
    const trace = this.langfuseClient.trace({
      name: `mcp-tool-call-${toolName}`,
      input: { toolName, args },
      metadata: {
        operation: 'callTool',
        toolName,
        client: 'mcp',
        timestamp: new Date().toISOString(),
      },
    });

    try {
      const result = await this.mcpClient.callTool(toolName, args);
      trace.update({
        output: result,
        metadata: {
          success: true,
          resultSize: JSON.stringify(result).length,
        },
      });
      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        metadata: {
          success: false,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      });
      throw error;
    }
  }
}

export const instrumentedMcpClient = new InstrumentedMCPClient();
```

### 4. Enhanced Agent Configuration with Tool Call Logging

```typescript
// Enhanced Business Intelligence Agent with complete tool call telemetry
export const businessIntelligenceAgent = new Agent({
  name: 'Business Intelligence Agent',
  instructions: generateDentalBraceBIInstructions(),
  model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
  memory: new Memory({
    storage: getSharedPostgresStore(),
    vector: getSharedPgVector(),
    embedder: bedrock.embedding('amazon.titan-embed-text-v2:0'),
  }),
  tools: async () => {
    try {
      // Use instrumented MCP client for tool call logging
      const tools = await instrumentedMcpClient.getTools();
      logger.info('🔧 BI AGENT TOOLS LOADED', {
        toolCount: Object.keys(tools).length,
        toolNames: Object.keys(tools),
        agentName: 'business-intelligence',
      });
      return tools;
    } catch (error) {
      logger.warn('MCP tools unavailable for BI agent, using fallback mode', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  },
  defaultGenerateOptions: {
    maxSteps: 1000000,
    // Enhanced telemetry for tool calls
    telemetry: {
      isEnabled: true,
      recordInputs: true,  // Capture all prompts
      recordOutputs: true, // Capture all responses
      recordToolCalls: true, // Capture tool call requests
      recordToolResults: true, // Capture tool call responses
      functionId: 'business-intelligence-agent',
      metadata: {
        agentType: 'business-intelligence',
        industry: 'dental-manufacturing',
        capabilities: ['analytics', 'reporting', 'forecasting'],
        toolsEnabled: true,
        mcpToolsAvailable: true,
      },
    },
  },
  defaultStreamOptions: {
    maxSteps: 1000000,
    // Enhanced telemetry for streaming tool calls
    telemetry: {
      isEnabled: true,
      recordInputs: true,  // Capture all prompts
      recordOutputs: true, // Capture all responses
      recordToolCalls: true, // Capture tool call requests
      recordToolResults: true, // Capture tool call responses
      functionId: 'business-intelligence-agent-stream',
      metadata: {
        agentType: 'business-intelligence-stream',
        industry: 'dental-manufacturing',
        streamMode: true,
        toolsEnabled: true,
      },
    },
  },
});
```

### 5. Custom Tool Call Logging Middleware

Create middleware to log all tool interactions:

```typescript
// Tool call logging middleware
export function createToolCallLogger(agentName: string) {
  return {
    beforeToolCall: async (toolName: string, args: any) => {
      const trace = langfuse.trace({
        name: `${agentName}-tool-call-${toolName}`,
        input: { toolName, args },
        metadata: {
          agent: agentName,
          operation: 'tool-call-request',
          toolName,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(`🔧 TOOL CALL START: ${agentName} -> ${toolName}`, {
        agentName,
        toolName,
        args: JSON.stringify(args).substring(0, 500) + '...',
        traceId: trace.id,
      });

      return trace;
    },

    afterToolCall: async (trace: any, toolName: string, result: any, error?: Error) => {
      if (error) {
        trace.update({
          output: { error: error.message },
          metadata: {
            success: false,
            errorType: error.constructor.name,
          },
        });

        logger.error(`❌ TOOL CALL ERROR: ${toolName}`, {
          toolName,
          error: error.message,
          traceId: trace.id,
        });
      } else {
        trace.update({
          output: result,
          metadata: {
            success: true,
            resultSize: JSON.stringify(result).length,
          },
        });

        logger.info(`✅ TOOL CALL SUCCESS: ${toolName}`, {
          toolName,
          resultPreview: JSON.stringify(result).substring(0, 200) + '...',
          traceId: trace.id,
        });
      }
    },
  };
}
```

### 6. Vector Store Operations with Tool Call Logging

Enhance your vector store operations to include tool call logging:

```typescript
// Enhanced vector store operations with tool call logging
export async function addDocumentsToVectorStore(
  indexName: string,
  documents: Array<{ text: string; metadata?: Record<string, unknown> }>,
): Promise<string[]> {
  const trace = langfuse.trace({
    name: 'vector-store-add-documents',
    input: { indexName, documentCount: documents.length },
    metadata: {
      operation: 'addDocuments',
      indexName,
      documentCount: documents.length,
      toolType: 'vector-store',
    },
  });

  try {
    logger.info('📊 VECTOR TOOL CALL: Adding documents', {
      indexName,
      documentCount: documents.length,
      operation: 'addDocuments',
      traceId: trace.id,
    });

    const result = await vectorStore.addDocuments(indexName, documents);

    trace.update({
      output: { documentIds: result, count: result.length },
      metadata: { success: true },
    });

    logger.info('✅ VECTOR TOOL SUCCESS: Documents added', {
      indexName,
      addedCount: result.length,
      traceId: trace.id,
    });

    return result;
  } catch (error) {
    trace.update({
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      metadata: { success: false },
    });

    logger.error('❌ VECTOR TOOL ERROR: Failed to add documents', {
      indexName,
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId: trace.id,
    });

    throw error;
  }
}

export async function queryVectorStore(
  indexName: string,
  query: string,
  options?: {
    topK?: number;
    filter?: Record<string, unknown>;
    minScore?: number;
  },
): Promise<
  Array<{
    id: string;
    text: string;
    score: number;
    metadata: Record<string, unknown>;
  }>
> {
  const trace = langfuse.trace({
    name: 'vector-store-query',
    input: { indexName, query, options },
    metadata: {
      operation: 'query',
      indexName,
      queryLength: query.length,
      topK: options?.topK,
      toolType: 'vector-store',
    },
  });

  try {
    logger.info('🔍 VECTOR TOOL CALL: Querying vector store', {
      indexName,
      queryLength: query.length,
      topK: options?.topK,
      operation: 'query',
      traceId: trace.id,
    });

    const results = await vectorStore.query(indexName, query, options);

    trace.update({
      output: { 
        resultCount: results.length,
        topScore: results[0]?.score,
        results: results.map(r => ({ id: r.id, score: r.score }))
      },
      metadata: { success: true },
    });

    logger.info('✅ VECTOR TOOL SUCCESS: Query completed', {
      indexName,
      resultCount: results.length,
      topScore: results[0]?.score,
      traceId: trace.id,
    });

    return results;
  } catch (error) {
    trace.update({
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      metadata: { success: false },
    });

    logger.error('❌ VECTOR TOOL ERROR: Query failed', {
      indexName,
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId: trace.id,
    });

    throw error;
  }
}
```

### 7. Database Tool Call Instrumentation

Enhance database operations with tool call logging:

```typescript
// Enhanced database operations with tool call logging
import { PinoLogger } from '@mastra/loggers';
import { langfuse } from 'langfuse';

const dbLogger = new PinoLogger({ name: 'DatabaseToolCalls' });

export function instrumentDatabaseQueries(dbClient: any) {
  const originalQuery = dbClient.query.bind(dbClient);

  dbClient.query = async function(sql: string, params?: any[]) {
    const trace = langfuse.trace({
      name: 'database-query',
      input: { sql: sql.substring(0, 500) + '...', paramCount: params?.length || 0 },
      metadata: {
        operation: 'database-query',
        toolType: 'database',
        sqlLength: sql.length,
        hasParams: !!params?.length,
      },
    });

    try {
      dbLogger.info('🗄️ DATABASE TOOL CALL: Executing query', {
        sqlPreview: sql.substring(0, 200) + '...',
        paramCount: params?.length || 0,
        traceId: trace.id,
      });

      const result = await originalQuery(sql, params);

      trace.update({
        output: { 
          rowCount: result.rowCount || result.length,
          command: result.command || 'SELECT',
        },
        metadata: { success: true },
      });

      dbLogger.info('✅ DATABASE TOOL SUCCESS: Query executed', {
        rowCount: result.rowCount || result.length,
        command: result.command || 'SELECT',
        traceId: trace.id,
      });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { success: false },
      });

      dbLogger.error('❌ DATABASE TOOL ERROR: Query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId: trace.id,
      });

      throw error;
    }
  };

  return dbClient;
}
```

### 1. Langfuse Exporter Configuration for Complete Capture

```typescript
// Create Langfuse exporter with comprehensive logging configuration including tool calls
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  // Optimize for complete prompt/response/tool capture
  flushAt: 1, // Send every single event immediately
  flushInterval: 1000, // Flush every second as backup
  // Ensure ALL data is captured including tool calls
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  // Enhanced metadata for tool call tracking
  metadata: {
    industry: 'dental-manufacturing',
    agentTypes: ['database', 'bedrock', 'business-intelligence', 'migration'],
    maxSteps: 1000000,
    hasVectorSearch: true,
    hasRAG: true,
    hasMCPTools: true,
    captureMode: 'complete-with-tools',
    toolCallLogging: true,
    environment: process.env.NODE_ENV || 'development',
  },
  // Additional configuration for tool call capture
  captureToolCalls: true, // If supported by langfuse-vercel
  captureToolResponses: true, // If supported by langfuse-vercel
});
```

### 2. Telemetry Configuration for 100% Capture

```typescript
telemetry: {
  serviceName: "ai", // CRITICAL: Must be "ai" for LangfuseExporter
  enabled: true,
  sampling: {
    type: "always_on", // Capture ALL agent interactions
    probability: 1.0, // Ensure 100% capture rate
  },
  export: {
    type: "custom",
    exporter: langfuseExporter,
  },
},
```

### 3. Individual Agent Configuration for Complete Logging

Ensure each agent has telemetry settings that capture all inputs/outputs:

```typescript
// Enhanced Business Intelligence Agent with complete telemetry
export const businessIntelligenceAgent = new Agent({
  name: 'Business Intelligence Agent',
  instructions: generateDentalBraceBIInstructions(),
  model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
  memory: new Memory({
    storage: getSharedPostgresStore(),
    vector: getSharedPgVector(),
    embedder: bedrock.embedding('amazon.titan-embed-text-v2:0'),
  }),
  tools: async () => {
    try {
      return await mcpClient.getTools();
    } catch (error) {
      logger.warn('MCP tools unavailable for BI agent, using fallback mode', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  },
  defaultGenerateOptions: {
    maxSteps: 1000000,
    // Enable telemetry for all generation calls
    telemetry: {
      isEnabled: true,
      recordInputs: true,  // Capture all prompts
      recordOutputs: true, // Capture all responses
      functionId: 'business-intelligence-agent',
      metadata: {
        agentType: 'business-intelligence',
        industry: 'dental-manufacturing',
        capabilities: ['analytics', 'reporting', 'forecasting'],
      },
    },
  },
  defaultStreamOptions: {
    maxSteps: 1000000,
    // Enable telemetry for all streaming calls
    telemetry: {
      isEnabled: true,
      recordInputs: true,  // Capture all prompts
      recordOutputs: true, // Capture all responses
      functionId: 'business-intelligence-agent-stream',
      metadata: {
        agentType: 'business-intelligence-stream',
        industry: 'dental-manufacturing',
        streamMode: true,
      },
    },
  },
});
```

### 4. Enhanced Database Agent Configuration

```typescript
// Ensure database agent also has complete telemetry
const databaseAgent = new Agent({
  // ... existing configuration
  defaultGenerateOptions: {
    maxSteps: 1000000,
    telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
      functionId: 'database-agent',
      metadata: {
        agentType: 'database',
        hasPostgreSQL: true,
        hasMCPTools: true,
      },
    },
  },
  defaultStreamOptions: {
    maxSteps: 1000000,
    telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
      functionId: 'database-agent-stream',
      metadata: {
        agentType: 'database-stream',
        streamMode: true,
      },
    },
  },
});
```

### 5. Bedrock Agent Telemetry Enhancement

```typescript
// Enhanced Bedrock Agent with complete telemetry
const bedrockAgent = new Agent({
  // ... existing configuration
  defaultGenerateOptions: {
    maxSteps: 1000000,
    telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
      functionId: 'bedrock-agent',
      metadata: {
        agentType: 'bedrock',
        modelProvider: 'aws-bedrock',
        capabilities: ['general-purpose', 'text-generation'],
      },
    },
  },
  defaultStreamOptions: {
    maxSteps: 1000000,
    telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
      functionId: 'bedrock-agent-stream',
      metadata: {
        agentType: 'bedrock-stream',
        streamMode: true,
      },
    },
  },
});
```

### 6. Migration Agent Complete Logging

```typescript
// Enhanced Migration Agent with complete telemetry
const migrationAgent = new Agent({
  // ... existing configuration
  defaultGenerateOptions: {
    maxSteps: 1000000,
    telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
      functionId: 'migration-agent',
      metadata: {
        agentType: 'migration',
        capabilities: ['data-migration', 'schema-updates'],
      },
    },
  },
  defaultStreamOptions: {
    maxSteps: 1000000,
    telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
      functionId: 'migration-agent-stream',
      metadata: {
        agentType: 'migration-stream',
        streamMode: true,
      },
    },
  },
});
```

Update your `src/mastra/index.ts` file to include Langfuse integration:

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PgVector } from '@mastra/pg';
import { LangfuseExporter } from 'langfuse-vercel';
import { bedrockAgent } from './agents/bedrock-agent';
import { businessIntelligenceAgent } from './agents/business-intelligence-agent';
import { getDatabaseAgentWithTools, getSharedPostgresStore } from './agents/database-agent';
import { migrationAgent } from './agents/migration-agent';
import { register } from './instrumentation.js';
import { openAIRoutes } from './openai';
import { validateEmbeddingEnvironment } from './rag/embedding-config.js';
import { EnhancedRetrievalService } from './rag/enhanced-retrieval.js';
import { ingestRagDocuments } from './rag/ingestion.js';
import { createMemoryStore, createVectorStore } from './vector-store.js';

// Initialize Pino logger with enhanced BI tracking
const logger = new PinoLogger({ 
  name: 'Dental-Manufacturing-BI-Mastra',
  level: 'info' 
});

// Register Langfuse instrumentation
register();

// Validate environment variables for embeddings
try {
  validateEmbeddingEnvironment();
  logger.info('✅ Embedding environment validated for dental manufacturing BI');
} catch (error) {
  logger.warn('⚠️ Embedding environment validation failed:', { error });
  logger.warn('Vector store features may not work properly for BI operations');
}

// Initialize agents
const databaseAgent = await getDatabaseAgentWithTools();

// Log business intelligence agent information for Langfuse tracing
logger.info('🔍 LANGFUSE PREP: Business intelligence agent configuration', {
  agentName: businessIntelligenceAgent.name,
  agentId: businessIntelligenceAgent.id ?? 'bi-agent',
  maxSteps: 1000000,
  hasVectorStore: true,
  hasRAG: true,
  hasMCPTools: true,
  industry: 'dental-manufacturing',
});

// Initialize PostgreSQL Vector Store
const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_VECTOR_CONNECTION_STRING ?? process.env.DATABASE_URL!,
  schemaName: 'vector_store',
});

// Initialize Enhanced Vector Store for advanced RAG operations
export const vectorStore = createVectorStore({
  connectionString: process.env.POSTGRES_VECTOR_CONNECTION_STRING ?? process.env.DATABASE_URL!,
  schemaName: 'vector_store',
  embeddingModel: 'bedrock-titan-v2',
});

// Initialize Memory Stores with Langfuse tracking
export const databaseAgentMemory = createMemoryStore(vectorStore, 'database-agent');
export const bedrockAgentMemory = createMemoryStore(vectorStore, 'bedrock-agent');
export const businessIntelligenceAgentMemory = createMemoryStore(
  vectorStore,
  'business-intelligence-agent',
);

// Initialize memory stores with BI-specific logging
async function initializeMemoryStores(): Promise<void> {
  try {
    await databaseAgentMemory.initialize();
    await bedrockAgentMemory.initialize();
    await businessIntelligenceAgentMemory.initialize();
    logger.info('✅ BI agent memory stores initialized for Langfuse tracking');
  } catch (error) {
    logger.error('❌ Failed to initialize BI memory stores:', { error });
  }
}

// Initialize RAG services for dental manufacturing BI
const retrievalService = new EnhancedRetrievalService(vectorStore);
initializeMemoryStores().catch(error =>
  logger.error('Failed to initialize BI memory stores:', { error }),
);
ingestRagDocuments(vectorStore, retrievalService).catch(error =>
  logger.error('Failed to ingest dental manufacturing RAG documents:', { error }),
);

// Use shared PostgresStore instance
const storage = getSharedPostgresStore();

// Create Langfuse exporter with comprehensive logging configuration
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  // Optimize for complete prompt/response capture
  flushAt: 1, // Send every single event immediately
  flushInterval: 1000, // Flush every second as backup
  // Ensure ALL data is captured
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  // Add comprehensive metadata for all agents
  metadata: {
    industry: 'dental-manufacturing',
    agentTypes: ['database', 'bedrock', 'business-intelligence', 'migration'],
    maxSteps: 1000000,
    hasVectorSearch: true,
    hasRAG: true,
    captureMode: 'complete',
    environment: process.env.NODE_ENV || 'development',
  },
});

export const mastra = new Mastra({
  workflows: {
    // Workflow stubs temporarily disabled due to Mastra API compatibility issues
  },
  agents: {
    databaseAgent,
    bedrockAgent,
    businessIntelligenceAgent,
    migrationAgent,
  },
  vectors: {
    pgVector,
  },
  server: {
    port: parseInt(process.env.PORT ?? '4113', 10),
    host: process.env.HOST ?? '0.0.0.0',
    apiRoutes: openAIRoutes,
    build: {
      openAPIDocs: true,
      swaggerUI: true,
    },
    middleware: [
      async (c, next) => {
        const path = c.req.path;
        const method = c.req.method;
        
        // Enhanced logging for BI agent requests
        if (path.includes('businessIntelligenceAgent') || path.includes('business-intelligence')) {
          logger.info('🏭 DENTAL BI REQUEST:', {
            method,
            path,
            timestamp: new Date().toISOString(),
            userAgent: c.req.header('User-Agent'),
          });
        }

        await next();
      },
    ],
  },
  storage: storage,
  logger: new PinoLogger({
    name: 'Dental-Manufacturing-Mastra',
    level: 'info',
  }),
  telemetry: {
    serviceName: "ai", // CRITICAL: Must be "ai" for LangfuseExporter
    enabled: true,
    sampling: {
      type: "always_on", // Capture ALL agent interactions
      probability: 1.0, // Ensure 100% capture rate
    },
    export: {
      type: "custom",
      exporter: langfuseExporter,
    },
  },
});

// Enhanced logging for Langfuse integration
logger.info('🚀 LANGFUSE INTEGRATED: Dental Manufacturing BI Mastra initialized', {
  registeredAgents: ['databaseAgent', 'bedrockAgent', 'businessIntelligenceAgent', 'migrationAgent'],
  langfuseEnabled: true,
  serviceName: "ai",
  samplingType: "always_on",
  industry: 'dental-manufacturing',
  maxStepsPerAgent: 1000000,
  vectorStoreEnabled: true,
  ragEnabled: true,
});

// Export convenience functions for RAG operations (now with Langfuse tracking)
export async function addDocumentsToVectorStore(
  indexName: string,
  documents: Array<{ text: string; metadata?: Record<string, unknown> }>,
): Promise<string[]> {
  logger.info('📊 BI VECTOR OPERATION: Adding documents', {
    indexName,
    documentCount: documents.length,
    operation: 'addDocuments',
  });
  return vectorStore.addDocuments(indexName, documents);
}

export async function queryVectorStore(
  indexName: string,
  query: string,
  options?: {
    topK?: number;
    filter?: Record<string, unknown>;
    minScore?: number;
  },
): Promise<
  Array<{
    id: string;
    text: string;
    score: number;
    metadata: Record<string, unknown>;
  }>
> {
  logger.info('🔍 BI VECTOR QUERY:', {
    indexName,
    queryLength: query.length,
    topK: options?.topK,
    operation: 'queryVectorStore',
  });
  return vectorStore.query(indexName, query, options);
}

export async function createVectorIndex(indexName: string): Promise<void> {
  logger.info('🏗️ BI VECTOR INDEX: Creating index', {
    indexName,
    operation: 'createIndex',
  });
  return vectorStore.createIndex(indexName);
}

// Export agents and stores for direct access
export { bedrockAgent, businessIntelligenceAgent, databaseAgent, pgVector };

// Graceful shutdown with Langfuse cleanup
async function gracefulShutdown(): Promise<void> {
  logger.info('🔄 Shutting down dental manufacturing BI system gracefully...');
  try {
    // Flush any pending Langfuse traces
    await langfuseExporter.flush();
    logger.info('✅ Langfuse traces flushed');
    
    await vectorStore.disconnect();
    logger.info('✅ Vector store disconnected');
  } catch (error) {
    logger.error('❌ Error during shutdown:', { error });
  }
}

process.on('SIGINT', () => {
  gracefulShutdown()
    .catch(error => logger.error('❌ Error during SIGINT shutdown:', { error }))
    .finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  gracefulShutdown()
    .catch(error => logger.error('❌ Error during SIGTERM shutdown:', { error }))
    .finally(() => process.exit(0));
});

process.on('uncaughtException', error => {
  logger.error('❌ Uncaught Exception:', { error });
  gracefulShutdown()
    .catch(shutdownError =>
      logger.error('❌ Error during exception shutdown:', { error: shutdownError }),
    )
    .finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', { promise, reason });
  gracefulShutdown()
    .catch(shutdownError =>
      logger.error('❌ Error during rejection shutdown:', { error: shutdownError }),
    )
    .finally(() => process.exit(1));
});
```

## Business Intelligence Agent Specific Configuration

Your dental manufacturing BI agent already has excellent configuration for Langfuse tracking:

### High Step Count Tracking
```typescript
defaultGenerateOptions: {
  maxSteps: 1000000, // Will be tracked in Langfuse
},
defaultStreamOptions: {
  maxSteps: 1000000, // Will be tracked in Langfuse
},
```

### Context-Aware Operations
The agent's context-aware features will provide rich trace data:
- User permissions and company context
- Business capabilities tracking
- Memory configuration with vector search
- MCP tool usage patterns
- RAG document retrieval operations

## React 19 + Vite 7 Client Integration

### Development Server Setup

For your Vite development environment, create a proxy configuration:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4113',
        changeOrigin: true,
        secure: false,
      },
      '/swagger-ui': {
        target: 'http://localhost:4113',
        changeOrigin: true,
        secure: false,
      },
      '/openapi.json': {
        target: 'http://localhost:4113',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'esnext', // Support for React 19
  },
})
```

### Client-Side Langfuse Integration

For additional client-side tracking in your React 19 app:

```bash
pnpm add langfuse
```

```typescript
// src/utils/langfuse-client.ts
import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
  secretKey: import.meta.env.VITE_LANGFUSE_SECRET_KEY,
  baseUrl: import.meta.env.VITE_LANGFUSE_HOST,
});

// Track client-side BI operations
export function trackBIQuery(query: string, agentResponse: string, metadata?: Record<string, any>) {
  langfuse.trace({
    name: 'dental-bi-client-query',
    input: query,
    output: agentResponse,
    metadata: {
      client: 'react-19-vite-7',
      industry: 'dental-manufacturing',
      ...metadata,
    },
  });
}
```

### Environment Variables for Client

```env
# .env.local (for client-side)
VITE_LANGFUSE_PUBLIC_KEY=pk-lf-...
VITE_LANGFUSE_SECRET_KEY=sk-lf-...  # Only if needed for client tracking
VITE_LANGFUSE_HOST=https://cloud.langfuse.com
VITE_MASTRA_API_URL=http://localhost:4113
```

### 8. Environment Variables for Complete Tool Call Logging

Add these environment variables to ensure maximum tool call capture:

```env
# Langfuse Configuration
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Enhanced Telemetry Settings for Tool Calls
MASTRA_TELEMETRY_ENABLED=true
LANGFUSE_TRACING=true
LANGFUSE_DEBUG=true
LANGFUSE_CAPTURE_TOOL_CALLS=true
LANGFUSE_CAPTURE_TOOL_RESULTS=true

# Tool Call Logging Configuration
LANGFUSE_FLUSH_AT=1  # Send every event immediately
LANGFUSE_FLUSH_INTERVAL=1000  # Backup flush every second
LANGFUSE_SAMPLE_RATE=1.0  # Capture 100% of events including tool calls

# MCP Tool Logging
MCP_TOOL_LOGGING=true
MCP_DEBUG=true

# Vector Store Tool Logging
VECTOR_STORE_LOGGING=true
VECTOR_QUERY_LOGGING=true

# Database Tool Logging
DATABASE_TOOL_LOGGING=true
DATABASE_QUERY_LOGGING=true

# Additional tracking
NODE_ENV=development  # or production
```

### 9. Complete Implementation in src/mastra/index.ts

Here's how to integrate all the tool call logging into your main file:

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PgVector } from '@mastra/pg';
import { LangfuseExporter } from 'langfuse-vercel';
import { langfuse } from 'langfuse';
import { bedrockAgent } from './agents/bedrock-agent';
import { businessIntelligenceAgent } from './agents/business-intelligence-agent';
import { getDatabaseAgentWithTools, getSharedPostgresStore } from './agents/database-agent';
import { migrationAgent } from './agents/migration-agent';
import { register } from './instrumentation.js';
import { openAIRoutes } from './openai';
import { validateEmbeddingEnvironment } from './rag/embedding-config.js';
import { EnhancedRetrievalService } from './rag/enhanced-retrieval.js';
import { ingestRagDocuments } from './rag/ingestion.js';
import { createMemoryStore, createVectorStore } from './vector-store.js';
import { instrumentedMcpClient, createToolCallLogger, instrumentDatabaseQueries } from './tool-logging';

// Initialize enhanced logger for tool call tracking
const logger = new PinoLogger({ 
  name: 'Dental-Manufacturing-BI-Mastra-Tools',
  level: 'info' 
});

// Initialize Langfuse client for direct tool call logging
const langfuseClient = langfuse.init({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Register Langfuse instrumentation
register();

// Validate environment with tool call logging
try {
  validateEmbeddingEnvironment();
  logger.info('✅ Embedding environment validated for tool call logging');
} catch (error) {
  logger.warn('⚠️ Embedding environment validation failed:', { error });
}

// Initialize agents with tool call logging
const databaseAgent = await getDatabaseAgentWithTools();

// Create tool call loggers for each agent
const biToolLogger = createToolCallLogger('business-intelligence');
const dbToolLogger = createToolCallLogger('database');
const bedrockToolLogger = createToolCallLogger('bedrock');
const migrationToolLogger = createToolCallLogger('migration');

// Initialize PostgreSQL Vector Store with instrumentation
const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_VECTOR_CONNECTION_STRING ?? process.env.DATABASE_URL!,
  schemaName: 'vector_store',
});

// Initialize Enhanced Vector Store with tool call logging
export const vectorStore = createVectorStore({
  connectionString: process.env.POSTGRES_VECTOR_CONNECTION_STRING ?? process.env.DATABASE_URL!,
  schemaName: 'vector_store',
  embeddingModel: 'bedrock-titan-v2',
});

// Instrument database connections for tool call logging
const storage = instrumentDatabaseQueries(getSharedPostgresStore());

// Create enhanced Langfuse exporter with tool call configuration
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  flushAt: 1,
  flushInterval: 1000,
  debug: process.env.NODE_ENV === 'development',
  metadata: {
    industry: 'dental-manufacturing',
    agentTypes: ['database', 'bedrock', 'business-intelligence', 'migration'],
    maxSteps: 1000000,
    hasVectorSearch: true,
    hasRAG: true,
    hasMCPTools: true,
    captureMode: 'complete-with-tools',
    toolCallLogging: true,
    environment: process.env.NODE_ENV || 'development',
  },
});

export const mastra = new Mastra({
  workflows: {},
  agents: {
    databaseAgent,
    bedrockAgent,
    businessIntelligenceAgent,
    migrationAgent,
  },
  vectors: {
    pgVector,
  },
  server: {
    port: parseInt(process.env.PORT ?? '4113', 10),
    host: process.env.HOST ?? '0.0.0.0',
    apiRoutes: openAIRoutes,
    build: {
      openAPIDocs: true,
      swaggerUI: true,
    },
    middleware: [
      async (c, next) => {
        const path = c.req.path;
        const method = c.req.method;
        
        // Enhanced logging for agent requests with tool call tracking
        if (path.includes('Agent') || path.includes('agent')) {
          logger.info('🏭 AGENT REQUEST WITH TOOL TRACKING:', {
            method,
            path,
            timestamp: new Date().toISOString(),
            toolLoggingEnabled: true,
          });
        }

        await next();
      },
    ],
  },
  storage: storage,
  logger: new PinoLogger({
    name: 'Dental-Manufacturing-Mastra-Tools',
    level: 'info',
  }),
  telemetry: {
    serviceName: "ai",
    enabled: true,
    sampling: {
      type: "always_on",
      probability: 1.0,
    },
    export: {
      type: "custom",
      exporter: langfuseExporter,
    },
    // Enhanced instrumentation for tool calls
    instrumentations: {
      aiSdk: {
        enabled: true,
        captureToolCalls: true,
        captureToolResults: true,
      },
      http: {
        enabled: true,
        captureHeaders: true,
        captureBody: true,
      },
    },
  },
});

logger.info('🚀 LANGFUSE + TOOL CALL LOGGING: Dental Manufacturing BI system initialized', {
  registeredAgents: ['databaseAgent', 'bedrockAgent', 'businessIntelligenceAgent', 'migrationAgent'],
  langfuseEnabled: true,
  toolCallLogging: true,
  vectorStoreInstrumented: true,
  databaseInstrumented: true,
  mcpToolsInstrumented: true,
  serviceName: "ai",
});
```

### 10. Testing Tool Call Logging

Test each agent to verify tool calls are being logged:

```bash
# Test BI agent with database tool calls
curl -X POST http://localhost:4113/api/agents/businessIntelligenceAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Show me the latest sales data for dental braces and analyze the trends using database queries"
      }
    ]
  }'

# Test database agent with direct SQL tool calls
curl -X POST http://localhost:4113/api/agents/databaseAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Query the production table to show manufacturing efficiency metrics"
      }
    ]
  }'

# Test vector search tool calls
curl -X POST http://localhost:4113/api/agents/businessIntelligenceAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Search for similar manufacturing issues in our knowledge base and provide recommendations"
      }
    ]
  }'
```

### 11. Monitoring Tool Calls in Langfuse

In your Langfuse dashboard, you'll now see detailed traces for:

#### Agent-Level Traces
- Service name: "ai"
- Function IDs for each agent
- Complete conversation flow

#### Tool Call Sub-Traces
- **MCP Tool Calls**: `mcp-tool-call-{toolName}`
- **Vector Store Operations**: `vector-store-{operation}`
- **Database Queries**: `database-query`
- **RAG Operations**: `rag-{operation}`

#### Trace Hierarchy Example
```
📊 business-intelligence-agent
├── 🔧 mcp-tool-call-query_sales_data
│   ├── Request: { table: "sales", filters: {...} }
│   └── Response: { rows: [...], count: 150 }
├── 🔍 vector-store-query
│   ├── Request: { query: "manufacturing efficiency", topK: 5 }
│   └── Response: { results: [...], scores: [...] }
└── 📈 Final Response: "Based on the data analysis..."
```

### 13. Advanced Tool Call Analysis Features

#### Performance Monitoring
```typescript
// Create custom metrics for tool call performance
export function createToolCallMetrics() {
  return {
    trackToolCallDuration: (toolName: string, duration: number) => {
      langfuse.event({
        name: 'tool-call-performance',
        metadata: {
          toolName,
          duration,
          performanceCategory: duration > 5000 ? 'slow' : duration > 1000 ? 'medium' : 'fast',
        },
      });
    },

    trackToolCallError: (toolName: string, error: Error) => {
      langfuse.event({
        name: 'tool-call-error',
        metadata: {
          toolName,
          errorType: error.constructor.name,
          errorMessage: error.message,
          stackTrace: error.stack?.substring(0, 500),
        },
      });
    },

    trackToolCallSuccess: (toolName: string, resultSize: number) => {
      langfuse.event({
        name: 'tool-call-success',
        metadata: {
          toolName,
          resultSize,
          sizeCategory: resultSize > 10000 ? 'large' : resultSize > 1000 ? 'medium' : 'small',
        },
      });
    },
  };
}

const toolMetrics = createToolCallMetrics();
```

#### Tool Call Chain Analysis
```typescript
// Track complex tool call chains for BI operations
export function createToolCallChainTracker() {
  const activeChains = new Map<string, any>();

  return {
    startChain: (chainId: string, agentName: string, initialPrompt: string) => {
      const chain = langfuse.trace({
        name: `tool-chain-${agentName}`,
        input: { initialPrompt },
        metadata: {
          chainId,
          agentName,
          startTime: new Date().toISOString(),
          toolCallCount: 0,
        },
      });
      activeChains.set(chainId, chain);
      return chain;
    },

    addToolCall: (chainId: string, toolName: string, args: any, result: any) => {
      const chain = activeChains.get(chainId);
      if (chain) {
        const currentCount = chain.metadata?.toolCallCount || 0;
        chain.update({
          metadata: {
            ...chain.metadata,
            toolCallCount: currentCount + 1,
            [`tool_${currentCount + 1}`]: {
              name: toolName,
              argsSize: JSON.stringify(args).length,
              resultSize: JSON.stringify(result).length,
            },
          },
        });
      }
    },

    endChain: (chainId: string, finalResponse: string) => {
      const chain = activeChains.get(chainId);
      if (chain) {
        chain.update({
          output: { finalResponse },
          metadata: {
            ...chain.metadata,
            endTime: new Date().toISOString(),
            completed: true,
          },
        });
        activeChains.delete(chainId);
      }
    },
  };
}

const chainTracker = createToolCallChainTracker();
```

### 14. Dental Manufacturing Specific Tool Call Patterns

#### Manufacturing Data Analysis Tools
```typescript
// Specialized tool call logging for dental manufacturing
export function createDentalManufacturingToolLogger() {
  return {
    logProductionQuery: async (query: string, results: any) => {
      const trace = langfuse.trace({
        name: 'dental-production-analysis',
        input: { query },
        output: results,
        metadata: {
          industry: 'dental-manufacturing',
          analysisType: 'production',
          dataPoints: Array.isArray(results) ? results.length : 1,
          toolCategory: 'manufacturing-analytics',
        },
      });

      logger.info('🦷 DENTAL PRODUCTION ANALYSIS:', {
        queryType: 'production',
        resultCount: Array.isArray(results) ? results.length : 1,
        traceId: trace.id,
      });

      return trace;
    },

    logQualityMetrics: async (metrics: any) => {
      const trace = langfuse.trace({
        name: 'dental-quality-metrics',
        input: { requestedMetrics: Object.keys(metrics) },
        output: metrics,
        metadata: {
          industry: 'dental-manufacturing',
          analysisType: 'quality',
          metricsCount: Object.keys(metrics).length,
          toolCategory: 'quality-control',
        },
      });

      logger.info('📊 DENTAL QUALITY METRICS:', {
        metricsCount: Object.keys(metrics).length,
        metricsTypes: Object.keys(metrics),
        traceId: trace.id,
      });

      return trace;
    },

    logSupplyChainAnalysis: async (analysis: any) => {
      const trace = langfuse.trace({
        name: 'dental-supply-chain-analysis',
        input: { analysisRequest: 'supply-chain-optimization' },
        output: analysis,
        metadata: {
          industry: 'dental-manufacturing',
          analysisType: 'supply-chain',
          optimizationAreas: analysis.optimizationAreas?.length || 0,
          toolCategory: 'supply-chain',
        },
      });

      logger.info('🚚 DENTAL SUPPLY CHAIN ANALYSIS:', {
        optimizationAreas: analysis.optimizationAreas?.length || 0,
        costSavings: analysis.potentialSavings || 'N/A',
        traceId: trace.id,
      });

      return trace;
    },
  };
}

const dentalToolLogger = createDentalManufacturingToolLogger();
```

### 15. Real-time Tool Call Monitoring

#### WebSocket Integration for Live Monitoring
```typescript
// Real-time tool call monitoring for development
export function createRealtimeToolMonitor() {
  const websockets = new Set<WebSocket>();

  return {
    addClient: (ws: WebSocket) => {
      websockets.add(ws);
      ws.on('close', () => websockets.delete(ws));
    },

    broadcastToolCall: (toolCall: any) => {
      const message = JSON.stringify({
        type: 'tool-call',
        timestamp: new Date().toISOString(),
        data: toolCall,
      });

      websockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    },

    broadcastToolResult: (toolResult: any) => {
      const message = JSON.stringify({
        type: 'tool-result',
        timestamp: new Date().toISOString(),
        data: toolResult,
      });

      websockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    },
  };
}
```

### 16. Tool Call Debugging and Troubleshooting

#### Debug Mode Configuration
```typescript
// Enhanced debugging for tool calls
if (process.env.NODE_ENV === 'development' || process.env.TOOL_CALL_DEBUG === 'true') {
  // Override console.log to include Langfuse tracing
  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    originalConsoleLog(...args);
    
    // Log debug messages to Langfuse for tool call debugging
    if (args.some(arg => typeof arg === 'string' && arg.includes('TOOL'))) {
      langfuse.event({
        name: 'debug-tool-call',
        metadata: {
          debugMessage: args.join(' '),
          timestamp: new Date().toISOString(),
          source: 'console-debug',
        },
      });
    }
  };
}
```

#### Common Tool Call Issues and Solutions
```typescript
// Tool call error handling and recovery
export function createToolCallErrorHandler() {
  return {
    handleMCPToolError: async (toolName: string, error: Error, retryCount = 0) => {
      const trace = langfuse.trace({
        name: 'mcp-tool-error-handling',
        input: { toolName, error: error.message, retryCount },
        metadata: {
          errorType: error.constructor.name,
          retryCount,
          maxRetries: 3,
        },
      });

      logger.error('❌ MCP TOOL ERROR:', {
        toolName,
        error: error.message,
        retryCount,
        traceId: trace.id,
      });

      // Implement retry logic
      if (retryCount < 3) {
        logger.info('🔄 RETRYING MCP TOOL:', { toolName, retryCount: retryCount + 1 });
        return { shouldRetry: true, retryCount: retryCount + 1 };
      }

      trace.update({
        output: { finalError: error.message, retriesExhausted: true },
        metadata: { success: false },
      });

      return { shouldRetry: false, finalError: error };
    },

    handleVectorStoreError: async (operation: string, error: Error) => {
      const trace = langfuse.trace({
        name: 'vector-store-error-handling',
        input: { operation, error: error.message },
        metadata: {
          errorType: error.constructor.name,
          operation,
        },
      });

      logger.error('❌ VECTOR STORE ERROR:', {
        operation,
        error: error.message,
        traceId: trace.id,
      });

      // Fallback to basic search if vector search fails
      trace.update({
        output: { fallbackActivated: true },
        metadata: { success: false, fallbackUsed: true },
      });

      return { useFallback: true };
    },

    handleDatabaseError: async (query: string, error: Error) => {
      const trace = langfuse.trace({
        name: 'database-error-handling',
        input: { queryPreview: query.substring(0, 100), error: error.message },
        metadata: {
          errorType: error.constructor.name,
          queryLength: query.length,
        },
      });

      logger.error('❌ DATABASE ERROR:', {
        queryPreview: query.substring(0, 100),
        error: error.message,
        traceId: trace.id,
      });

      // Suggest query modifications
      trace.update({
        output: { 
          errorHandled: true,
          suggestion: 'Check database connection and query syntax',
        },
        metadata: { success: false },
      });

      return { error: error.message, handled: true };
    },
  };
}

const errorHandler = createToolCallErrorHandler();
```

### 17. Production Optimization for Tool Call Logging

#### Adaptive Sampling for High-Volume Tool Calls
```typescript
// Adaptive sampling based on tool call volume
export function createAdaptiveToolCallSampling() {
  let toolCallCount = 0;
  let lastSampleRateUpdate = Date.now();

  return {
    shouldLogToolCall: (toolName: string): boolean => {
      toolCallCount++;
      const now = Date.now();

      // Adjust sampling rate based on volume
      if (now - lastSampleRateUpdate > 60000) { // Every minute
        const callsPerMinute = toolCallCount;
        toolCallCount = 0;
        lastSampleRateUpdate = now;

        // High volume: sample 10%, Medium: 50%, Low: 100%
        const sampleRate = callsPerMinute > 1000 ? 0.1 : callsPerMinute > 100 ? 0.5 : 1.0;
        
        logger.info('📊 ADAPTIVE SAMPLING UPDATE:', {
          callsPerMinute,
          newSampleRate: sampleRate,
          toolName,
        });

        return Math.random() < sampleRate;
      }

      return true; // Default to logging everything
    },
  };
}

const adaptiveSampling = createAdaptiveToolCallSampling();
```

#### Tool Call Batching for Performance
```typescript
// Batch tool call logs for better performance
export function createToolCallBatcher() {
  const batch: any[] = [];
  const batchSize = 50;
  const flushInterval = 5000; // 5 seconds

  const flushBatch = () => {
    if (batch.length > 0) {
      langfuse.batch(batch);
      logger.info('📦 TOOL CALL BATCH FLUSHED:', { batchSize: batch.length });
      batch.length = 0;
    }
  };

  // Auto-flush every interval
  setInterval(flushBatch, flushInterval);

  return {
    addToolCall: (toolCall: any) => {
      batch.push(toolCall);
      
      if (batch.length >= batchSize) {
        flushBatch();
      }
    },

    flush: flushBatch,
  };
}

const toolCallBatcher = createToolCallBatcher();
```

## Summary of Tool Call Logging Enhancements

The updated configuration now captures:

### 1. **Complete Tool Call Coverage**
- ✅ MCP tool requests and responses
- ✅ Vector store operations (queries, insertions, updates)
- ✅ Database queries and results
- ✅ RAG document processing
- ✅ Memory operations
- ✅ Custom tool implementations

### 2. **Hierarchical Trace Structure**
- 🔄 Agent-level conversations
- 🔧 Individual tool calls as sub-traces
- 📊 Tool call chains and workflows
- ⏱️ Performance metrics and timing

### 3. **Dental Manufacturing Specific**
- 🦷 Production analysis tracking
- 📈 Quality metrics monitoring
- 🚚 Supply chain optimization logging
- 📊 Business intelligence workflow capture

### 4. **Advanced Features**
- 🔍 Real-time monitoring
- 🛠️ Error handling and recovery
- 📦 Adaptive sampling and batching
- 🐛 Debug mode and troubleshooting

This comprehensive setup ensures that every interaction between your agents and tools is captured in Langfuse, providing complete visibility into your dental manufacturing business intelligence operations.

```env
# Langfuse Configuration
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Telemetry Settings - Force maximum capture
MASTRA_TELEMETRY_ENABLED=true
LANGFUSE_TRACING=true
LANGFUSE_DEBUG=true  # Enable debug mode for development

# Sampling and Batching
LANGFUSE_FLUSH_AT=1  # Send every event immediately
LANGFUSE_FLUSH_INTERVAL=1000  # Backup flush every second
LANGFUSE_SAMPLE_RATE=1.0  # Capture 100% of events

# Additional tracking
NODE_ENV=development  # or production
```

### 8. Verification and Testing

After implementing these changes, test that all agents are logging properly:

```bash
# Test each agent individually
curl -X POST http://localhost:4113/api/agents/businessIntelligenceAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test BI prompt"}]
  }'

curl -X POST http://localhost:4113/api/agents/databaseAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test database prompt"}]
  }'

curl -X POST http://localhost:4113/api/agents/bedrockAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test bedrock prompt"}]
  }'

curl -X POST http://localhost:4113/api/agents/migrationAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test migration prompt"}]
  }'
```

### 9. Monitoring All Agent Traces in Langfuse

In your Langfuse dashboard, you should now see traces for ALL agents with these characteristics:

- **Service Name**: "ai" for all traces
- **Function IDs**: 
  - `business-intelligence-agent`
  - `database-agent`
  - `bedrock-agent`
  - `migration-agent`
- **Complete Data**: Both inputs (prompts) and outputs (responses) captured
- **Metadata**: Agent type, capabilities, and other contextual information

### 10. Dashboard Queries for All Agents

Create these queries in Langfuse to monitor all agent activity:

```sql
-- All agent interactions
SELECT * FROM traces WHERE metadata->>'industry' = 'dental-manufacturing'

-- By agent type
SELECT * FROM traces WHERE metadata->>'agentType' = 'business-intelligence'
SELECT * FROM traces WHERE metadata->>'agentType' = 'database'
SELECT * FROM traces WHERE metadata->>'agentType' = 'bedrock'
SELECT * FROM traces WHERE metadata->>'agentType' = 'migration'

-- Stream vs generate operations
SELECT * FROM traces WHERE metadata->>'streamMode' = 'true'
SELECT * FROM traces WHERE metadata->>'streamMode' IS NULL

-- High step count operations (for BI agent)
SELECT * FROM traces WHERE metadata->>'maxSteps' = '1000000'
```

### 11. Debugging Missing Traces

If some agents aren't showing up in Langfuse, check:

1. **Agent Registration**: Ensure all agents are in the Mastra agents config
2. **Telemetry Settings**: Verify each agent has `telemetry.isEnabled: true`
3. **Service Name**: Must be "ai" for LangfuseExporter compatibility
4. **Flush Settings**: Use `flushAt: 1` for immediate trace sending
5. **Environment Variables**: All Langfuse credentials properly set

### 12. Performance Considerations for Complete Logging

When capturing ALL prompts and responses:

```typescript
// For production, consider these optimizations
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  // Production settings for high volume
  flushAt: process.env.NODE_ENV === 'production' ? 20 : 1,
  flushInterval: process.env.NODE_ENV === 'production' ? 10000 : 1000,
  // Timeout settings for reliability
  requestTimeout: 30000,
  // Rate limiting awareness
  maxRetries: 3,
  retryDelay: 1000,
});
```

## Summary of Changes for Complete Logging

1. **Set `flushAt: 1`** to send every event immediately
2. **Set `sampling.type: "always_on"`** with `probability: 1.0`
3. **Add telemetry settings to each agent's `defaultGenerateOptions` and `defaultStreamOptions`**
4. **Set `recordInputs: true` and `recordOutputs: true`** for all agents
5. **Add unique `functionId` for each agent** to track them separately
6. **Include comprehensive metadata** for filtering and analysis
7. **Enable debug mode** in development for troubleshooting

This configuration ensures that every single prompt sent to any agent and every response generated will be captured and logged in Langfuse with complete context and metadata.

### Context Enhancement Tracking
Your agent's context enhancement will be captured:
```typescript
// This will be tracked in Langfuse traces
const contextEnhancement = clientContextMiddleware.generateSystemPromptEnhancement(context);
```

### Vector Search Operations
All vector database operations will be traced:
```typescript
// These operations will appear in Langfuse
await vectorStore.query(indexName, query, options);
await vectorStore.addDocuments(indexName, documents);
```

### RAG Document Processing
The enhanced retrieval service operations will be monitored:
```typescript
const enhancedQuery = await queryEnhancementService.enhanceQuery(originalQuery, context);
```

## Development Workflow

### Starting the Development Environment

1. **Start Mastra server with Langfuse**:
```bash
pnpm dev
```

2. **Start Vite development server**:
```bash
pnpm dev:client
```

3. **Monitor in Langfuse Dashboard**:
   - Navigate to your Langfuse dashboard
   - Filter traces by service name "ai"
   - Monitor dental manufacturing BI operations

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx src/mastra/index.ts",
    "dev:client": "vite",
    "build": "mastra build",
    "build:client": "vite build",
    "start": "node .mastra/output/index.mjs",
    "langfuse:disable": "MASTRA_TELEMETRY_DISABLED=1 pnpm dev"
  }
}
```

## Monitoring Dental Manufacturing BI Operations

### Key Metrics to Track

1. **BI Query Performance**:
   - Query processing time
   - Tool usage patterns
   - Vector search latency
   - Database query execution times

2. **Context Enhancement**:
   - Original vs enhanced query comparison
   - Context-aware prompt generation
   - User permission utilization

3. **Memory Operations**:
   - Vector store retrieval accuracy
   - Semantic recall effectiveness
   - Working memory template usage

4. **Tool Integration**:
   - MCP tool success rates
   - Database connection health
   - Fallback mode activation

### Custom Dashboard Queries

In Langfuse, create custom queries for:
```sql
-- High step count operations
SELECT * FROM traces WHERE metadata->>'maxSteps' = '1000000'

-- Dental manufacturing specific traces
SELECT * FROM traces WHERE metadata->>'industry' = 'dental-manufacturing'

-- Context enhancement analysis
SELECT * FROM traces WHERE name LIKE '%context-enhancement%'
```

## Troubleshooting

### Common Issues

1. **Traces not appearing for BI agent**:
   - Verify `serviceName: "ai"` is set
   - Check environment variables are loaded
   - Ensure LangfuseExporter is properly configured

2. **High volume trace performance**:
   - Adjust `flushAt` and `flushInterval` settings
   - Consider ratio-based sampling for high-frequency operations
   - Monitor Langfuse API rate limits

3. **Vector store operations not tracked**:
   - Verify custom logging in vector operations
   - Check if traces include vector metadata
   - Ensure embeddings are properly instrumented

### Debug Configuration

```typescript
telemetry: {
  serviceName: "ai",
  enabled: true,
  sampling: { type: "always_on" },
  export: {
    type: "custom",
    exporter: new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST,
      debug: true, // Enable debug mode
      flushAt: 1, // Immediate flushing for debugging
    }),
  },
}
```

## Production Considerations

### Performance Optimization

```typescript
// Production-optimized Langfuse configuration
const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  flushAt: 50, // Batch more events
  flushInterval: 30000, // Flush every 30 seconds
  metadata: {
    environment: 'production',
    industry: 'dental-manufacturing',
    version: '1.0.0',
  },
});
```

### Sampling Strategy for Production

```typescript
telemetry: {
  serviceName: "ai",
  enabled: true,
  sampling: {
    type: "ratio",
    probability: 0.1, // Sample 10% of traces in production
  },
  export: {
    type: "custom",
    exporter: langfuseExporter,
  },
}
```

## Conclusion

This integration provides comprehensive observability for your dental manufacturing business intelligence agent, capturing the complex interactions between vector searches, RAG operations, database queries, and context-aware processing. The high step count (1,000,000) operations and extensive tool usage will be fully tracked in Langfuse, providing valuable insights for optimizing your BI workflows.
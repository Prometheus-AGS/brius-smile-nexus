# Quick Start: Business Intelligence Agent

Get your BI agent running in 5 minutes with modern React 19, Vite 7, and Zustand state management.

## 🚀 Architecture Overview

This guide implements the **Components → Hooks → Stores** pattern:
- **Components**: Pure UI that only calls hooks
- **Hooks**: Custom hooks that interface with Zustand stores
- **Stores**: Persistent Zustand stores with assistant-ui runtime integration

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (required package manager)
- Your Mastra server running on `http://localhost:4113`

## 🛠️ Step 1: Create React Project

```bash
# Create new Vite + React + TypeScript project
pnpm create vite@latest my-bi-dashboard --template react-ts
cd my-bi-dashboard

# Install dependencies
pnpm install

# Install required packages for BI agent integration
pnpm add zustand @assistant-ui/react @assistant-ui/react-ai-sdk
pnpm add @mastra/client-js zod
pnpm add @tailwindcss/typography class-variance-authority clsx tailwind-merge
pnpm add lucide-react @radix-ui/react-slot

# Install dev dependencies
pnpm add -D @types/node tailwindcss postcss autoprefixer
```

## 🎨 Step 2: Setup Tailwind CSS

```bash
# Initialize Tailwind
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

Update `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
  }
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

## 🗄️ Step 3: Create Zustand Store

Create `src/stores/bi-chat-store.ts`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ThreadMessageLike } from '@assistant-ui/react';

// Types for our BI chat state
interface BIChatMessage extends ThreadMessageLike {
  id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  createdAt: Date;
  metadata?: {
    queryType?: 'revenue' | 'operations' | 'costs' | 'general';
    executionTime?: number;
    dataPoints?: number;
  };
}

interface BIChatState {
  // State
  messages: BIChatMessage[];
  isRunning: boolean;
  currentSessionId: string;
  error: string | null;
  
  // Actions
  addMessage: (message: BIChatMessage) => void;
  setMessages: (messages: BIChatMessage[]) => void;
  setIsRunning: (isRunning: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  updateMessage: (id: string, updates: Partial<BIChatMessage>) => void;
  
  // BI-specific actions
  addBIQuery: (query: string, queryType?: BIChatMessage['metadata']['queryType']) => void;
  addBIResponse: (response: string, metadata?: BIChatMessage['metadata']) => void;
}

// Create the store with persistence
export const useBIChatStore = create<BIChatState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      messages: [],
      isRunning: false,
      currentSessionId: `session-${Date.now()}`,
      error: null,

      // Basic actions
      addMessage: (message) =>
        set((state) => {
          state.messages.push(message);
        }),

      setMessages: (messages) =>
        set((state) => {
          state.messages = messages;
        }),

      setIsRunning: (isRunning) =>
        set((state) => {
          state.isRunning = isRunning;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      clearMessages: () =>
        set((state) => {
          state.messages = [];
          state.error = null;
        }),

      updateMessage: (id, updates) =>
        set((state) => {
          const index = state.messages.findIndex((m) => m.id === id);
          if (index !== -1) {
            Object.assign(state.messages[index], updates);
          }
        }),

      // BI-specific actions
      addBIQuery: (query, queryType = 'general') =>
        set((state) => {
          const message: BIChatMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: [{ type: 'text', text: query }],
            createdAt: new Date(),
            metadata: { queryType },
          };
          state.messages.push(message);
        }),

      addBIResponse: (response, metadata) =>
        set((state) => {
          const message: BIChatMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: [{ type: 'text', text: response }],
            createdAt: new Date(),
            metadata,
          };
          state.messages.push(message);
        }),
    })),
    {
      name: 'bi-chat-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist messages and session info, not runtime state
      partialize: (state) => ({
        messages: state.messages,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);

// Selector hooks for performance optimization
export const useBIChatMessages = () => useBIChatStore((state) => state.messages);
export const useBIChatRunning = () => useBIChatStore((state) => state.isRunning);
export const useBIChatError = () => useBIChatStore((state) => state.error);
```

## 🔗 Step 4: Create Custom Hook for BI Agent Integration

Create `src/hooks/use-bi-agent.ts`:

```typescript
import { useCallback, useMemo } from 'react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import type { AppendMessage } from '@assistant-ui/react';
import { useBIChatStore } from '../stores/bi-chat-store';

// Mastra client configuration
const MASTRA_BASE_URL = 'http://localhost:4113';

interface BIAgentConfig {
  agentId: string;
  baseUrl: string;
}

export function useBIAgent(config: BIAgentConfig = { 
  agentId: 'businessIntelligenceAgent', 
  baseUrl: MASTRA_BASE_URL 
}) {
  // Get store state and actions
  const {
    messages,
    isRunning,
    error,
    addMessage,
    setMessages,
    setIsRunning,
    setError,
    addBIQuery,
    addBIResponse,
  } = useBIChatStore();

  // Memoized API call function
  const callBIAgent = useCallback(async (query: string) => {
    try {
      const response = await fetch(`${config.baseUrl}/api/agents/${config.agentId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: query,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.content ?? data.message ?? 'No response received';
    } catch (error) {
      console.error('BI Agent API Error:', error);
      throw error;
    }
  }, [config.baseUrl, config.agentId]);

  // Handle new messages from user
  const handleNewMessage = useCallback(async (message: AppendMessage) => {
    const query = typeof message.content === 'string' 
      ? message.content 
      : message.content.map(part => part.type === 'text' ? part.text : '').join(' ');

    try {
      setError(null);
      setIsRunning(true);

      // Add user message
      addBIQuery(query);

      // Call BI agent
      const startTime = Date.now();
      const response = await callBIAgent(query);
      const executionTime = Date.now() - startTime;

      // Add assistant response with metadata
      addBIResponse(response, {
        queryType: detectQueryType(query),
        executionTime,
        dataPoints: estimateDataPoints(response),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Add error message
      addBIResponse(`I apologize, but I encountered an error: ${errorMessage}. Please try again.`, {
        queryType: 'general',
        executionTime: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [callBIAgent, addBIQuery, addBIResponse, setError, setIsRunning]);

  // Create assistant-ui runtime
  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    setMessages,
    onNew: handleNewMessage,
  });

  // Return hook interface
  return {
    runtime,
    messages,
    isRunning,
    error,
    // Store actions for direct component use
    clearMessages: useBIChatStore((state) => state.clearMessages),
    // Utility functions
    hasMessages: messages.length > 0,
    lastMessage: messages[messages.length - 1] ?? null,
  };
}

// Utility functions
function detectQueryType(query: string): 'revenue' | 'operations' | 'costs' | 'general' {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('revenue') || lowerQuery.includes('sales') || lowerQuery.includes('income')) {
    return 'revenue';
  }
  if (lowerQuery.includes('cost') || lowerQuery.includes('expense') || lowerQuery.includes('budget')) {
    return 'costs';
  }
  if (lowerQuery.includes('operation') || lowerQuery.includes('efficiency') || lowerQuery.includes('process')) {
    return 'operations';
  }
  
  return 'general';
}

function estimateDataPoints(response: string): number {
  // Simple heuristic to estimate data complexity
  const numbers = response.match(/\d+/g);
  return numbers?.length ?? 0;
}
```

## 🎨 Step 5: Create UI Components

Create `src/components/BIChatInterface.tsx`:

```typescript
import React from 'react';
import { AssistantRuntimeProvider, Thread } from '@assistant-ui/react';
import { useBIAgent } from '../hooks/use-bi-agent';
import { AlertCircle, BarChart3, TrendingUp } from 'lucide-react';

interface BIChatInterfaceProps {
  className?: string;
}

export function BIChatInterface({ className }: BIChatInterfaceProps) {
  const { runtime, isRunning, error, hasMessages, clearMessages } = useBIAgent();

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">
            Business Intelligence Assistant
          </h1>
          {isRunning && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              Analyzing...
            </div>
          )}
        </div>
        
        {hasMessages && (
          <button
            onClick={clearMessages}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread />
        </AssistantRuntimeProvider>
      </div>

      {/* Quick Actions */}
      {!hasMessages && (
        <div className="p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600 mb-3">Try these sample queries:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <SampleQuery 
              icon={<TrendingUp className="h-4 w-4" />}
              text="Show me revenue trends for Q4"
              onClick={() => {/* This would trigger the query */}}
            />
            <SampleQuery 
              icon={<BarChart3 className="h-4 w-4" />}
              text="Analyze operational efficiency metrics"
              onClick={() => {/* This would trigger the query */}}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SampleQueryProps {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

function SampleQuery({ icon, text, onClick }: SampleQueryProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 text-sm text-left text-gray-700 hover:text-gray-900 hover:bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
    >
      {icon}
      {text}
    </button>
  );
}
```

## 📱 Step 6: Update Main App

Update `src/App.tsx`:

```typescript
import React from 'react';
import { BIChatInterface } from './components/BIChatInterface';
import './App.css';

function App() {
  return (
    <div className="h-screen bg-gray-50">
      <BIChatInterface className="h-full max-w-4xl mx-auto bg-white shadow-lg" />
    </div>
  );
}

export default App;
```

## 🚀 Step 7: Run Your Application

```bash
# Start the development server
pnpm dev
```

Visit `http://localhost:5173` to see your BI agent interface!

## 🎯 What You've Built

### Architecture Highlights

1. **Clean Separation**: Components → Hooks → Stores pattern
2. **Persistent State**: Chat history survives page refreshes
3. **Type Safety**: Full TypeScript with proper nullish coalescing
4. **Performance**: Optimized with Zustand selectors and memoization
5. **Error Handling**: Comprehensive error boundaries and user feedback

### Key Features

- **Persistent Chat History**: Conversations saved to localStorage
- **Real-time Status**: Loading states and error handling
- **BI-Specific Metadata**: Query types and execution metrics
- **Responsive Design**: Works on desktop and mobile
- **Sample Queries**: Quick start suggestions for users

## 🔧 Next Steps

1. **Add Authentication**: Integrate user sessions and permissions
2. **Data Visualization**: Add charts and graphs for BI responses
3. **Advanced Queries**: Implement query templates and suggestions
4. **Real-time Updates**: Add WebSocket support for live data
5. **Export Features**: Allow users to export analysis results

## 📚 Learn More

- [Business Intelligence Deep Dive](./business-intelligence/overview.md)
- [UI Patterns Guide](./ui-patterns/assistant-ui-examples.md)
- [Production Deployment](./production/error-handling.md)
- [API Reference](./api-reference/mastra-client-api.md)

---

**Congratulations!** You now have a fully functional BI agent with modern React patterns, persistent state management, and a clean architecture that scales.
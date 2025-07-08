# Basic BI Agent Integration

Simple implementation guide for integrating the Business Intelligence Agent with React applications using the Components → Hooks → Stores pattern.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
pnpm add zustand @assistant-ui/react @mastra/client-js
pnpm add -D @types/react @types/react-dom
```

### 2. Basic Store Implementation

```typescript
// src/stores/bi-chat-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface BIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    queryType?: 'sql' | 'analysis' | 'visualization';
    executionTime?: number;
    dataSource?: string;
  };
}

interface BIChatState {
  messages: BIMessage[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addMessage: (message: BIMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useBIChatStore = create<BIChatState>()(
  persist(
    immer((set) => ({
      messages: [],
      isLoading: false,
      error: null,

      addMessage: (message) =>
        set((state) => {
          state.messages.push(message);
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
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
    })),
    {
      name: 'bi-chat-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### 3. Basic Hook Implementation

```typescript
// src/hooks/use-bi-agent.ts
import { useCallback } from 'react';
import { useBIChatStore } from '../stores/bi-chat-store';

export function useBIAgent() {
  const { messages, isLoading, error, addMessage, setLoading, setError } = useBIChatStore();

  const sendMessage = useCallback(async (content: string) => {
    try {
      setError(null);
      setLoading(true);

      // Add user message
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      // Call BI agent API
      const response = await fetch('http://localhost:4113/api/agents/businessIntelligenceAgent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: data.content ?? 'No response received',
        timestamp: new Date(),
        metadata: {
          queryType: data.queryType,
          executionTime: data.executionTime,
          dataSource: data.dataSource,
        },
      };
      addMessage(assistantMessage);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [addMessage, setLoading, setError]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages: useBIChatStore((state) => state.clearMessages),
  };
}
```

### 4. Basic Component Implementation

```typescript
// src/components/BIChatInterface.tsx
import React, { useState } from 'react';
import { useBIAgent } from '../hooks/use-bi-agent';
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react';

export function BIChatInterface() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useBIAgent();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">BI Agent</h1>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Ask me anything about your business data!</p>
            <p className="text-sm mt-2">Try: "Show me sales trends for this quarter"</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
              )}
              
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.metadata && (
                  <div className="mt-2 text-xs opacity-75">
                    {message.metadata.queryType && (
                      <span className="inline-block bg-black bg-opacity-20 px-2 py-1 rounded mr-2">
                        {message.metadata.queryType}
                      </span>
                    )}
                    {message.metadata.executionTime && (
                      <span>{message.metadata.executionTime}ms</span>
                    )}
                  </div>
                )}
              </div>
              
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Bot className="h-6 w-6 text-blue-600" />
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-600">Analyzing your request...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business data..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

## 🎯 Usage Examples

### Basic Questions

```typescript
// Example queries you can ask the BI Agent
const exampleQueries = [
  "What are our top 5 products by revenue this quarter?",
  "Show me customer acquisition trends over the last 6 months",
  "Which regions have the highest profit margins?",
  "What's the average order value by customer segment?",
  "How has our inventory turnover changed year-over-year?"
];
```

### Integration in Your App

```typescript
// src/App.tsx
import React from 'react';
import { BIChatInterface } from './components/BIChatInterface';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="h-[600px]">
        <BIChatInterface />
      </div>
    </div>
  );
}

export default App;
```

## 🔧 Configuration Options

### Environment Variables

```bash
# .env
VITE_MASTRA_API_URL=http://localhost:4113
VITE_BI_AGENT_TIMEOUT=30000
VITE_ENABLE_DEBUG_LOGS=false
```

### Store Configuration

```typescript
// src/config/bi-config.ts
export const biConfig = {
  apiUrl: import.meta.env.VITE_MASTRA_API_URL ?? 'http://localhost:4113',
  timeout: parseInt(import.meta.env.VITE_BI_AGENT_TIMEOUT ?? '30000'),
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
  
  // Message persistence settings
  maxStoredMessages: 100,
  storageKey: 'bi-chat-storage',
  
  // UI settings
  maxMessageLength: 1000,
  typingIndicatorDelay: 500,
};
```

## 🎨 Styling with Tailwind CSS

### Required Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bi-primary': '#3b82f6',
        'bi-secondary': '#64748b',
      },
    },
  },
  plugins: [],
}
```

### Custom CSS Classes

```css
/* src/styles/bi-chat.css */
.bi-message-enter {
  opacity: 0;
  transform: translateY(10px);
}

.bi-message-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}

.bi-typing-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## 🧪 Testing

### Basic Test Setup

```typescript
// src/__tests__/bi-chat-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useBIChatStore } from '../stores/bi-chat-store';

describe('BIChatStore', () => {
  beforeEach(() => {
    // Clear store state
    useBIChatStore.getState().clearMessages();
  });

  it('should add messages correctly', () => {
    const { result } = renderHook(() => useBIChatStore());

    act(() => {
      result.current.addMessage({
        id: 'test-1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Test message');
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useBIChatStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });
});
```

## 🚀 Next Steps

1. **Advanced Queries**: Move to [advanced-queries.md](./advanced-queries.md) for complex BI patterns
2. **Data Visualization**: Check [data-visualization.md](./data-visualization.md) for chart integration
3. **Real-time Analytics**: See [real-time-analytics.md](./real-time-analytics.md) for streaming data

## 🔍 Troubleshooting

### Common Issues

1. **API Connection Errors**
   ```typescript
   // Check if Mastra server is running
   curl http://localhost:4113/health
   ```

2. **Store Persistence Issues**
   ```typescript
   // Clear localStorage if needed
   localStorage.removeItem('bi-chat-storage');
   ```

3. **TypeScript Errors**
   ```bash
   # Ensure all types are installed
   pnpm add -D @types/react @types/react-dom
   ```

### Debug Mode

```typescript
// Enable debug logging
const biConfig = {
  enableDebugLogs: true,
};

// In your hook
if (biConfig.enableDebugLogs) {
  console.log('Sending message:', content);
  console.log('Response:', data);
}
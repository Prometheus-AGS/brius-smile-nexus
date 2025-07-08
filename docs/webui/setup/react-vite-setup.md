# React 19 + Vite 7 Setup Guide

Complete setup guide for creating a new React application with Vite 7, TypeScript, and all necessary dependencies for Mastra agent integration.

## 🚀 Project Initialization

### 1. Create New Vite Project

```bash
# Create new Vite project with React and TypeScript
pnpm create vite@latest my-bi-app --template react-ts

# Navigate to project directory
cd my-bi-app

# Install dependencies
pnpm install
```

### 2. Upgrade to React 19

```bash
# Install React 19
pnpm add react@^19.0.0 react-dom@^19.0.0

# Install React 19 types
pnpm add -D @types/react@^19.0.0 @types/react-dom@^19.0.0
```

### 3. Install Required Dependencies

```bash
# State management and UI libraries
pnpm add zustand @assistant-ui/react @mastra/client-js

# Zustand middleware
pnpm add immer

# Chart libraries
pnpm add recharts

# UI components and styling
pnpm add tailwindcss postcss autoprefixer
pnpm add -D @tailwindcss/forms @tailwindcss/typography

# Icons
pnpm add lucide-react

# Utilities
pnpm add clsx tailwind-merge

# Development dependencies
pnpm add -D @types/node
```

## ⚙️ Configuration Files

### 1. Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4113',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
```

### 2. TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "allowJs": false,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. Tailwind CSS Configuration

```bash
# Initialize Tailwind CSS
pnpm dlx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bi-primary': '#3b82f6',
        'bi-secondary': '#64748b',
        'bi-success': '#10b981',
        'bi-warning': '#f59e0b',
        'bi-error': '#ef4444',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### 4. CSS Setup

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-bi-primary hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200;
  }
  
  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-md transition-colors duration-200;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
  
  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bi-primary focus:border-transparent;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## 📁 Project Structure

### Recommended Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components
│   ├── charts/          # Chart components
│   └── forms/           # Form components
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── config/              # Configuration files
├── assets/              # Static assets
└── styles/              # Additional CSS files
```

### 5. Utility Functions

```typescript
// src/utils/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```typescript
// src/utils/format.ts
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}
```

### 6. Type Definitions

```typescript
// src/types/index.ts
export interface BIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    queryType?: string
    executionTime?: number
    confidence?: number
    sources?: string[]
  }
}

export interface BIQuery {
  id: string
  content: string
  timestamp: Date
  results?: unknown
  metadata: {
    queryType: 'sql' | 'analysis' | 'visualization' | 'prediction' | 'comparison'
    dataSource: string
    executionTime: number
    confidence: number
  }
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  title: string
  xAxisLabel?: string
  yAxisLabel?: string
  colors?: string[]
  responsive?: boolean
  animated?: boolean
}

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata?: Record<string, unknown>
}
```

### 7. Configuration

```typescript
// src/config/app.ts
export const appConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4113',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT ?? '30000'),
  },
  
  ui: {
    theme: 'light' as const,
    animations: true,
    compactMode: false,
  },
  
  features: {
    realTimeUpdates: true,
    exportFormats: ['png', 'svg', 'pdf', 'csv'],
    maxCachedQueries: 100,
  },
  
  performance: {
    debounceMs: 300,
    throttleMs: 100,
    maxDataPoints: 1000,
  },
} as const

export type AppConfig = typeof appConfig
```

## 🔧 Environment Variables

### .env File

```bash
# .env
VITE_API_URL=http://localhost:4113
VITE_API_TIMEOUT=30000
VITE_ENABLE_DEBUG=false
VITE_WEBSOCKET_URL=ws://localhost:4113/ws
VITE_MAX_RETRIES=3
```

### Environment Types

```typescript
// src/types/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_MAX_RETRIES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 🎨 Basic App Structure

### Main App Component

```typescript
// src/App.tsx
import React from 'react'
import { BIChatInterface } from './components/BIChatInterface'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Business Intelligence Dashboard
              </h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-[600px]">
            <BIChatInterface />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
```

### Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Error details
                </summary>
                <pre className="text-xs text-gray-400 mt-2 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist node_modules/.vite",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

## 🧪 Testing Setup (Optional)

### Install Testing Dependencies

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

## 🚀 Development Workflow

### 1. Start Development Server

```bash
pnpm dev
```

### 2. Build for Production

```bash
pnpm build
```

### 3. Preview Production Build

```bash
pnpm preview
```

### 4. Type Checking

```bash
pnpm type-check
```

### 5. Linting

```bash
pnpm lint
pnpm lint:fix
```

## 🔗 Integration with Mastra

### API Client Setup

```typescript
// src/utils/api.ts
import { appConfig } from '@/config/app'

class APIClient {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = appConfig.api.baseUrl
    this.timeout = appConfig.api.timeout
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    })
  }
}

export const apiClient = new APIClient()
```

## 🎯 Next Steps

1. **Copy the basic integration example** from [`basic-integration.md`](../business-intelligence/basic-integration.md)
2. **Implement advanced features** from [`advanced-queries.md`](../business-intelligence/advanced-queries.md)
3. **Add data visualization** using [`data-visualization.md`](../business-intelligence/data-visualization.md)
4. **Set up real-time features** with [`real-time-analytics.md`](../business-intelligence/real-time-analytics.md)

## 🐛 Troubleshooting

### Common Issues

1. **React 19 Compatibility**
   ```bash
   # If you encounter React 19 issues, ensure all packages are compatible
   pnpm update
   ```

2. **TypeScript Errors**
   ```bash
   # Clear TypeScript cache
   rm -rf node_modules/.cache
   pnpm type-check
   ```

3. **Vite Build Issues**
   ```bash
   # Clear Vite cache
   pnpm clean
   pnpm install
   ```

4. **API Connection Issues**
   - Ensure Mastra server is running on `http://localhost:4113`
   - Check CORS configuration
   - Verify environment variables

### Performance Optimization

1. **Bundle Analysis**
   ```bash
   pnpm add -D rollup-plugin-visualizer
   ```

2. **Code Splitting**
   ```typescript
   // Use React.lazy for route-based code splitting
   const Dashboard = React.lazy(() => import('./components/Dashboard'))
   ```

3. **Memory Management**
   - Implement proper cleanup in useEffect hooks
   - Use React.memo for expensive components
   - Optimize Zustand store subscriptions

This setup provides a solid foundation for building modern React applications with Mastra agent integration, following all the architectural patterns outlined in the documentation.
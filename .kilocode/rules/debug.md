# Kilo Code Debug Mode Rules

## Debugging Focus and Approach

### Root Cause Analysis
- Always identify root causes of issues, not just symptoms
- Add comprehensive logging and error tracking for better visibility
- Implement proper error boundaries and fallback mechanisms
- Test edge cases and error scenarios thoroughly
- Document debugging findings and solutions for future reference

### Systematic Debugging Process
- Start by understanding the expected vs actual behavior clearly
- Add strategic console.log statements for state and data flow tracking
- Use browser developer tools effectively for React component debugging
- Implement proper error boundaries for component failure isolation
- Test with different data scenarios, edge cases, and error conditions

## React 19 Debugging Strategies

### Component Debugging
- Use React Developer Tools for component state and props inspection
- Implement proper key props for list rendering to prevent rendering issues
- Debug re-rendering issues with React.memo, useMemo, and useCallback
- Check for proper cleanup in useEffect hooks to prevent memory leaks
- Verify proper dependency arrays in hooks to prevent infinite loops

### React Debugging Implementation
```typescript
// ✅ Good - Proper debugging setup for React components
import { useEffect, useCallback, useMemo } from 'react';

const DebuggableComponent = ({ data, onUpdate }) => {
  // Debug logging for props changes
  useEffect(() => {
    console.log('DebuggableComponent: Props changed', { data, onUpdate });
  }, [data, onUpdate]);

  // Memoized computation with debugging
  const processedData = useMemo(() => {
    console.log('DebuggableComponent: Processing data', data);
    const result = expensiveDataProcessing(data);
    console.log('DebuggableComponent: Processed result', result);
    return result;
  }, [data]);

  // Callback with debugging
  const handleUpdate = useCallback((newValue) => {
    console.log('DebuggableComponent: Update triggered', newValue);
    onUpdate(newValue);
  }, [onUpdate]);

  // Cleanup debugging
  useEffect(() => {
    return () => {
      console.log('DebuggableComponent: Cleanup triggered');
    };
  }, []);

  return (
    <div>
      {/* Component JSX with debugging attributes */}
      <div data-testid="processed-data" data-debug={JSON.stringify(processedData)}>
        {processedData.map((item, index) => (
          <div key={item.id} data-debug-index={index}>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Zustand Store Debugging

### Store State Debugging
- Add comprehensive logging to store actions for state change tracking
- Implement proper store devtools integration for state inspection
- Debug store subscription issues and unnecessary re-renders
- Verify proper store state updates and immutability
- Check for store state mutations and side effects

### Store Debugging Implementation
```typescript
// ✅ Good - Zustand store with debugging capabilities
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DebugUserStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<DebugUserStore>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      
      setUser: (user) => {
        console.log('UserStore: Setting user', { user, previousUser: get().user });
        set({ user }, false, 'setUser');
      },
      
      setLoading: (isLoading) => {
        console.log('UserStore: Setting loading state', { isLoading, previousLoading: get().isLoading });
        set({ isLoading }, false, 'setLoading');
      },
      
      setError: (error) => {
        console.log('UserStore: Setting error', { error, previousError: get().error });
        set({ error }, false, 'setError');
      },
    }),
    {
      name: 'user-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Debug hook for store usage tracking
export const useUserStoreDebug = () => {
  const store = useUserStore();
  
  useEffect(() => {
    console.log('useUserStoreDebug: Store state changed', store);
  }, [store]);
  
  return store;
};
```

## Supabase Debugging Strategies

### Database Operation Debugging
- Implement comprehensive error handling for all database operations
- Add detailed logging for authentication state changes and transitions
- Debug RLS policy issues with proper error messages and context
- Verify proper database schema and relationship configurations
- Test with different user permission scenarios and edge cases

### Supabase Debugging Implementation
```typescript
// ✅ Good - Supabase operations with comprehensive debugging
export const debugSupabaseAuth = () => {
  const [authState, setAuthState] = useState({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    console.log('SupabaseAuth: Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('SupabaseAuth: Auth state changed', { 
          event, 
          session: session ? { 
            user: session.user?.id, 
            expires_at: session.expires_at 
          } : null 
        });
        
        setAuthState({
          user: session?.user || null,
          session,
          loading: false,
          error: null,
        });
      }
    );

    return () => {
      console.log('SupabaseAuth: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const debugSignIn = async (email: string, password: string) => {
    console.log('SupabaseAuth: Attempting sign in', { email });
    
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('SupabaseAuth: Sign in error', error);
        throw error;
      }
      
      console.log('SupabaseAuth: Sign in successful', { userId: data.user?.id });
      
    } catch (error) {
      console.error('SupabaseAuth: Sign in failed', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }));
    }
  };

  return { ...authState, debugSignIn };
};
```

## Performance Debugging

### Performance Issue Identification
- Use React Profiler for performance bottleneck identification
- Debug unnecessary re-renders with proper memoization strategies
- Optimize bundle size with proper code splitting analysis
- Debug network requests and API performance issues
- Implement proper loading states for better user experience

### Performance Debugging Tools
```typescript
// ✅ Good - Performance debugging utilities
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  interactions
) => {
  console.log('Performance Profile:', {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions: Array.from(interactions),
  });
  
  // Alert for slow renders
  if (actualDuration > 16) {
    console.warn(`Slow render detected in ${id}: ${actualDuration}ms`);
  }
};

export const PerformanceDebugWrapper = ({ children, id }) => (
  <Profiler id={id} onRender={onRenderCallback}>
    {children}
  </Profiler>
);

// Bundle analysis debugging
export const debugBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analyzer available for debugging');
    });
  }
};
```

## Error Handling and Recovery

### Comprehensive Error Handling
- Implement proper try-catch blocks for all async operations
- Add proper error messages with sufficient context for debugging
- Implement user-friendly error displays with recovery options
- Log errors with sufficient context for production debugging
- Implement proper fallback UI states for error scenarios

### Error Boundary Implementation
```typescript
// ✅ Good - Comprehensive error boundary with debugging
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class DebugErrorBoundary extends Component<
  PropsWithChildren<{ fallback?: ComponentType<{ error?: Error }> }>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{ fallback?: ComponentType<{ error?: Error }> }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary: Error caught', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary: Component stack trace', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    
    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, errorInfo);
    }
    
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = ({ error }: { error?: Error }) => (
  <div className="p-4 border border-red-300 rounded-md bg-red-50">
    <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
    <p className="text-red-600 mt-2">
      {error?.message || 'An unexpected error occurred'}
    </p>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4">
        <summary className="cursor-pointer text-red-700">Error Details</summary>
        <pre className="mt-2 text-xs text-red-600 overflow-auto">
          {error?.stack}
        </pre>
      </details>
    )}
    <button 
      onClick={() => window.location.reload()} 
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Reload Page
    </button>
  </div>
);
```

## Additional Development Rules

### Bug Fix Memory Management
- After fixing any bugs where there are no errors detected, create a memory in the memory MCP server related to the bug fix, so we do not repeat bugs
- Document the root cause, solution, and prevention strategy for future reference
- Include relevant code patterns and anti-patterns in the memory

### Documentation Compliance
- The `docs` subdirectory in this project contains markdown files that describe architectural, design and other decisions related to the project
- Always check for files in the `docs` directory and subdirectories when generating code to make sure those rules and standards are followed
- Reference existing documentation before making architectural decisions
- Update documentation when making significant changes

### TypeScript Type Management
- Always check to see if new TypeScript types are generated already before creating new ones, so we prevent duplicate types from being created
- Use the `src/types/*` directory structure to create new types that should be shared across stores and components
- Check existing type definitions in `src/types/` before creating new interfaces or types
- Organize types by domain/feature within the types directory
- Use proper barrel exports from type files for clean imports

Remember: All debugging implementations must maintain production safety and should include proper logging levels and error reporting mechanisms. Debug information should be helpful for development while being secure for production environments.

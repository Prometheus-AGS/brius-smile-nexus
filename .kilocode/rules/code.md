# Kilo Code Implementation Rules

## Code Implementation Focus

### Implementation Standards
- Implement features based on established architectural plans
- Write clean, maintainable, and testable code following all global rules
- Follow established patterns and conventions consistently
- Ensure comprehensive error handling and edge case coverage
- Maintain code quality and consistency across all implementations

### Development Workflow
- Always implement TypeScript interfaces before components
- Create custom hooks for all Zustand store interactions
- Implement proper loading and error states for all async operations
- Use shadcn/ui components consistently throughout the application
- Follow established file naming conventions (kebab-case) without exception
- **ALWAYS** use Yarn for all package management operations - NEVER use npm or other package managers
- Use `yarn add` for dependencies, `yarn add -D` for dev dependencies, `yarn remove` for uninstalling

## React 19 Implementation Standards

### Modern React Patterns
- Use modern React patterns with hooks and functional components
- Implement proper component lifecycle management with useEffect
- Use React.memo() for performance optimization of expensive components
- Implement proper event handling patterns and form management
- Use controlled components for all form inputs and user interactions

### Component Implementation
```typescript
// ✅ Good - Proper React 19 component implementation
import { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading?: boolean;
}

export const LoginForm = memo<LoginFormProps>(({ onSubmit, isLoading = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation logic
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({ email, password });
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again.' });
    }
  }, [email, password, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={isLoading}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
      
      <div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={isLoading}
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
      </div>
      
      {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
});

LoginForm.displayName = 'LoginForm';
```

## Zustand Integration Implementation

### Custom Hook Pattern Implementation
- Never access stores directly from components
- Always create custom hooks for store interactions
- Implement proper store slicing for performance optimization
- Use proper TypeScript typing for all store state and actions

### Required Store Integration Pattern
```typescript
// Store definition with proper TypeScript
interface UserStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      set({ user: data.user, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false 
      });
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, isLoading: false, error: null });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false 
      });
    }
  },
  
  clearError: () => set({ error: null }),
}));

// Custom hook for component access
export const useAuth = () => {
  const user = useUserStore(state => state.user);
  const isLoading = useUserStore(state => state.isLoading);
  const error = useUserStore(state => state.error);
  const login = useUserStore(state => state.login);
  const logout = useUserStore(state => state.logout);
  const clearError = useUserStore(state => state.clearError);
  
  return { user, isLoading, error, login, logout, clearError };
};
```

## Supabase Implementation Standards

### Authentication Implementation
- Implement comprehensive authentication flows with proper error handling
- Use proper error handling for all database operations
- Implement proper RLS policy compliance in all data operations
- Use proper TypeScript types for all database schemas
- Implement proper real-time subscriptions when needed

### Database Integration Pattern
```typescript
// Proper Supabase integration with error handling
export const useSupabaseQuery = <T>(
  table: string,
  query?: (builder: PostgrestQueryBuilder<any, any>) => PostgrestQueryBuilder<any, any>
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let queryBuilder = supabase.from(table).select('*');
        if (query) queryBuilder = query(queryBuilder);
        
        const { data: result, error: queryError } = await queryBuilder;
        
        if (queryError) throw queryError;
        setData(result || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Database query failed');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, query]);

  return { data, loading, error };
};
```

## Code Organization Implementation

### File Structure Standards
- Group related functionality in feature-based modules
- Create barrel exports for clean, organized imports
- Separate business logic from UI components completely
- Use proper TypeScript types and interfaces for all data structures
- Implement proper component composition patterns

### Error Handling Implementation
- Implement comprehensive try-catch blocks for all async operations
- Add proper error messages with sufficient context for debugging
- Implement user-friendly error displays with recovery options
- Log errors with sufficient context for production debugging
- Implement proper fallback UI states for error scenarios

### Performance Implementation
- Use React.memo() strategically for expensive components
- Implement proper code splitting with React.lazy() for routes
- Optimize Zustand store subscriptions to prevent unnecessary re-renders
- Follow Vite optimization guidelines for build performance
- Minimize bundle size with proper tree shaking and optimization

## Testing Implementation Requirements

### Component Testing
- Write comprehensive tests for all component functionality
- Test user interactions and component behavior thoroughly
- Mock external dependencies and API calls properly
- Test accessibility features and keyboard navigation
- Verify proper error states and loading state handling

### Integration Testing
- Test component integration with Zustand stores
- Test API integration with proper Supabase mocking
- Test routing and navigation flows comprehensively
- Test form submission and validation logic
- Test error boundary behavior and recovery

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

Remember: Every implementation must follow the established global rules and architectural patterns. All code must be production-ready with proper error handling, testing, and documentation.

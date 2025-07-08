# System Patterns - Reusable Code Templates

## Zustand Store Patterns

### Basic Store Structure
```typescript
// Standard Zustand store with TypeScript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface StoreState {
  // State properties
  data: DataType[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setData: (data: DataType[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        data: [],
        isLoading: false,
        error: null,
        
        // Actions
        setData: (data) => set({ data }, false, 'setData'),
        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),
        clearError: () => set({ error: null }, false, 'clearError'),
      }),
      {
        name: 'store-name',
        partialize: (state) => ({ data: state.data }), // Only persist specific fields
      }
    ),
    {
      name: 'store-name',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
```

### Custom Hook for Store Access
```typescript
// Custom hook pattern for store access
export const useStoreData = () => {
  const data = useStore(state => state.data);
  const isLoading = useStore(state => state.isLoading);
  const error = useStore(state => state.error);
  const setData = useStore(state => state.setData);
  const setLoading = useStore(state => state.setLoading);
  const setError = useStore(state => state.setError);
  const clearError = useStore(state => state.clearError);
  
  return {
    data,
    isLoading,
    error,
    setData,
    setLoading,
    setError,
    clearError,
  };
};

// Async action hook pattern
export const useStoreActions = () => {
  const { setData, setLoading, setError, clearError } = useStoreData();
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      
      const response = await api.getData();
      setData(response.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [setData, setLoading, setError, clearError]);
  
  return { fetchData };
};
```

## React Component Patterns

### Error Boundary Component
```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError?: () => void }>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = ({ error, resetError }: { error?: Error; resetError?: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] p-4 border border-red-200 rounded-lg bg-red-50">
    <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
    <p className="text-red-600 text-center mb-4">
      {error?.message || 'An unexpected error occurred'}
    </p>
    {resetError && (
      <Button onClick={resetError} variant="outline" size="sm">
        Try again
      </Button>
    )}
  </div>
);
```

### Async Component with Loading States
```typescript
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AsyncComponentProps {
  id: string;
  onDataLoad?: (data: DataType) => void;
}

export const AsyncComponent = ({ id, onDataLoad }: AsyncComponentProps) => {
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.getData(id);
      setData(response.data);
      onDataLoad?.(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [id, onDataLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button onClick={fetchData} variant="outline" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{data.description}</p>
      </CardContent>
    </Card>
  );
};
```

## Supabase Integration Patterns

### Authentication Hook
```typescript
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setAuthState({
          user: session?.user || null,
          session,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to get session',
        }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({
          user: session?.user || null,
          session,
          isLoading: false,
          error: null,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // State will be updated by the auth state change listener
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // State will be updated by the auth state change listener
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    signIn,
    signOut,
    clearError,
  };
};
```

### Database Query Hook
```typescript
import { useState, useEffect, useCallback } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface QueryState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

export const useSupabaseQuery = <T>(
  table: string,
  query?: (builder: any) => any,
  dependencies: any[] = []
) => {
  const [state, setState] = useState<QueryState<T>>({
    data: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      let queryBuilder = supabase.from(table).select('*');
      
      if (query) {
        queryBuilder = query(queryBuilder);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      setState({
        data: data || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof PostgrestError 
          ? error.message 
          : error instanceof Error 
          ? error.message 
          : 'Database query failed',
      }));
    }
  }, [table, query, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
};
```

## Form Handling Patterns

### Form with Validation
```typescript
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export const ValidationForm = ({ onSubmit, isLoading = false }: FormProps) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = useCallback((data: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    
    // Email validation
    if (!data.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!data.password) {
      newErrors.password = 'Password is required';
    } else if (data.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    // Confirm password validation
    if (!data.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  }, []);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      setErrors({});
      await onSubmit(formData);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Submission failed',
      });
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={isLoading}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>
          
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

## Testing Patterns

### Component Testing Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ComponentName } from './component-name';

// Mock external dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    // Mock implementation
  },
}));

describe('ComponentName', () => {
  const mockProps = {
    onSubmit: vi.fn(),
    isLoading: false,
  };
  
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName {...mockProps} />);
    
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    render(<ComponentName {...mockProps} />);
    
    const button = screen.getByRole('button', { name: /submit/i });
    await user.click(button);
    
    expect(mockProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should handle loading state', () => {
    render(<ComponentName {...mockProps} isLoading={true} />);
    
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });

  it('should handle error states', async () => {
    const mockOnSubmitWithError = vi.fn().mockRejectedValue(new Error('Test error'));
    
    render(<ComponentName {...mockProps} onSubmit={mockOnSubmitWithError} />);
    
    const button = screen.getByRole('button', { name: /submit/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });
  });
});
```

These patterns provide consistent, reusable templates for common development scenarios while maintaining the established coding standards and best practices.

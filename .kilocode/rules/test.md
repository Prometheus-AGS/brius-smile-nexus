# Kilo Code Test Mode Rules

## Testing Strategy and Standards

### Comprehensive Testing Approach
- Write comprehensive tests for all functionality and user interactions
- Implement proper test coverage for critical business logic paths
- Create maintainable and readable test suites with clear descriptions
- Test edge cases, error scenarios, and boundary conditions thoroughly
- Ensure tests are fast, reliable, and deterministic

### Testing Pyramid Implementation
- Follow the testing pyramid: unit tests > integration tests > e2e tests
- Test behavior and user outcomes, not implementation details
- Use proper test data and mocking strategies for isolation
- Implement proper test isolation and cleanup between tests
- Write descriptive test names that clearly explain what is being tested

## React Component Testing Standards

### Component Testing with React Testing Library
- Use React Testing Library for all component testing
- Test user interactions and component behavior from user perspective
- Mock external dependencies and API calls properly
- Test accessibility features and keyboard navigation thoroughly
- Verify proper error states, loading states, and user feedback

### Component Testing Implementation
```typescript
// ✅ Good - Comprehensive component testing
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should render all form elements correctly', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should handle form submission with valid data', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should display validation errors for empty fields', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should handle loading state correctly', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />);
    
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });

  it('should handle submission errors gracefully', async () => {
    const mockOnSubmitWithError = vi.fn().mockRejectedValue(new Error('Login failed'));
    render(<LoginForm onSubmit={mockOnSubmitWithError} />);
    
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('should be accessible with keyboard navigation', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    // Tab through form elements
    await user.tab();
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
  });
});
```

## Unit Testing Standards

### Utility Function Testing
- Test utility functions with comprehensive input scenarios and edge cases
- Use proper test data generators for consistent and varied testing
- Implement proper assertion patterns and error condition testing
- Test error conditions, boundary values, and invalid inputs
- Maintain high test coverage for critical business logic functions

### Unit Testing Implementation
```typescript
// ✅ Good - Comprehensive utility function testing
import { describe, it, expect } from 'vitest';
import { validateEmail, formatCurrency, debounce } from './utils';

describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'user123@test-domain.com',
    ];
    
    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('should return false for invalid email addresses', () => {
    const invalidEmails = [
      '',
      'invalid',
      '@example.com',
      'user@',
      'user@.com',
      'user..name@example.com',
      'user@example.',
    ];
    
    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  it('should handle edge cases correctly', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(' test@example.com ')).toBe(true); // Should trim whitespace
  });
});

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(0.99)).toBe('$0.99');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('should handle different currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
    expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
  });

  it('should handle edge cases and invalid inputs', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
    expect(formatCurrency(Infinity)).toBe('$0.00');
    expect(formatCurrency(-Infinity)).toBe('$0.00');
  });
});

describe('debounce', () => {
  it('should debounce function calls correctly', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    // Call multiple times quickly
    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');
    
    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();
    
    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should have been called once with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });
});
```

## Zustand Store Testing

### Store Testing Standards
- Test store actions and state updates comprehensively
- Mock store dependencies and external services properly
- Test store persistence and hydration mechanisms
- Verify proper store subscription behavior and performance
- Test store error handling and recovery scenarios

### Store Testing Implementation
```typescript
// ✅ Good - Comprehensive Zustand store testing
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useUserStore } from './user-store';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
  },
}));

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUserStore.setState({
      user: null,
      isLoading: false,
      error: null,
    });
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useUserStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockSupabase = await import('./supabase');
    
    mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useUserStore());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle login errors', async () => {
    const mockError = new Error('Invalid credentials');
    const mockSupabase = await import('./supabase');
    
    mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: mockError,
    });

    const { result } = renderHook(() => useUserStore());
    
    await act(async () => {
      await result.current.login('test@example.com', 'wrongpassword');
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should handle logout correctly', async () => {
    const mockSupabase = await import('./supabase');
    mockSupabase.supabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useUserStore());
    
    // Set initial user state
    act(() => {
      useUserStore.setState({ user: { id: '1', email: 'test@example.com' } });
    });
    
    await act(async () => {
      await result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

## Integration Testing Standards

### Component-Store Integration
- Test component integration with Zustand stores comprehensively
- Test API integration with proper Supabase mocking
- Test routing and navigation flows with React Router
- Test form submission, validation, and error handling flows
- Test error boundary behavior and recovery mechanisms

### Integration Testing Implementation
```typescript
// ✅ Good - Integration testing with providers
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './login-page';

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('LoginPage Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should handle complete login flow', async () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => ({
      ...(await vi.importActual('react-router-dom')),
      useNavigate: () => mockNavigate,
    }));

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Fill out form
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display error message on login failure', async () => {
    const mockSupabase = await import('./supabase');
    mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid credentials'),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

## Test Configuration and Setup

### Test Environment Setup
- Configure Vitest for optimal testing performance
- Set up proper test utilities and custom render functions
- Configure proper mocking for external dependencies
- Set up test coverage reporting and thresholds
- Configure proper test database and environment isolation

### Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
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

Remember: All tests must be comprehensive, maintainable, and focused on user behavior and business logic. Tests should provide confidence in the application's functionality while being easy to understand and maintain.

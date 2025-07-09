# Kilo Code Global Development Rules

## Technology Stack Requirements

### Core Technologies
- **Frontend Framework**: React 19 - Use latest features and patterns
- **Build Tool**: Vite 7 - Leverage fast build times and modern development experience
- **Package Manager**: Yarn - **MANDATORY** for ALL package management operations
- **Styling**: Tailwind CSS - Utility-first approach for rapid development
- **UI Components**: shadcn/ui - High-quality, accessible component library
- **Routing**: React Router - Modern client-side routing
- **State Management**: Zustand - Lightweight, flexible state management
- **Backend/Database**: Supabase - Full-stack solution with auth, database, real-time

### Package Management Standards
- **ALWAYS** use Yarn for all package operations - NEVER use npm, pnpm, or other package managers
- Use `yarn add` for installing dependencies
- Use `yarn add -D` for development dependencies
- Use `yarn remove` for uninstalling packages
- Use `yarn install` or simply `yarn` for installing all dependencies
- Use `yarn upgrade` for updating packages
- Always commit `yarn.lock` file to version control
- Never commit `package-lock.json` or `pnpm-lock.yaml` files
- Use Yarn workspaces for monorepo setups when applicable

## TypeScript Standards

### Strict Type Safety
- **NEVER** use the `any` type explicitly or implicitly
- Always provide proper type definitions for all functions and variables
- Use strict TypeScript configuration with all strict flags enabled
- Prefer type inference where appropriate but be explicit when needed
- Use generic types and utility types for better type safety
- Create proper interfaces for all data structures

### Type Definition Patterns
```typescript
// ✅ Good - Proper interface definition
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// ❌ Bad - Using any type
const user: any = getUserData();

// ✅ Good - Generic type usage
interface ApiResponse<T> {
  data: T;
  error?: string;
  loading: boolean;
}
```

## State Management Architecture (CRITICAL ARCHITECTURAL PRINCIPLE)

### MANDATORY Rule: NO DIRECT STORE ACCESS
- **FORBIDDEN**: React components must **NEVER** directly import or access Zustand stores
- **MANDATORY**: All store interactions must go through custom hooks exclusively
- **MANDATORY**: Custom hooks orchestrate ALL data loading, transformations, and side effects
- **MANDATORY**: Components remain pure and focused solely on rendering
- **MANDATORY**: Data orchestration logic belongs in hooks, NOT in components

### Architectural Benefits
- **Separation of Concerns**: Data logic completely separated from UI rendering logic
- **Reusability**: Hooks can be shared across multiple components without duplication
- **Testability**: Data logic can be tested independently from UI components
- **Maintainability**: Centralized data orchestration makes changes easier
- **Performance**: Better optimization with selective store subscriptions
- **Debugging**: Easier to trace data flow and state changes

### REQUIRED Implementation Pattern
```typescript
// ❌ ABSOLUTELY FORBIDDEN - Direct store access in component
import { useUserStore } from '@/stores/user-store';
import { useOrderStore } from '@/stores/order-store';

const Component = () => {
  // NEVER do this - direct store access in component
  const user = useUserStore(state => state.user);
  const fetchUser = useUserStore(state => state.fetchUser);
  const orders = useOrderStore(state => state.orders);
  const fetchOrders = useOrderStore(state => state.fetchOrders);
  
  useEffect(() => {
    // NEVER do data orchestration in components
    fetchUser();
    if (user?.id) {
      fetchOrders(user.id);
    }
  }, [user?.id]);
  
  return <div>{user?.name} has {orders.length} orders</div>;
};

// ✅ REQUIRED - Hook-based data orchestration architecture
const useUserWithOrders = () => {
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const userLoading = useUserStore(state => state.isLoading);
  const userError = useUserStore(state => state.error);
  const fetchUser = useUserStore(state => state.fetchUser);
  
  const orders = useOrderStore(state => state.orders);
  const ordersLoading = useOrderStore(state => state.isLoading);
  const ordersError = useOrderStore(state => state.error);
  const fetchOrders = useOrderStore(state => state.fetchOrders);
  
  // ALL data orchestration happens in the hook
  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);
  
  useEffect(() => {
    if (user?.id && !orders.length) {
      fetchOrders(user.id);
    }
  }, [user?.id, orders.length, fetchOrders]);
  
  // Return clean, computed interface to component
  return {
    user,
    orders,
    isLoading: userLoading || ordersLoading,
    error: userError || ordersError,
    refetchUser: fetchUser,
    refetchOrders: () => user?.id && fetchOrders(user.id)
  };
};

// Component stays pure and focused ONLY on rendering
const Component = () => {
  const { user, orders, isLoading, error } = useUserWithOrders();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <div>No user found</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>Orders: {orders.length}</p>
    </div>
  );
};
```

### Hook Design Principles
- **Single Responsibility**: Each hook handles one specific domain or feature area
- **Data Orchestration**: Handle ALL async operations, caching, and state management in hooks
- **Clean Interface**: Return only the data and functions that components actually need
- **Error Handling**: Centralize ALL error handling logic within hooks
- **Loading States**: Manage ALL async loading states within hooks, never in components
- **Side Effects**: ALL useEffect calls for data fetching belong in hooks, not components

## UI Component Standards

### shadcn/ui Component Priority
- **ALWAYS** prefer shadcn/ui components over raw HTML elements
- Use shadcn components for: buttons, inputs, forms, dialogs, cards, tables, etc.
- Only use raw HTML for semantic elements: `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`
- Maintain consistent styling through Tailwind CSS classes
- Follow shadcn/ui theming and customization patterns

### Component Usage Examples
```typescript
// ✅ Good - Using shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const LoginForm = () => (
  <Card className="p-6">
    <Input type="email" placeholder="Email" />
    <Button type="submit">Login</Button>
  </Card>
);

// ❌ Bad - Using raw HTML elements
const LoginForm = () => (
  <div className="border p-6">
    <input type="email" placeholder="Email" />
    <button type="submit">Login</button>
  </div>
);
```

## File Naming Conventions

### Mandatory kebab-case Usage
- Use kebab-case (lowercase with dashes) for **ALL** file names
- Apply to components, utilities, services, pages, and all other files
- No exceptions - maintain consistency across the entire project

### File Naming Examples
```
✅ Correct naming:
- user-profile.tsx
- auth-service.ts
- login-form.tsx
- api-client.ts
- user-dashboard.tsx
- payment-processor.ts

❌ Incorrect naming:
- UserProfile.tsx
- authService.ts
- LoginForm.tsx
- apiClient.ts
- userDashboard.tsx
- PaymentProcessor.ts
```

## Supabase Integration Standards

### Authentication & Database
- Use Supabase for all authentication, authorization, and database operations
- Implement comprehensive error handling for all Supabase operations
- Use Supabase's built-in security features (RLS policies, auth guards)
- Follow Supabase best practices for client-side operations
- Always handle loading and error states for async operations

### Required Implementation Patterns
```typescript
// ✅ Good - Proper Supabase integration
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, signIn };
};
```

## Code Quality Requirements

### Development Standards
- Write self-documenting code with clear, descriptive names
- Add JSDoc comments for complex functions and components
- Implement proper error boundaries and comprehensive error handling
- Use consistent code formatting with Prettier configuration
- Follow React 19 best practices and modern patterns
- Implement proper accessibility (a11y) standards for all UI components

### Performance Optimization
- Use React.memo() for expensive components to prevent unnecessary re-renders
- Implement proper code splitting with React.lazy() for route-based splitting
- Optimize Zustand store subscriptions to prevent performance issues
- Follow Vite optimization guidelines for build performance
- Minimize bundle size and optimize for production deployment

## Project Structure Guidelines

### Organization Principles
- Organize components by feature/domain rather than by file type
- Keep utility functions in dedicated, well-organized utility files
- Separate business logic from UI components for better maintainability
- Use barrel exports (index.ts files) for clean, organized imports
- Maintain clear separation of concerns throughout the application

### Security Requirements
- Never expose sensitive data in client-side code
- Use environment variables for all configuration and API keys
- Implement proper input validation and sanitization
- Follow Supabase security best practices and RLS policies
- Use HTTPS for all external API calls and data transmission

## Testing Standards

### Required Testing Approach
- Write comprehensive unit tests for all utility functions
- Implement component tests for complex UI logic and user interactions
- Test all Zustand store operations and state changes
- Mock Supabase operations properly in all tests
- Maintain good test coverage for critical business logic paths

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

Remember: These rules are **mandatory** for all code generation and development. Every piece of code must adhere to these standards without exception.

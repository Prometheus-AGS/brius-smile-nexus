# System Patterns

## State Management Patterns

### Custom Hook Pattern for Store Access
```typescript
// Store definition
interface UserStore {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// Custom hook
const useAuth = () => {
  const user = useUserStore(state => state.user);
  const isLoading = useUserStore(state => state.isLoading);
  const login = useUserStore(state => state.login);
  const logout = useUserStore(state => state.logout);
  
  return { user, isLoading, login, logout };
};

// Component usage
const LoginForm = () => {
  const { login, isLoading } = useAuth();
  // Component implementation
};
```

### Store Slicing Pattern
```typescript
// Large store with slices
const useAppStore = create<AppState>((set, get) => ({
  // User slice
  user: null,
  setUser: (user) => set({ user }),
  
  // UI slice
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  
  // Data slice
  data: [],
  setData: (data) => set({ data }),
}));

// Slice-specific hooks
const useUserSlice = () => useAppStore(state => ({
  user: state.user,
  setUser: state.setUser,
}));
```

## Component Patterns

### Error Boundary Pattern
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Async Component Pattern
```typescript
interface AsyncComponentProps {
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

const AsyncComponent: FC<AsyncComponentProps> = ({ 
  fallback = <LoadingSpinner />,
  errorFallback = <ErrorMessage />
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return fallback;
  if (error) return errorFallback;
  
  return <DataDisplay data={data} />;
};
```

## Supabase Integration Patterns

### Authentication Hook Pattern
```typescript
const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  return { user, loading, signIn };
};
```

### Database Query Pattern
```typescript
const useSupabaseQuery = <T>(
  table: string,
  query?: (builder: any) => any
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let queryBuilder = supabase.from(table).select('*');
        if (query) queryBuilder = query(queryBuilder);
        
        const { data, error } = await queryBuilder;
        if (error) throw error;
        
        setData(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, query]);

  return { data, loading, error };
};
```

## Form Patterns

### Controlled Form Pattern with shadcn/ui
```typescript
const FormComponent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit logic
    try {
      await submitForm(formData);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            email: e.target.value
          }))}
        />
        {errors.email && <p className="text-red-500">{errors.email}</p>}
      </div>
      
      <Button type="submit">Submit</Button>
    </form>
  );
};
```

## Testing Patterns

### Component Testing Pattern
```typescript
describe('LoginForm', () => {
  it('should handle form submission', async () => {
    const mockLogin = jest.fn();
    render(<LoginForm onLogin={mockLogin} />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

### Store Testing Pattern
```typescript
describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('should update user state', () => {
    const { setUser } = useUserStore.getState();
    const user = { id: '1', email: 'test@example.com' };
    
    setUser(user);
    
    expect(useUserStore.getState().user).toEqual(user);
  });
});
```

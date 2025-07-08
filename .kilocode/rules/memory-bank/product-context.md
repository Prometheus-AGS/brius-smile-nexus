# Product Context - High-Level Project Information

## Project Identity
**Name**: Brius Smile Nexus  
**Type**: Modern React Web Application  
**Purpose**: High-quality, type-safe web application with comprehensive AI-assisted development standards  
**Target**: Production-ready application with enterprise-level code quality and maintainability

## High-Level Architecture

### Frontend Architecture
- **Framework**: React 19 with modern functional components and hooks
- **Build System**: Vite 7 for fast development and optimized production builds
- **Type System**: Strict TypeScript with zero tolerance for `any` types
- **Styling**: Tailwind CSS utility-first approach with responsive design
- **Component Library**: shadcn/ui for consistent, accessible UI components
- **Routing**: React Router for client-side navigation and route management

### State Management Architecture
- **Primary**: Zustand for lightweight, flexible state management
- **Pattern**: Custom hooks for all store interactions (no direct store access)
- **Structure**: Feature-based store slicing for scalability
- **Persistence**: Configurable state persistence and hydration
- **Performance**: Optimized subscriptions to prevent unnecessary re-renders

### Backend Integration
- **Service**: Supabase for full-stack backend capabilities
- **Authentication**: Supabase Auth with secure session management
- **Database**: PostgreSQL with Row-Level Security (RLS) policies
- **Real-time**: Supabase real-time subscriptions for live data updates
- **Storage**: Supabase Storage for file and media management

## Core Principles

### Type Safety First
- Strict TypeScript configuration with comprehensive type checking
- No explicit or implicit `any` type usage anywhere in codebase
- Proper interface definitions for all data structures and API responses
- Generic types and utility types for maximum type safety
- Type-safe integration with all external APIs and services

### Component-Driven Development
- Functional components with modern React patterns
- Custom hooks for business logic separation and reusability
- Proper component composition and prop drilling avoidance
- Error boundaries for graceful error handling and recovery
- Accessibility-first component design with ARIA compliance

### Performance Optimization
- Code splitting and lazy loading for optimal bundle sizes
- React.memo() and useMemo() for expensive computation optimization
- Proper dependency arrays in hooks to prevent infinite loops
- Bundle analysis and optimization for production builds
- Caching strategies for API calls and computed data

### Developer Experience
- Comprehensive ESLint and Prettier configuration for code consistency
- Detailed JSDoc comments for complex functions and components
- Self-documenting code with clear, descriptive naming conventions
- Comprehensive testing suite with high coverage requirements
- Development tools and debugging utilities for efficient workflow

## System Boundaries

### Frontend Responsibilities
- User interface rendering and interaction handling
- Client-side routing and navigation management
- Form validation and user input processing
- State management and data flow coordination
- Error handling and user feedback presentation

### Backend Integration Points
- Authentication and authorization through Supabase Auth
- Database operations with proper error handling and validation
- Real-time data synchronization and subscription management
- File upload and storage operations through Supabase Storage
- API communication with comprehensive error handling

### External Service Integration
- Third-party API integration with proper error handling
- Analytics and monitoring service integration
- Payment processing integration (when applicable)
- Email and notification service integration
- CDN and asset delivery optimization

## Key Patterns and Standards

### File Organization
- Feature-based module organization with clear boundaries
- Consistent kebab-case naming convention for all files
- Barrel exports for clean import statements and module boundaries
- Separation of concerns between components, hooks, utilities, and services
- Proper test file organization alongside source files

### Error Handling
- Comprehensive try-catch blocks for all async operations
- User-friendly error messages with actionable recovery options
- Error boundaries for component-level error isolation
- Proper error logging and monitoring for production debugging
- Graceful degradation for non-critical feature failures

### Testing Strategy
- Unit tests for utility functions and business logic
- Integration tests for component and store interactions
- End-to-end tests for critical user flows and scenarios
- Accessibility testing for all UI components and interactions
- Performance testing for critical application paths

### Security Practices
- Secure authentication and session management
- Input validation and sanitization for all user inputs
- Proper environment variable management for sensitive data
- HTTPS enforcement and secure communication protocols
- Regular security audits and dependency vulnerability checks

## Quality Standards

### Code Quality Metrics
- TypeScript strict mode compliance with zero `any` types
- ESLint rule compliance with zero warnings or errors
- Prettier formatting consistency across entire codebase
- Test coverage minimum thresholds for all critical functionality
- Performance budgets for bundle size and loading times

### User Experience Standards
- Responsive design working across all device sizes
- Accessibility compliance with WCAG 2.1 AA standards
- Fast loading times with optimized asset delivery
- Intuitive navigation and user interface design
- Comprehensive error handling with user-friendly messaging

### Development Workflow Standards
- Git commit message conventions and branch naming standards
- Code review requirements and approval processes
- Continuous integration and automated testing pipelines
- Documentation requirements for all major features and APIs
- Regular refactoring and technical debt management

This product context serves as the foundation for all development decisions and ensures consistency across all AI-assisted development sessions.

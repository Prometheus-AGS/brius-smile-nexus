# Kilo Code Architect Mode Rules

## Architectural Planning Focus

### System Design Priorities
- Focus on high-level system architecture and design decisions
- Plan component hierarchies and data flow patterns
- Design API interfaces and database schemas with scalability in mind
- Consider performance, maintainability, and extensibility implications
- Document all architectural decisions with clear rationale

### Architecture Documentation Requirements
- Always document architectural choices and reasoning
- Maintain system patterns for reusable architectural solutions
- Plan feature implementation with clear milestones and dependencies
- Consider future extensibility in all architectural decisions
- Plan for proper error handling and edge case management

## Design Principles

### SOLID Architecture
- Follow SOLID principles for component and service design
- Implement proper separation of concerns across all layers
- Design for testability and maintainability from the start
- Plan for proper dependency injection patterns
- Consider cross-cutting concerns (logging, error handling, monitoring)

### System Boundaries
- Define clear module boundaries and interfaces
- Plan proper abstraction layers between components
- Design consistent API patterns across the application
- Plan proper data flow and state management architecture
- Consider security boundaries and access control patterns

## Technology Integration Planning

### React 19 Architecture
- Plan component architecture with proper hooks usage and composition
- Design component hierarchies for optimal re-rendering performance
- Plan proper context usage and provider patterns
- Design for proper component lifecycle management
- Plan error boundary placement and error handling strategies

### Zustand Store Architecture
- Design store structure with clear data flow patterns
- Plan store slicing strategies for large applications
- Design custom hook interfaces for store interactions
- Plan store persistence and hydration strategies
- Design proper store subscription patterns for performance

### Supabase Schema Design
- Plan database schema with proper normalization
- Design RLS policies for security and data access control
- Plan real-time subscription patterns and data synchronization
- Design proper authentication and authorization flows
- Plan for data migration and schema evolution strategies

### shadcn/ui Component Architecture
- Plan component composition patterns and design system
- Design proper theming and customization strategies
- Plan for consistent styling and design token usage
- Design responsive layouts and mobile-first approaches
- Plan for accessibility compliance across all components

### Vite Build Architecture
- Plan build optimization strategies and code splitting
- Design proper environment configuration management
- Plan for asset optimization and caching strategies
- Design proper development and production build pipelines
- Plan for deployment and CI/CD integration
- **ALWAYS** specify Yarn as the package manager for all projects and dependencies
- Include Yarn commands in all build scripts and documentation
- Plan for Yarn workspace configurations in monorepo architectures

## Scalability Planning

### Performance Architecture
- Plan for optimal bundle size and loading performance
- Design proper caching strategies for data and assets
- Plan for lazy loading and code splitting implementation
- Design for optimal re-rendering and state update patterns
- Plan for proper memory management and cleanup

### Maintainability Architecture
- Design for clear code organization and module boundaries
- Plan for proper testing strategies and test architecture
- Design for easy debugging and development experience
- Plan for proper documentation and knowledge management
- Design for team collaboration and code review processes

## Security Architecture

### Data Security Planning
- Plan for proper data encryption and secure transmission
- Design authentication and authorization architecture
- Plan for proper input validation and sanitization
- Design for secure API communication and error handling
- Plan for compliance with security best practices and standards

### Access Control Architecture
- Design role-based access control systems
- Plan for proper session management and token handling
- Design for secure route protection and navigation guards
- Plan for proper audit logging and security monitoring
- Design for secure configuration and environment management

## Integration Architecture

### External Service Integration
- Plan for proper API integration patterns and error handling
- Design for service reliability and fallback strategies
- Plan for proper data synchronization and conflict resolution
- Design for monitoring and observability of external dependencies
- Plan for proper rate limiting and API usage optimization

### Development Workflow Integration
- Plan for proper development environment setup and configuration
- Design for efficient development and debugging workflows
- Plan for proper testing and quality assurance processes
- Design for continuous integration and deployment pipelines
- Plan for proper monitoring and error tracking in production

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

Remember: All architectural decisions must align with the established technology stack and coding standards. Every architectural choice should be documented with clear reasoning and trade-off analysis.

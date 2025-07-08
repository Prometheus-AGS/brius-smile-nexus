# Product Context

## Project Identity
**Name**: Brius Smile Nexus  
**Type**: Modern React Web Application  
**Domain**: User-focused web platform with authentication

## High-Level Architecture
- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand with custom hooks
- **Backend**: Supabase (auth, database, real-time)
- **Routing**: React Router
- **Package Management**: Yarn

## Core Principles
1. **Type Safety**: Strict TypeScript, no `any` types
2. **Component Composition**: shadcn/ui over raw HTML
3. **State Isolation**: Hook-based store access only
4. **File Organization**: kebab-case naming convention
5. **Security First**: Supabase RLS and proper auth flows

## System Boundaries
- **Frontend Layer**: React components, hooks, utilities
- **State Layer**: Zustand stores with typed interfaces
- **API Layer**: Supabase client with proper error handling
- **UI Layer**: shadcn/ui components with Tailwind styling

## Key Patterns
- Custom hooks for all external integrations
- Error boundaries for component failure isolation
- Loading states for all async operations
- Proper TypeScript interfaces for all data structures
- Feature-based file organization

## Quality Standards
- Comprehensive error handling
- Accessibility compliance
- Performance optimization
- Security best practices
- Maintainable code structure

## Development Workflow
- Architect mode for planning and design
- Code mode for implementation
- Debug mode for troubleshooting
- Test mode for quality assurance
- Memory Bank for context persistence

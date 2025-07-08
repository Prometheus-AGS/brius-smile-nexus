import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load pages for better performance
const Index = React.lazy(() => import("./pages/Index"));
const LoginPage = React.lazy(() => import("./pages/login/index"));
const PortalLayout = React.lazy(() => import("./pages/portal/index"));
const HomePage = React.lazy(() => import("./pages/portal/home"));
const AssistantPage = React.lazy(() => import("./pages/portal/assistant"));
const LibraryPage = React.lazy(() => import("./pages/portal/library"));
const ReportsPage = React.lazy(() => import("./pages/portal/reports"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Loading fallback component for lazy-loaded routes
 */
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Main App Component
 * 
 * Sets up the application with:
 * - React Query for server state management
 * - React Router for navigation
 * - Global UI providers (Tooltip, Toast)
 * - Lazy loading for better performance
 * - Proper route structure with authentication
 */
const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Portal Routes with Nested Routing */}
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<HomePage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            
            {/* Future auth routes (to be implemented in Phase 3) */}
            {/* <Route path="/reset-password" element={<PasswordResetPage />} /> */}
            {/* <Route path="/verify-email" element={<EmailVerificationPage />} /> */}
            
            {/* Redirect old routes for backward compatibility */}
            <Route path="/dashboard" element={<Navigate to="/portal" replace />} />
            <Route path="/app" element={<Navigate to="/portal" replace />} />
            
            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

/**
 * AssistantApp component - Main application wrapper for the AI assistant
 * TEMPORARY STATE: Chat functionality temporarily disabled while rebuilding
 *
 * NEXT STEPS:
 * - Rebuild chat with proper Mastra integration
 * - Align with actual Mastra server at /Users/gqadonis/Projects/prometheus/brius/brius-mastra-final
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatPlaceholder } from '@/components/assistant-ui/chat-placeholder';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ChatHistorySidebar } from '@/components/assistant/chat-history-sidebar';
import { ChatHistoryToggle } from '@/components/assistant/chat-history-toggle';
import { useDashboardActions, useDashboardData } from '@/stores/dashboard-store';
import { useChatSidebar } from '@/hooks/use-chat-sidebar';
import { useAuth } from '@/hooks/use-auth';

/**
 * Inner AssistantApp component (wrapped by error boundary)
 * Enhanced with business intelligence integration and dashboard data
 */
const AssistantAppInner: React.FC = () => {
  // Authentication integration
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Dashboard store integration
  const { loadDashboard, refreshDashboard } = useDashboardActions();
  const { currentDashboard, isLoading: dashboardLoading, error: dashboardError } = useDashboardData();
  
  // Chat sidebar integration with debugging
  const { isOpen: sidebarOpen, toggleSidebar } = useChatSidebar();
  
  // Track initialization errors
  const [initError, setInitError] = useState<string | null>(null);
  const [isMastraOffline, setIsMastraOffline] = useState(false);
  
  // Debug logging for sidebar state
  useEffect(() => {
    console.log('[AssistantApp] Sidebar state changed:', {
      sidebarOpen,
      timestamp: new Date().toISOString(),
      screenWidth: window.innerWidth,
      isMobile: window.innerWidth < 768
    });
  }, [sidebarOpen]);

  // Debug logging for user authentication state
  useEffect(() => {
    console.log('[AssistantApp] Auth state changed:', {
      isAuthenticated,
      authLoading,
      userId: user?.id,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, authLoading, user?.id, user?.email]);

  /**
   * Initialize dashboard and chat data on mount
   * Handles errors gracefully without blocking render
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        setInitError(null);
        
        // Load main dashboard for business intelligence context
        // This is non-critical, so we catch and log errors without blocking
        try {
          await loadDashboard('main-dashboard');
        } catch (dashErr) {
          console.warn('Dashboard load failed (non-critical):', dashErr);
        }
      } catch (error) {
        // Catch any unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.error('Failed to initialize assistant app data:', error);
        setInitError(errorMessage);
        
        // Check if this is a Mastra connectivity issue
        if (errorMessage.includes('connection') || errorMessage.includes('fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
          setIsMastraOffline(true);
        }
      }
    };

    initializeData();
  }, [loadDashboard]);

  /**
   * Handle dashboard refresh
   */
  const handleRefreshDashboard = useCallback(async () => {
    try {
      await refreshDashboard();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      // Don't throw here as this is not critical enough to crash the entire app
    }
  }, [refreshDashboard]);

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex-1 flex relative min-h-0">
          {/* Chat History Sidebar */}
          <ChatHistorySidebar />
          
          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-h-0 ${
            sidebarOpen ? 'ml-80' : 'ml-0'
          }`}>
            <Card className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <ChatHistoryToggle
                    isOpen={sidebarOpen}
                    onToggle={toggleSidebar}
                  />
                  {/* Dashboard Status and Controls */}
                  {currentDashboard && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard: {currentDashboard.title}</span>
                      {currentDashboard.lastUpdated && (
                        <span className="text-xs">
                          Updated: {new Date(currentDashboard.lastUpdated).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshDashboard}
                  disabled={dashboardLoading}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${dashboardLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
          
              {/* Dashboard Error Display */}
              {dashboardError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded m-4">
                  Dashboard Error: {dashboardError}
                </div>
              )}
              
              {/* Mastra Offline Warning */}
              {isMastraOffline && (
                <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md flex items-center gap-2 m-4">
                  <WifiOff className="h-4 w-4" />
                  <div>
                    <strong>Mastra AI Service Offline</strong>
                    <p className="text-xs mt-1">The AI assistant is currently unavailable. Please check back later.</p>
                  </div>
                </div>
              )}
              
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {/* Placeholder Chat Interface wrapped in error boundary */}
                <ErrorBoundary
                  showErrorDetails={process.env.NODE_ENV === 'development'}
                  onError={(error, errorInfo) => {
                    console.error('Assistant Chat Error:', error);
                    console.error('Error Info:', errorInfo);
                    
                    // Log to error tracking service in production
                    if (process.env.NODE_ENV === 'production') {
                      // reportErrorToService(error, errorInfo, 'mastra-assistant-chat');
                    }
                  }}
                  fallback={
                    <div className="flex-1 flex items-center justify-center p-8">
                      <Card className="w-full max-w-md">
                        <CardContent className="text-center space-y-4 p-6">
                          <p className="text-muted-foreground">
                            Unable to load assistant interface.
                          </p>
                          <Button
                            onClick={() => window.location.reload()}
                            className="w-full"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reload Page
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  }
                >
                  <ChatPlaceholder className="flex-1" />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Main AssistantApp component with comprehensive error boundary protection
 * Provides graceful error handling for the entire business intelligence assistant
 */
export const AssistantApp: React.FC = () => {
  /**
   * Handle errors from the main application error boundary
   */
  const handleAppError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Assistant App Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    
    // Enhanced error logging for business intelligence context
    const errorContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      businessContext: 'assistant-app',
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Business Intelligence Assistant Error');
      console.error('Error Context:', errorContext);
      console.groupEnd();
    }
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // reportErrorToService(error, errorInfo, 'business-intelligence-assistant');
    }
  }, []);

  return (
    <ErrorBoundary
      onError={handleAppError}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      resetOnPropsChange={true}
      fallback={
        <div className="h-[calc(100vh-12rem)] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="text-center space-y-4 p-6">
              <div className="flex justify-center mb-4">
                <WifiOff className="h-12 w-12 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold">Service Temporarily Unavailable</h2>
              <p className="text-muted-foreground">
                The assistant service is currently being updated. Please try again later.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Connection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = '/portal/home';
                  }}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AssistantAppInner />
    </ErrorBoundary>
  );
};

export default AssistantApp;

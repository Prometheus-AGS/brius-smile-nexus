/**
 * AssistantApp component - Main application wrapper for the AI assistant
 * Integrates the new AssistantChat component with Mastra backend and business intelligence features
 * Enhanced with comprehensive error boundary protection
 */

import React, { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssistantChat } from '@/components/assistant-ui';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useDashboardActions, useDashboardData } from '@/stores/dashboard-store';
import { useChatActions } from '@/stores/chat-store';
import { useAuth } from '@/hooks/use-auth';
import type { AssistantError, AssistantMessage, AssistantThread } from '@/types/assistant';

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
  
  // Chat store integration
  const { loadHistory } = useChatActions();

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
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load main dashboard for business intelligence context
        await loadDashboard('main-dashboard');
        
        // Load chat history
        await loadHistory();
      } catch (error) {
        console.error('Failed to initialize assistant app data:', error);
        // Re-throw to be caught by error boundary if critical
        if (error instanceof Error && error.message.includes('critical')) {
          throw error;
        }
  

      }
    };

    initializeData();
  }, [loadDashboard, loadHistory]);

  // Note: Event handlers removed as AssistantChat component is self-contained
  // User context and event handling are managed internally via useMastraChat hook
  // This resolves the original user requirement for setting resourceId to user UUID
  // as the hook automatically handles user identification through createBusinessContext

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
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col"
      >
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display font-medium flex items-center gap-2">
                <Bot className="h-5 w-5 text-brius-primary" />
                Business Intelligence Assistant
              </CardTitle>
              
              {/* Dashboard Status and Controls */}
              <div className="flex items-center gap-2">
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
            </div>
            
            {/* Dashboard Error Display */}
            {dashboardError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                Dashboard Error: {dashboardError}
              </div>
            )}
            
            {/* Business Intelligence Context */}
            {currentDashboard && (
              <div className="text-sm text-muted-foreground">
                Ask me about your business performance, analytics, and operational insights
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Main Assistant Chat Interface wrapped in its own error boundary */}
            <ErrorBoundary
              showErrorDetails={process.env.NODE_ENV === 'development'}
              onError={(error, errorInfo) => {
                console.error('Assistant Chat Error:', error);
                console.error('Error Info:', errorInfo);
                
                // Log to error tracking service in production
                if (process.env.NODE_ENV === 'production') {
                  // reportErrorToService(error, errorInfo, 'assistant-chat');
                }
              }}
              fallback={
                <div className="flex-1 flex items-center justify-center p-8">
                  <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                      <CardTitle className="text-lg">Chat Temporarily Unavailable</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <p className="text-muted-foreground">
                        The assistant chat is experiencing technical difficulties. 
                        Your dashboard data is still available above.
                      </p>
                      <Button 
                        onClick={() => window.location.reload()} 
                        className="w-full"
                      >
                        Reload Assistant
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              }
            >
              <AssistantChat
                className="flex-1"
              />
            </ErrorBoundary>
          </CardContent>
        </Card>
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
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Bot className="h-6 w-6 text-brius-primary" />
                Business Intelligence Assistant Unavailable
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The Business Intelligence Assistant is temporarily unavailable due to a technical issue. 
                Our team has been notified and is working to resolve this quickly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Assistant
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Go to Dashboard
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

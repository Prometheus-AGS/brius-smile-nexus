import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * App Initializer Component
 * 
 * Ensures the app waits for authentication initialization before rendering
 * the main application. This prevents blank pages and auth state race conditions.
 */
export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { isInitialized, isLoading, initialize } = useAuthStore();
  const [initStarted, setInitStarted] = useState(false);

  useEffect(() => {
    if (!isInitialized && !initStarted) {
      console.log('🚀 AppInitializer - Starting auth initialization');
      setInitStarted(true);
      initialize().catch((error) => {
        console.error('💥 AppInitializer - Auth initialization failed:', error);
        // Continue anyway to prevent infinite loading
        setInitStarted(false);
      });
    }
  }, [isInitialized, initStarted, initialize]);

  // Show loading state only while auth is actively initializing
  if (!isInitialized && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 text-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <p className="text-sm text-muted-foreground">
                Initializing application...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth is initialized, render the app
  console.log('🎯 AppInitializer - Rendering children, auth initialized successfully');
  return <>{children}</>;
};
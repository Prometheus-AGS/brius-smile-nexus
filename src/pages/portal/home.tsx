import React, { useEffect } from 'react';
import { HomeApp } from '@/components/apps/home-app';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Home Page Component
 * 
 * Route page that wraps the HomeApp component with error boundary protection.
 * Accessible at /portal (index route)
 */
const HomePage: React.FC = () => {
  useEffect(() => {
    console.log('🏠 HomePage - Component mounted, about to render HomeApp');
    
    return () => {
      console.log('🏠 HomePage - Component unmounting');
    };
  }, []);

  return (
    <ErrorBoundary
      showErrorDetails={true}
      onError={(error, errorInfo) => {
        console.error('🚨 HomePage Error:', error);
        console.error('Error Info:', errorInfo);
      }}
      fallback={
        <div className="w-full h-full flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Home Page Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The home page encountered an error. This is likely due to a configuration issue.
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
      <div className="w-full h-full">
        <HomeApp />
      </div>
    </ErrorBoundary>
  );
};

export default HomePage;
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LoginForm } from '@/components/auth/login-form';
import { usePublicRoute } from '@/hooks/use-auth-redirect';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Loading component displayed while checking authentication status
 */
const LoginPageSkeleton: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-brius-gradient px-4">
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo skeleton */}
          <Skeleton className="h-12 w-32" />
          
          {/* Title skeleton */}
          <div className="space-y-2 text-center">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          
          {/* Form skeleton */}
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Login Page Component
 * 
 * Provides the login interface for users to authenticate with the application.
 * Automatically redirects authenticated users to the portal.
 * Handles loading states and authentication flow.
 */
const LoginPage: React.FC = () => {
  const { isAuthenticated, isInitialized, isLoading, shouldRender } = usePublicRoute({
    redirectPath: '/portal',
    allowAuthenticated: false
  });

  // Show loading skeleton while checking authentication status
  if (isLoading || !isInitialized) {
    return <LoginPageSkeleton />;
  }

  // Don't render if user is already authenticated (will be redirected)
  if (!shouldRender) {
    return <LoginPageSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-brius-gradient"
    >
      <LoginForm />
    </motion.div>
  );
};

export default LoginPage;
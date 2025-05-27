
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/ui/logo';

interface LoginFormProps {
  onCancel?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onCancel }) => {
  const [email, setEmail] = useState('demo@brius.com');
  const [password, setPassword] = useState('password');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brius-gradient px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-display font-medium">
              Welcome Back
            </CardTitle>
            <CardDescription className="font-body">
              Sign in to access your AI operations portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-body font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="font-body"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brius-primary hover:bg-brius-secondary rounded-full font-body font-semibold"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="w-full rounded-full font-body"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

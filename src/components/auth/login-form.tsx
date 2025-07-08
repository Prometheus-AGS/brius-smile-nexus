import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { Logo } from '@/components/ui/logo';
import { 
  isValidEmail, 
  sanitizeInput, 
  setStorageItem, 
  getStorageItem, 
  AUTH_STORAGE_KEYS 
} from '@/lib/auth-utils';
import type { LoginFormData } from '@/types/auth';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Login Form Component
 * 
 * Provides email/password authentication with enhanced features:
 * - Form validation
 * - Remember me functionality
 * - Password visibility toggle
 * - Error handling with user-friendly messages
 * - Automatic redirect after successful login
 */
export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { login, isLoading, error, clearError } = useAuth();
  const { redirectAfterLogin } = useAuthRedirect();

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = getStorageItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL);
    const lastLoginEmail = getStorageItem(AUTH_STORAGE_KEYS.LAST_LOGIN_EMAIL);
    
    if (rememberedEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    } else if (lastLoginEmail) {
      setFormData(prev => ({
        ...prev,
        email: lastLoginEmail
      }));
    }
  }, []);

  // Clear auth errors when form data changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData.email, formData.password, clearError, error]);

  /**
   * Validates form data and returns validation errors
   */
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return errors;
  };

  /**
   * Handles form input changes with validation
   */
  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? sanitizeInput(value) : value
    }));

    // Clear field-specific validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎯 Login Form - Submit started');
    console.log('Form data:', {
      email: formData.email,
      passwordLength: formData.password.length,
      rememberMe: formData.rememberMe
    });
    
    // Clear previous errors
    setValidationErrors({});
    clearError();

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      console.log('❌ Form validation errors:', errors);
      setValidationErrors(errors);
      return;
    }

    console.log('✅ Form validation passed');
    setIsSubmitting(true);

    try {
      console.log('📞 Calling login function...');
      await login(formData.email.trim().toLowerCase(), formData.password);
      
      console.log('✅ Login function completed successfully');
      
      // Handle remember me functionality
      if (formData.rememberMe) {
        setStorageItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL, formData.email);
        console.log('💾 Email saved for remember me');
      }

      // Redirect after successful login
      console.log('🔄 Redirecting after login...');
      redirectAfterLogin();
      
    } catch (error) {
      // Error is handled by the auth store and displayed via the error state
      console.error('💥 Login Form - Login failed:', error);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Login Form - Submit completed');
    }
  };

  /**
   * Toggles password visibility
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const isFormLoading = isLoading || isSubmitting;

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
              {/* Global Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isFormLoading}
                  className={`font-body ${validationErrors.email ? 'border-red-500' : ''}`}
                  autoComplete="email"
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-600 font-body">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="font-body font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isFormLoading}
                    className={`font-body pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={togglePasswordVisibility}
                    disabled={isFormLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-red-600 font-body">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => 
                      handleInputChange('rememberMe', checked === true)
                    }
                    disabled={isFormLoading}
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm font-body cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  to="/reset-password"
                  className="text-sm font-body text-brius-primary hover:text-brius-secondary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isFormLoading}
                className="w-full bg-brius-primary hover:bg-brius-secondary rounded-full font-body font-semibold"
              >
                {isFormLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LandingHeader } from '@/components/landing/landing-header';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { useAuthState } from '@/hooks/use-auth';

/**
 * Landing Page Component
 * 
 * The main landing page for the application.
 * Displays marketing content and navigation to login/portal.
 * Automatically redirects authenticated users to the portal.
 */
const Index: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuthState();

  // Redirect authenticated users to portal
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate('/portal', { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);

  /**
   * Handles navigation to login page
   */
  const handleLoginClick = () => {
    navigate('/login');
  };

  /**
   * Handles get started button click
   */
  const handleGetStartedClick = () => {
    navigate('/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-white"
    >
      <LandingHeader onLoginClick={handleLoginClick} />
      <HeroSection onGetStartedClick={handleGetStartedClick} />
      <FeaturesSection />
      
      {/* Footer */}
      <footer className="bg-brius-black text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <img 
                  src="/lovable-uploads/d524ee9f-9364-4fec-974d-89ee1b6d535d.png"
                  alt="Brius Technologies"
                  className="h-8 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-gray-300 font-body">
                The Secret Behind Your Operations Excellence
              </p>
            </div>
            <div>
              <h3 className="text-lg font-display font-medium mb-4">Contact</h3>
              <div className="space-y-2 text-gray-300 font-body">
                <p>2611 Westgrove Dr Ste 109</p>
                <p>Carrollton, TX 75006</p>
                <p>Phone: 234.564.3134</p>
                <p>Email: support@brius.com</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-display font-medium mb-4">Solutions</h3>
              <div className="space-y-2 text-gray-300 font-body">
                <p>AI Assistant</p>
                <p>Order Management</p>
                <p>Patient Analytics</p>
                <p>Reporting Dashboard</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-display font-medium mb-4">Powered by</h3>
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/55562fc3-e2ae-416c-81af-f576c73a551b.png"
                  alt="Prometheus AI Platform"
                  className="h-10 w-10"
                />
                <div>
                  <p className="text-white font-body font-semibold">Prometheus</p>
                  <p className="text-gray-300 font-body text-sm">AI Platform</p>
                </div>
              </div>
              <p className="text-gray-400 font-body text-sm mt-3">
                Agent2Agent protocol and AI functionality powered by Whiterock Capital's Prometheus platform.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 font-body">
            <p>&copy; 2024 Brius Technologies Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

export default Index;

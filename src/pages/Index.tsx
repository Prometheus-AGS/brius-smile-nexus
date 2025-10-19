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

  console.log('🏠 Index Page - Rendering with state:', {
    isAuthenticated,
    isInitialized
  });

  // Redirect authenticated users to portal
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      console.log('🔄 Index Page - Redirecting authenticated user to portal');
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

  console.log('🎨 Index Page - About to render landing page');
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="/lovable-uploads/d524ee9f-9364-4fec-974d-89ee1b6d535d.png"
                alt="Brius Technologies"
                className="h-8 w-auto"
              />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">
                About
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
                Contact
              </a>
            </nav>
            <button
              onClick={handleLoginClick}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 font-semibold transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-24 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6">
            AI-Powered Operations
          </h1>
          <h2 className="text-2xl md:text-3xl font-medium text-white mb-8">
            The Secret Behind Your Operations Excellence
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto">
            Transform your orthodontic operations with intelligent AI agents that streamline
            order tracking, patient management, doctor fulfillment, and comprehensive reporting
            across all your systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStartedClick}
              className="bg-white text-blue-600 hover:bg-gray-100 rounded-full px-8 py-4 text-lg font-semibold transition-colors"
            >
              Get Started
            </button>
            <button
              className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-blue-600 rounded-full px-8 py-4 text-lg font-semibold transition-all duration-300"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6">
              Intelligent Operations Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powered by advanced AI agents and the Agent2Agent protocol, our platform
              connects all your systems for seamless operations management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'AI Assistant', icon: '🤖', desc: 'Intelligent chat assistant with access to all your systems and data for instant answers and automated workflows.' },
              { title: 'Order Tracking', icon: '📦', desc: 'Real-time visibility into manufacturing, shipping, and delivery of orthodontic appliances with predictive analytics.' },
              { title: 'Patient Management', icon: '👥', desc: 'Comprehensive patient data integration with treatment progress tracking and automated communication.' },
              { title: 'Doctor Fulfillment', icon: '⚕️', desc: 'Streamlined custom appliance manufacturing with quality control and delivery optimization.' },
              { title: 'Unified Reporting', icon: '📊', desc: 'Cross-system analytics combining ERP, patient data, communications, and financial information.' },
              { title: 'Knowledge Library', icon: '📚', desc: 'Centralized knowledge base with RAG-powered search across corporate and personal documentation.' }
            ].map((feature, index) => (
              <div key={feature.title} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
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
              <p className="text-gray-300">
                The Secret Behind Your Operations Excellence
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Contact</h3>
              <div className="space-y-2 text-gray-300">
                <p>2611 Westgrove Dr Ste 109</p>
                <p>Carrollton, TX 75006</p>
                <p>Phone: 234.564.3134</p>
                <p>Email: support@brius.com</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Solutions</h3>
              <div className="space-y-2 text-gray-300">
                <p>AI Assistant</p>
                <p>Order Management</p>
                <p>Patient Analytics</p>
                <p>Reporting Dashboard</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Powered by</h3>
              <div className="flex items-center space-x-3">
                <img
                  src="/lovable-uploads/55562fc3-e2ae-416c-81af-f576c73a551b.png"
                  alt="Prometheus AI Platform"
                  className="h-10 w-10"
                />
                <div>
                  <p className="text-white font-semibold">Prometheus</p>
                  <p className="text-gray-300 text-sm">AI Platform</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                Agent2Agent protocol and AI functionality powered by Whiterock Capital's Prometheus platform.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Brius Technologies Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

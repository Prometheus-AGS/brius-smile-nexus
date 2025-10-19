
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

interface LandingHeaderProps {
  onLoginClick: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onLoginClick }) => {
  console.log('🎯 LandingHeader - Rendering header component');
  
  return (
    <motion.header 
      className="bg-white shadow-sm border-b border-brius-gray-light"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-brius-black hover:text-brius-primary transition-colors font-body">
              Features
            </a>
            <a href="#about" className="text-brius-black hover:text-brius-primary transition-colors font-body">
              About
            </a>
            <a href="#contact" className="text-brius-black hover:text-brius-primary transition-colors font-body">
              Contact
            </a>
          </nav>
          <Button 
            onClick={onLoginClick}
            className="bg-brius-primary hover:bg-brius-secondary text-white rounded-full px-6 py-2 font-body font-semibold"
          >
            Login
          </Button>
        </div>
      </div>
    </motion.header>
  );
};

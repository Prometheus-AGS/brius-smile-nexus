
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStartedClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStartedClick }) => {
  return (
    <section className="bg-brius-gradient py-24 px-4">
      <div className="container mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-display font-light text-white mb-6">
            AI-Powered Operations
          </h1>
          <h2 className="text-2xl md:text-3xl font-display font-medium text-white mb-8">
            The Secret Behind Your Operations Excellence
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto font-body">
            Transform your orthodontic operations with intelligent AI agents that streamline 
            order tracking, patient management, doctor fulfillment, and comprehensive reporting 
            across all your systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onGetStartedClick}
              size="lg"
              className="bg-white text-brius-primary hover:bg-brius-gray-light rounded-full px-8 py-4 text-lg font-body font-semibold"
            >
              Get Started
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-brius-primary rounded-full px-8 py-4 text-lg font-body font-semibold transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

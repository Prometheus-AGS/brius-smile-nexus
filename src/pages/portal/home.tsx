import React from 'react';
import { HomeApp } from '@/components/apps/home-app';

/**
 * Home Page Component
 * 
 * Route page that wraps the HomeApp component.
 * Accessible at /portal (index route)
 */
const HomePage: React.FC = () => {
  return <HomeApp />;
};

export default HomePage;
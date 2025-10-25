import React, { useEffect } from 'react';

/**
 * HomeApp Component
 * Displays a "Coming Soon" message for the home page
 * All dashboard functionality has been removed pending future implementation
 */
export const HomeApp: React.FC = () => {
  useEffect(() => {
    console.log('🏠 HomeApp - Component MOUNTED at', new Date().toISOString());
    console.log('🏠 HomeApp - Window location:', window.location.href);
    console.log('🏠 HomeApp - Pathname:', window.location.pathname);
    
    // Set up an interval to log that we're still mounted
    const interval = setInterval(() => {
      console.log('✅ HomeApp - Still mounted at', new Date().toLocaleTimeString());
    }, 2000);
    
    return () => {
      console.log('❌ HomeApp - Component UNMOUNTING at', new Date().toISOString());
      clearInterval(interval);
    };
  }, []);

  console.log('🎨 HomeApp - Rendering at', new Date().toLocaleTimeString());

  return (
    <div 
      className="w-full min-h-[600px] flex items-center justify-center p-8"
      style={{ 
        backgroundColor: 'white',
        minHeight: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="text-center space-y-6 max-w-2xl"
        style={{
          textAlign: 'center',
          maxWidth: '48rem',
          padding: '2rem'
        }}
      >
        <h1 
          className="text-6xl font-bold text-gray-900"
          style={{
            fontSize: '3.75rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1.5rem'
          }}
        >
          Coming Soon
        </h1>
        
        <p 
          className="text-xl text-gray-600 leading-relaxed"
          style={{
            fontSize: '1.25rem',
            color: '#4B5563',
            lineHeight: '1.75'
          }}
        >
          The home dashboard is currently under development. Check back soon for updates.
        </p>
        
        <div className="pt-4 flex items-center justify-center gap-2">
          <div 
            className="w-2 h-2 rounded-full bg-green-500"
            style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '9999px',
              backgroundColor: '#10B981',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          <span className="text-sm text-gray-500" style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            System Online
          </span>
        </div>
      </div>
    </div>
  );
};

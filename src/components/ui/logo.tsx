
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/lovable-uploads/d524ee9f-9364-4fec-974d-89ee1b6d535d.png"
        alt="Brius Technologies"
        className="h-8 w-auto"
      />
    </div>
  );
};

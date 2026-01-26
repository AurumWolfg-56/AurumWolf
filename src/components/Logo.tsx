
import React from 'react';

interface LogoProps {
  className?: string;
  iconSize?: string;
  textSize?: string;
  showText?: boolean;
  stacked?: boolean; // New prop for mobile drawers
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconSize = "w-8 h-8", 
  textSize = "text-xl",
  showText = true,
  stacked = false
}) => {
  return (
    <div className={`flex ${stacked ? 'flex-col justify-center' : 'flex-row'} items-center gap-3 ${className}`}>
      {/* Icon Container */}
      <div className={`relative group cursor-pointer ${iconSize} shrink-0`}>
        <div className="absolute inset-0 bg-gold-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        
        <div className="relative w-full h-full drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <linearGradient id="goldGradientBright" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFFFFF" /> 
                        <stop offset="30%" stopColor="#FFD700" />
                        <stop offset="70%" stopColor="#DAA520" />
                        <stop offset="100%" stopColor="#B8860B" />
                    </linearGradient>
                </defs>
                <path d="M50 94 L18 71 L8 40 L29 9 L50 34 L71 9 L92 40 L82 71 Z" stroke="rgba(218, 165, 32, 0.8)" strokeWidth="1.5" fill="none"/>
                <path d="M50 92 L20 70 L10 40 L30 10 L50 35 Z" fill="url(#goldGradientBright)" />
                <path d="M50 35 L70 10 L90 40 L80 70 L50 92 Z" fill="url(#goldGradientBright)" fillOpacity="0.85"/>
                <path d="M50 35 L50 92 L80 70 L50 35 Z" className="fill-neutral-900/60 dark:fill-black/40" />
                <path d="M30 10 L38 35 L50 35 L30 10" fill="white" fillOpacity="0.5" />
                <path d="M32 48 L44 52 L32 54 Z" className="fill-neutral-900" />
                <path d="M68 48 L56 52 L68 54 Z" className="fill-neutral-900" />
            </svg>
        </div>
      </div>
      
      {/* Text Container */}
      {showText && (
        <div className={`flex flex-col ${stacked ? 'items-center mt-2' : 'justify-center'}`}>
          <span className={`font-display font-bold ${textSize} tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 via-gold-600 to-gold-500 dark:from-white dark:via-gold-300 dark:to-gold-500 transition-all duration-300`}>
            AURUMWOLF
          </span>
        </div>
      )}
    </div>
  );
};

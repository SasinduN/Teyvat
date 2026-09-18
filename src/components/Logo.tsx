import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'auto', className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-7 text-lg',
    md: 'h-9 text-xl',
    lg: 'h-12 text-2xl'
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 42
  };

  const currentSize = iconSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 font-sans select-none ${sizeClasses[size]} ${className}`}>
      {/* Eye + Travel Location Pin Icon */}
      <div className="relative flex items-center justify-center transition-transform hover:scale-105 duration-300">
        <svg
          width={currentSize}
          height={currentSize}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* Outer Eye Outline */}
          <path
            d="M4 22C4 22 11 10 22 10C33 10 40 22 40 22C40 22 33 34 22 34C11 34 4 22 4 22Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={variant === 'dark' ? 'text-[#1A1A1A]' : variant === 'light' ? 'text-white' : 'text-current'}
          />
          {/* Inner Golden Globe / Iris Arc */}
          <circle
            cx="22"
            cy="22"
            r="8"
            stroke="#D4AF37"
            strokeWidth="2"
            className="opacity-90"
          />
          {/* Center Location Pin Pupil */}
          <path
            d="M22 17C19.7909 17 18 18.7909 18 21C18 23.8 22 27 22 27C22 27 26 23.8 26 21C26 18.7909 24.2091 17 22 17Z"
            fill="#368E6B"
          />
          {/* Pupil Center Light Dot */}
          <circle cx="22" cy="20.5" r="1.5" fill="#FAF8F5" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1 font-heading font-bold tracking-tight">
          <span className={variant === 'dark' ? 'text-[#0F2E23]' : variant === 'light' ? 'text-white' : 'text-current'}>
            TRAVEL
          </span>
          <span className="text-[#C5A059] font-extrabold">EYE</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.25em] font-sans font-semibold text-[#8B9A93] mt-0.5">
          SRI LANKA
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import { ASSET_IMAGES } from '../../data/mockData';

interface BrandLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md'
}) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <img
          src={ASSET_IMAGES.officialLogo}
          alt="Property Studio Logo"
          className="h-10 w-10 object-contain shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col text-left">
          <div className="flex items-center text-sm font-black tracking-tight leading-none font-display">
            <span className="text-[#000000]">PROPERTY</span>
            <span className="text-[#B48529] ml-1">STUDIO</span>
          </div>
          <span className="text-[9px] font-bold tracking-wider text-[#B48529] uppercase mt-0.5 font-mono">
            BY SWAMY REDDY JAVIDI
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <div className={`relative shrink-0 flex items-center justify-center ${className}`}>
        <img
          src={ASSET_IMAGES.officialLogo}
          alt="Property Studio Logo"
          className="h-10 w-10 object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Full variant matching Image 2 exactly
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img
        src={ASSET_IMAGES.officialLogo}
        alt="Property Studio by Swamy Reddy Javidi"
        className="w-full max-w-[360px] h-auto object-contain mx-auto"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

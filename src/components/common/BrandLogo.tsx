import React from 'react';
import { ASSET_IMAGES } from '../../data/mockData';

interface BrandLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASS = {
  sm: 'h-9',
  md: 'h-16',
  lg: 'h-20',
  xl: 'h-28'
} as const;

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md'
}) => {
  const frame = variant === 'full'
    ? 'w-full h-auto max-w-[420px]'
    : `${SIZE_CLASS[size]} w-auto`;

  return (
    <img
      src={ASSET_IMAGES.officialLogo}
      alt="Property Studio by Swamy Reddy Javidi"
      className={`${frame} object-contain ${className}`}
    />
  );
};

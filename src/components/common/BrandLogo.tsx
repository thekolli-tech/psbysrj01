import React, { useState } from 'react';
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
  const initialSrc = variant === 'full'
    ? (ASSET_IMAGES.officialLogoSquare || ASSET_IMAGES.officialLogo)
    : ASSET_IMAGES.officialLogo;

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);

  const frame = variant === 'full'
    ? 'w-full h-auto max-w-[420px]'
    : `${SIZE_CLASS[size]} w-auto`;

  return (
    <img
      src={imgSrc}
      alt="Property Studio by Swamy Reddy Javidi"
      className={`${frame} object-contain ${className}`}
      onError={() => {
        if (imgSrc !== ASSET_IMAGES.officialLogo) {
          setImgSrc(ASSET_IMAGES.officialLogo);
        } else if (imgSrc !== '/brand/property-studio-logo-square.jpg') {
          setImgSrc('/brand/property-studio-logo-square.jpg');
        }
      }}
    />
  );
};

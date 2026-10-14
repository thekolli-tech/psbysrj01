import React from 'react';
import { ASSET_IMAGES } from '../../data/mockData';

interface OfficialBrandCardProps {
  className?: string;
}

/**
 * Pixel-faithful reproduction of the official "Property Studio by Swamy Reddy Javidi"
 * composite asset uploaded by the user:
 * - Left wing: Warm mustard/gold backdrop with Swamy Reddy Javidi standing in navy suit & tie.
 * - Right wing: Crisp white surface with official Property Studio architectural video-camera emblem,
 *   brand wordmark, "BY SWAMY REDDY JAVIDI" gold badge, and tagline.
 */
export const OfficialBrandCard: React.FC<OfficialBrandCardProps> = ({
  className = ''
}) => {
  return (
    <div
      className={`relative w-full aspect-square bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 select-none ${className}`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.05)'
      }}
    >
      <img
        src={ASSET_IMAGES.officialHero}
        alt="Property Studio by Swamy Reddy Javidi"
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

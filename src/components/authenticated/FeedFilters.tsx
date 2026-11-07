import React from 'react';
import { Filter, X } from 'lucide-react';

export const FEED_CATEGORY_FILTERS = [
  'ALL',
  'General Discussion',
  'Construction',
  'Legal & RERA',
  'Property Investment',
  'Rental Yield',
  'Architecture & Vaastu',
  'Interior Design',
  'Land & Plotting',
  'Market Trends',
  'Luxury Properties'
] as const;

export type FeedCategoryFilter = (typeof FEED_CATEGORY_FILTERS)[number];

interface FeedFiltersProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="py-2.5 px-3 sm:px-4 bg-white border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0 pr-1 border-r border-slate-200">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">Filter:</span>
      </div>

      <div className="flex items-center gap-1.5">
        {FEED_CATEGORY_FILTERS.map(cat => {
          const isSelected = selectedCategory === cat || (cat === 'ALL' && (!selectedCategory || selectedCategory === 'ALL'));
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-[#182A3E] text-white shadow-xs border border-[#182A3E]'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              <span>{cat === 'ALL' ? 'All Topics' : cat}</span>
              {isSelected && cat !== 'ALL' && (
                <span
                  onClick={e => {
                    e.stopPropagation();
                    onSelectCategory('ALL');
                  }}
                  className="hover:bg-white/20 rounded-full p-0.5 ml-0.5 inline-flex"
                >
                  <X className="w-3 h-3 text-slate-300 hover:text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

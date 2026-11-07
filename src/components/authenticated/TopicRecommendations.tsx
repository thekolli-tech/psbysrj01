import React from 'react';
import { Compass, Hash } from 'lucide-react';

interface TopicRecommendationsProps {
  userInterests?: string[];
  onSelectTopic: (topic: string) => void;
  selectedTopic?: string;
}

const DEFAULT_TOPICS = [
  'Kokapet & Neopolis',
  'Construction Updates',
  'Legal & RERA',
  'Rental Yield & ROI',
  'Luxury Villas & Communities',
  'Architecture & Vaastu'
];

export const TopicRecommendations: React.FC<TopicRecommendationsProps> = ({
  userInterests = [],
  onSelectTopic,
  selectedTopic
}) => {
  const topics = React.useMemo(() => {
    if (userInterests && userInterests.length > 0) {
      return userInterests.slice(0, 6);
    }
    return DEFAULT_TOPICS;
  }, [userInterests]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#B49029]" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-800">
            Discussion Topics
          </h3>
        </div>
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
          Topics
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {topics.map(topicName => {
          const isSelected = selectedTopic === topicName;
          return (
            <button
              key={topicName}
              type="button"
              onClick={() => onSelectTopic(isSelected ? 'ALL' : topicName)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-[#182A3E] text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 hover:border-slate-300'
              }`}
            >
              <Hash className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[140px]">{topicName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

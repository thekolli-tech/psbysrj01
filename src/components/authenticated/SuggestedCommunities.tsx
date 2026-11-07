import React, { useState } from 'react';
import { CommunityHub } from '../../types';
import { Building, Users, Check, Plus, ArrowRight } from 'lucide-react';

interface SuggestedCommunitiesProps {
  communities: CommunityHub[];
  onSelectCommunity: (communityId: string) => void;
  onJoinCommunity?: (communityId: string) => Promise<any>;
  onLeaveCommunity?: (communityId: string) => Promise<any>;
  onViewAll?: () => void;
}

export const SuggestedCommunities: React.FC<SuggestedCommunitiesProps> = ({
  communities,
  onSelectCommunity,
  onJoinCommunity,
  onLeaveCommunity,
  onViewAll
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const displayCommunities = (communities || []).slice(0, 5);

  const handleToggleJoin = async (e: React.MouseEvent, comm: CommunityHub) => {
    e.stopPropagation();
    const isJoined = comm.membershipStatus === 'ACTIVE';
    setLoadingId(comm.id);
    try {
      if (isJoined && onLeaveCommunity) {
        await onLeaveCommunity(comm.id);
      } else if (!isJoined && onJoinCommunity) {
        await onJoinCommunity(comm.id);
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-[#B49029]" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-800">
            Suggested Communities
          </h3>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-bold text-[#182A3E] hover:text-[#B49029] transition-colors cursor-pointer"
          >
            Explore All
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2.5">
        {displayCommunities.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No communities available.</p>
        ) : (
          displayCommunities.map(comm => {
            const isJoined = comm.membershipStatus === 'ACTIVE';
            const isLoading = loadingId === comm.id;
            return (
              <div
                key={comm.id}
                onClick={() => onSelectCommunity(comm.id)}
                className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-[#182A3E] group-hover:border-[#B49029] transition-colors shrink-0">
                    {comm.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-[#182A3E] truncate">
                      {comm.name}
                    </span>
                    <span className="block text-[11px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {comm.memberCount || 1} members
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={e => handleToggleJoin(e, comm)}
                  disabled={isLoading}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                    isJoined
                      ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                      : 'bg-[#182A3E] hover:bg-[#203750] text-white shadow-xs'
                  }`}
                >
                  {isLoading ? (
                    '...'
                  ) : isJoined ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Joined
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      Join
                    </span>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

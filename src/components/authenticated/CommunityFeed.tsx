import React, { useState, useMemo } from 'react';
import { CommunityPost, CommunityHub, User } from '../../types';
import { FeedTabs, FeedTabType } from './FeedTabs';
import { FeedFilters } from './FeedFilters';
import { DiscussionCard } from './DiscussionCard';
import { QuestionCard } from './QuestionCard';
import { DiscussionDetailView } from '../community/DiscussionDetailView';
import { ComposerMode } from './PostComposer';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  HelpCircle,
  MessageSquare,
  Sparkles,
  Building,
  Image as ImageIcon,
  Search,
  RotateCcw,
  Plus
} from 'lucide-react';

interface CommunityFeedProps {
  posts: CommunityPost[];
  communities: CommunityHub[];
  currentUser: User;
  onOpenComposer: (mode: ComposerMode) => void;
  onUpvotePost?: (postId: string) => void;
  onBookmarkPost?: (postId: string) => void;
  onSharePost?: (post: CommunityPost) => void;
  onReportPost?: (post: CommunityPost) => void;
  refreshPosts: () => Promise<void>;
  showToast: (msg: string) => void;
  repostDiscussion: (postId: string, note?: string) => Promise<{ success: boolean; reposted?: boolean; count?: number }>;
  bookmarkedPostIds?: Set<string>;
  searchQuery?: string;
  initialTopicFilter?: string;
}

export const BASELINE_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'intel-post-kokapet-dilemma',
    title: 'Both 32, combined in-hand ₹6.5L/month. Looking at 3BHKs in Kokapet/Financial District (~₹3-3.8Cr) vs continuing to rent in Gachibowli. Need a sanity check',
    content: "Hi folks, My wife and I are hitting that classic Hyderabad dilemma and could really use a grounded perspective from buyers who have either pulled the trigger or decided against it.\n\nWe're currently renting in Gachibowli (₹65,000/month). Our office commute is ~15 minutes to Financial District. We are eyeing 3BHK units (2,400 to 2,800 sft) in Kokapet near the Golden Mile / Neopolis access road.\n\nQuoted prices are ~₹11,000 - ₹12,500/sft plus amenities, car parking, and GST. Total outgo touches ₹3.5 Cr. At an 80% loan, monthly EMI is ~₹2.4L.\n\nOur financial snapshot:\n- Combined monthly in-hand: ₹6.5L\n- Fixed investments & equity: ₹1.4 Cr\n- Anticipated kid expenses in 2 years.\n\nIs Kokapet still fundamentally undervalued with the Neopolis commercial absorption timeline, or are we overextending at a local cycle peak?",
    topic: 'Kokapet & Neopolis',
    communityName: 'ps/HyderabadRealEstate',
    communityId: 'comm-hyd-re',
    authorId: 'u-praveen-v',
    authorName: 'Praveen Varma',
    authorRole: 'PROPERTY_SEEKER',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    upvotes: 218,
    commentsCount: 42,
    repostsCount: 14,
    replies: [],
    postType: 'POST',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    visibility: 'PUBLIC'
  },
  {
    id: 'intel-post-rera-checklist',
    title: 'RERA Telangana Project Registration & Tower Phase Verification: Critical legal checklist before signing Agreement of Sale (AOS)',
    content: "Essential legal checklist for high-ticket apartment purchases across Hyderabad:\n\n1. **Tower-Level Sanction Check**: Verify the TG RERA registration number applies specifically to your tower and floor range, not merely an earlier phase.\n2. **Encumbrance Certificate (EC)**: Pull 30-year search on the survey number. Verify zero mortgage liens from construction financing unless the bank provides a specific partial release NOC.\n3. **Sanctioned vs Marketing Layout**: Compare HMDA approved architectural drawings against the developer marketing brochure. Under RERA Section 14, structural modifications require 2/3rd allottee consent.\n4. **Car Parking Demarcation**: Ensure basement parking slot numbering is explicitly scheduled in the AOS schedule.",
    topic: 'Legal & RERA',
    communityName: 'ps/LegalCompliance',
    communityId: 'comm-legal',
    authorId: 'u-adv-satya',
    authorName: 'Adv. K. Satyanarayana',
    authorRole: 'RERA_AGENT',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    upvotes: 345,
    commentsCount: 68,
    repostsCount: 31,
    replies: [],
    postType: 'POST',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    visibility: 'PUBLIC'
  },
  {
    id: 'intel-post-neopolis-vs-tellapur',
    title: 'Neopolis Kokapet High-Rise (4BHK) vs Tellapur Gated Community Independent Villa: 10-Year Horizon Comparison',
    content: "Relocating from Singapore next year with a budget of ₹4.5 - ₹5.5 Cr. Exploring two contrasting asset classes:\n\n1. **Option A**: 4,200 sft high-rise apartment in Neopolis Kokapet (Sky club, 50+ floors, walking distance to SEZ).\n2. **Option B**: 350 sq.yd duplex villa (3,800 sft built-up) in a 40-acre gated enclave in Tellapur / Kollur corridor.\n\nLooking for community insights regarding:\n- Long-term capital appreciation differential\n- Rental yield and ease of high-ticket tenant placement\n- Monthly maintenance overhead (villa vs ultra-high-rise clubhouse)",
    topic: 'Luxury Villas & Communities',
    communityName: 'ps/LuxuryEstates',
    communityId: 'comm-luxury',
    authorId: 'u-rajeshwar-r',
    authorName: 'Dr. Rajeshwar Rao',
    authorRole: 'PROPERTY_SEEKER',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    upvotes: 164,
    commentsCount: 53,
    repostsCount: 9,
    replies: [],
    postType: 'QUESTION',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 52).toISOString(),
    visibility: 'PUBLIC'
  },
  {
    id: 'intel-post-infrastructure-report',
    title: 'Real-time Field Report: Kokapet Trumpet Interchange & Neopolis 100ft Link Road Connectivity (November 2026 Status)',
    content: "Ground inspection summary for Western Corridor buyers:\n\n- The trumpet interchange connecting Kokapet SEZ directly to the Outer Ring Road (ORR) is at 85% physical completion.\n- 36-meter master plan link roads connecting Financial District to Golden Mile have base asphalt completed.\n- Stormwater trunk conduits and underground electrical ducts are being commissioned ahead of commercial IT tower occupancy targeted for late 2027.\n\nTraffic friction around Gachibowli junction should reduce by ~35% once the trumpet flyover opens for bidirectional traffic.",
    topic: 'Construction Updates',
    communityName: 'ps/ConstructionWatch',
    communityId: 'comm-construction',
    authorId: 'u-venkat-s',
    authorName: 'Civil Eng. S. Venkat',
    authorRole: 'AGENT',
    thumbnailUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    upvotes: 112,
    commentsCount: 24,
    repostsCount: 7,
    replies: [],
    postType: 'POST',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 70).toISOString(),
    visibility: 'PUBLIC'
  }
];

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  posts,
  communities,
  currentUser,
  onOpenComposer,
  onUpvotePost,
  onBookmarkPost,
  onSharePost,
  onReportPost,
  refreshPosts,
  showToast,
  repostDiscussion,
  bookmarkedPostIds = new Set(),
  searchQuery = '',
  initialTopicFilter = 'ALL'
}) => {
  const [activeTab, setActiveTab] = useState<FeedTabType>('FOR_YOU');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialTopicFilter);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);

  // If a discussion is selected, render DiscussionDetailView
  if (selectedDiscussionId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
        <DiscussionDetailView
          postId={selectedDiscussionId}
          onBack={() => setSelectedDiscussionId(null)}
          currentUser={currentUser}
          isLoggedIn={true}
          allPosts={posts}
          showToast={showToast}
          refreshPosts={refreshPosts}
          repostDiscussion={repostDiscussion}
        />
      </div>
    );
  }

  // Filter & sort logic
  const filteredPosts = useMemo(() => {
    const combined = [...(posts || [])];
    BASELINE_COMMUNITY_POSTS.forEach(b => {
      if (!combined.some(p => p.id === b.id || p.title === b.title)) {
        combined.push(b);
      }
    });

    let result = combined.filter(p => {
      // Must not be deleted or rejected
      if (p.status === 'DELETED' || p.status === 'REJECTED') return false;
      return true;
    });

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== 'ALL') {
      const lowerCat = selectedCategory.toLowerCase();
      result = result.filter(p => {
        const topic = (p.topic || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        return topic.includes(lowerCat) || title.includes(lowerCat) || content.includes(lowerCat);
      });
    }

    // 2. Global / Local Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const author = (p.authorName || '').toLowerCase();
        const comm = (p.communityName || '').toLowerCase();
        const topic = (p.topic || '').toLowerCase();
        return (
          title.includes(q) ||
          content.includes(q) ||
          author.includes(q) ||
          comm.includes(q) ||
          topic.includes(q)
        );
      });
    }

    // 3. Feed Tab Filter & Sorting
    if (activeTab === 'FOR_YOU') {
      // Prioritize user's saved interests if present
      if (currentUser.interests && currentUser.interests.length > 0) {
        const interestSet = new Set(currentUser.interests.map(i => i.toLowerCase()));
        result.sort((a, b) => {
          const aMatch = interestSet.has((a.topic || '').toLowerCase()) ? 1 : 0;
          const bMatch = interestSet.has((b.topic || '').toLowerCase()) ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          return (b.upvotes || 0) - (a.upvotes || 0);
        });
      } else {
        // Default For You is balanced engagement
        result.sort((a, b) => (b.upvotes || 0) * 1.5 + (b.commentsCount || 0) - ((a.upvotes || 0) * 1.5 + (a.commentsCount || 0)));
      }
    } else if (activeTab === 'FOLLOWING') {
      // Posts where following is true, or by author
      const followingList = result.filter(p => p.following || p.authorId === currentUser.id);
      if (followingList.length > 0) {
        result = followingList;
      }
    } else if (activeTab === 'LATEST') {
      result.sort((a, b) => {
        const timeA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
        const timeB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
        return timeB - timeA;
      });
    } else if (activeTab === 'TRENDING') {
      result.sort((a, b) => {
        const scoreA = (a.upvotes || 0) * 2 + (a.commentsCount || 0);
        const scoreB = (b.upvotes || 0) * 2 + (b.commentsCount || 0);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [posts, activeTab, selectedCategory, searchQuery, currentUser]);

  return (
    <div className="flex-1 flex flex-col gap-3.5 max-w-2xl xl:max-w-3xl w-full mx-auto">
      {/* 1. Feed Tabs Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <FeedTabs
          activeTab={activeTab}
          onTabChange={tab => setActiveTab(tab)}
        />

        {/* 2. Compact Content Creation Bar */}
        <div className="p-3 sm:p-4 bg-[#FAFCFD] border-b border-slate-200/80 flex items-center gap-3">
          <img
            src={getSafeAvatar(currentUser.avatar) || DEFAULT_AVATAR}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-white shrink-0"
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
          />

          <button
            type="button"
            onClick={() => onOpenComposer('DISCUSSION')}
            className="flex-1 text-left px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-400 hover:text-slate-600 font-medium transition-all shadow-2xs cursor-pointer truncate"
          >
            Start a discussion or ask Hyderabad property experts...
          </button>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenComposer('QUESTION')}
              className="p-2 hover:bg-amber-50 text-slate-500 hover:text-amber-700 rounded-xl transition-colors cursor-pointer"
              title="Ask a Question"
            >
              <HelpCircle className="w-4 h-4 text-amber-600" />
            </button>
            <button
              type="button"
              onClick={() => onOpenComposer('DISCUSSION')}
              className="p-2 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
              title="Add Image or Discussion"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" />
            </button>
            <button
              type="button"
              onClick={() => onOpenComposer('COMMUNITY')}
              className="p-2 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer"
              title="Start a Community"
            >
              <Building className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* 3. Category Filter Chips */}
        <FeedFilters
          selectedCategory={selectedCategory}
          onSelectCategory={cat => setSelectedCategory(cat)}
        />
      </div>

      {/* 4. Active Filter Notice (if filtered) */}
      {(selectedCategory !== 'ALL' || searchQuery.trim()) && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Showing results for {selectedCategory !== 'ALL' && `topic: "${selectedCategory}"`}
              {selectedCategory !== 'ALL' && searchQuery.trim() && ' & '}
              {searchQuery.trim() && `keyword: "${searchQuery}"`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 underline ml-2 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* 5. Dynamic Content Feed List */}
      <div className="space-y-3.5">
        {filteredPosts.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">No discussions found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Be the first to ask a question or start a conversation in this topic.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenComposer('QUESTION')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#182A3E] text-white rounded-xl text-xs font-bold hover:bg-[#203750] transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Ask First Question</span>
            </button>
          </div>
        ) : (
          filteredPosts.map(post => {
            const isBookmarked = bookmarkedPostIds.has(post.id);
            if (post.postType === 'QUESTION') {
              return (
                <QuestionCard
                  key={post.id}
                  post={post}
                  onOpenDetail={id => setSelectedDiscussionId(id)}
                  onUpvote={onUpvotePost}
                  onBookmark={onBookmarkPost}
                  isBookmarked={isBookmarked}
                />
              );
            }
            return (
              <DiscussionCard
                key={post.id}
                post={post}
                onOpenDetail={id => setSelectedDiscussionId(id)}
                onUpvote={onUpvotePost}
                onBookmark={onBookmarkPost}
                onShare={onSharePost}
                onReport={onReportPost}
                isBookmarked={isBookmarked}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

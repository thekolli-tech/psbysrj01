import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TopNavigation } from './TopNavigation';
import { LeftSidebar, NavItemKey } from './LeftSidebar';
import { MobileNavigation } from './MobileNavigation';
import { CommunityFeed } from './CommunityFeed';
import { PostComposer, ComposerMode } from './PostComposer';
import { TopicRecommendations } from './TopicRecommendations';
import { SuggestedCommunities } from './SuggestedCommunities';
import { TrendingDiscussions } from './TrendingDiscussions';
import { UpcomingLiveSessions } from './UpcomingLiveSessions';
import { ProfessionalRecommendations } from './ProfessionalRecommendations';
import { UniversalSearchModal } from '../common/UniversalSearchModal';
import { CommunityPost } from '../../types';
import { X, LifeBuoy } from 'lucide-react';

interface AuthenticatedAppLayoutProps {
  initialNav?: NavItemKey;
  children?: React.ReactNode;
  onOpenSupport?: () => void;
  onOpenWallet?: () => void;
}

export const AuthenticatedAppLayout: React.FC<AuthenticatedAppLayoutProps> = ({
  initialNav = 'HOME',
  children,
  onOpenSupport,
  onOpenWallet
}) => {
  const {
    activeView,
    currentUser,
    communityPosts,
    communities,
    createCommunityPost,
    createCommunityProposal,
    joinCommunity,
    leaveCommunity,
    upvoteCommunityPost,
    repostDiscussion,
    refreshPosts,
    refreshCommunities,
    setActiveView,
    logout,
    showToast,
    activeNav,
    setActiveNav,
    navigateToNav
  } = useApp();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>('DISCUSSION');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('ALL');

  // Load bookmarks & unread notifications
  useEffect(() => {
    fetch('/api/me/bookmarks')
      .then(res => res.json())
      .then(data => {
        if (data?.bookmarkedPostIds && Array.isArray(data.bookmarkedPostIds)) {
          setBookmarkedIds(new Set(data.bookmarkedPostIds));
        }
      })
      .catch(() => {});

    fetch('/api/notifications/unread-count')
      .then(res => res.json())
      .then(data => {
        if (typeof data?.unreadCount === 'number') {
          setUnreadNotifications(data.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  const handleBookmarkToggle = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/bookmark`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          if (data.bookmarked) {
            next.add(postId);
            showToast('Discussion saved to bookmarks!');
          } else {
            next.delete(postId);
            showToast('Bookmark removed.');
          }
          return next;
        });
      }
    } catch {}
  };

  const handleNavSelect = (key: NavItemKey) => {
    navigateToNav(key);
    setMobileSidebarOpen(false);
  };

  const displayedPosts = React.useMemo(() => {
    if (activeNav === 'SAVED_ITEMS') {
      return (communityPosts || []).filter(p => bookmarkedIds.has(p.id));
    }
    if (activeNav === 'MY_POSTS') {
      return (communityPosts || []).filter(p => p.authorId === currentUser.id);
    }
    if (activeNav === 'MY_QUESTIONS') {
      return (communityPosts || []).filter(
        p => p.postType === 'QUESTION' && (p.authorId === currentUser.id || !p.authorId)
      );
    }
    return communityPosts || [];
  }, [activeNav, communityPosts, bookmarkedIds, currentUser]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans w-full">
      {/* 1. Sticky Top Navigation */}
      <TopNavigation
        currentUser={currentUser}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenCreate={() => {
          setComposerMode('DISCUSSION');
          setComposerOpen(true);
        }}
        onOpenSupport={onOpenSupport || (() => setActiveView('CHAT'))}
        onOpenWallet={onOpenWallet || (() => {})}
        onLogout={logout}
        onNavigateHome={() => handleNavSelect('HOME')}
        onNavigateAbout={() => handleNavSelect('ABOUT')}
        activeView={activeView}
        onNavigateWorkspace={tab => handleNavSelect(tab === 'SETTINGS' ? 'MY_PROFILE' : 'MY_ENQUIRIES')}
        onNavigateAdmin={currentUser.role === 'SUPER_ADMIN' ? () => setActiveView('ADMIN') : undefined}
        onNavigateDeveloper={currentUser.role === 'DEVELOPER' ? () => setActiveView('DEVELOPER') : undefined}
        unreadCount={unreadNotifications}
        onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* 2. Main Three-Column Application Container (Full width when viewing Super Admin Console) */}
      <main className={`flex-1 mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 w-full ${activeView === 'ADMIN' ? 'max-w-[1600px]' : 'max-w-7xl 2xl:max-w-[1440px]'}`}>
        <div className="flex items-start justify-center gap-6">
          {/* Left Navigation Sidebar (Desktop sticky / collapsible; hidden in full-width Admin Console) */}
          {activeView !== 'ADMIN' && (
            <div className="hidden lg:block sticky top-20">
              <LeftSidebar
                activeItem={activeNav}
                onSelectNav={handleNavSelect}
                userRole={currentUser.role}
                savedCount={bookmarkedIds.size}
                onStartCommunity={() => {
                  setComposerMode('COMMUNITY');
                  setComposerOpen(true);
                }}
              />
            </div>
          )}

          {/* Center Column: Community Feed or Custom Workspace Content */}
          {(() => {
            const isWorkspace =
              activeView === 'DASHBOARD' ||
              ['MY_PROFILE', 'MY_POSTS', 'MY_QUESTIONS', 'MY_COMMUNITIES', 'MY_ENQUIRIES'].includes(activeNav);
            const isWideView =
              Boolean(activeView && !['HOME', 'COMMUNITY'].includes(activeView)) || isWorkspace;
            return (
              <>
                <div className={isWideView ? "flex-1 min-w-0 w-full" : "flex-1 min-w-0 max-w-3xl 2xl:max-w-4xl"}>
                  {children ? (
                    children
                  ) : (
                    <CommunityFeed
                      posts={displayedPosts}
                      communities={communities}
                      currentUser={currentUser}
                      onOpenComposer={mode => {
                        setComposerMode(mode);
                        setComposerOpen(true);
                      }}
                      onUpvotePost={upvoteCommunityPost}
                      onBookmarkPost={handleBookmarkToggle}
                      onSharePost={post => showToast(`Share link copied for "${post.title}"`)}
                      refreshPosts={refreshPosts}
                      showToast={showToast}
                      repostDiscussion={repostDiscussion}
                      bookmarkedPostIds={bookmarkedIds}
                      initialTopicFilter={selectedTopicFilter}
                    />
                  )}
                </div>

                {/* Right Column: Contextual Discovery Sidebar (Lightweight desktop discovery) */}
                {!isWideView && (
                  <div className="hidden xl:flex flex-col gap-4 w-72 2xl:w-80 shrink-0 sticky top-20">
            <TopicRecommendations
              userInterests={currentUser.interests}
              selectedTopic={selectedTopicFilter}
              onSelectTopic={t => setSelectedTopicFilter(t)}
            />

            <SuggestedCommunities
              communities={communities}
              onSelectCommunity={commId => {
                const comm = communities.find(c => c.id === commId);
                if (comm) setSelectedTopicFilter(comm.name);
              }}
              onJoinCommunity={joinCommunity}
              onLeaveCommunity={leaveCommunity}
              onViewAll={() => handleNavSelect('COMMUNITIES')}
            />

            <TrendingDiscussions
              posts={communityPosts || []}
              onOpenDetail={() => {}}
            />

            <UpcomingLiveSessions
              onJoinSession={() => setActiveView('CONFERENCE')}
            />

            <ProfessionalRecommendations
              onExploreDirectory={() => setActiveView('LEADS_MARKET')}
              onConnect={name => showToast(`Connected with ${name}! Enquiries logged in your workspace.`)}
            />
          </div>
                )}
              </>
            );
          })()}
        </div>
      </main>

      {/* 3. Mobile Navigation Bottom Bar */}
      <MobileNavigation
        activeItem={activeNav}
        onSelectNav={handleNavSelect}
        onOpenCreate={() => {
          setComposerMode('DISCUSSION');
          setComposerOpen(true);
        }}
      />

      {/* 4. Mobile Off-Canvas Drawer for Left Sidebar */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-72 max-w-[85%] bg-white h-full p-4 overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <span className="font-bold text-xs font-display text-slate-800 tracking-wider">NAVIGATION</span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <LeftSidebar
                activeItem={activeNav}
                onSelectNav={handleNavSelect}
                userRole={currentUser.role}
                savedCount={bookmarkedIds.size}
                onStartCommunity={() => {
                  setComposerMode('COMMUNITY');
                  setComposerOpen(true);
                  setMobileSidebarOpen(false);
                }}
              />
            </div>

            {/* Mobile Drawer Footer: Support Desk */}
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveView('CHAT');
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-[#182A3E] font-bold rounded-xl border border-amber-200 transition-colors"
              >
                <LifeBuoy className="w-4 h-4 text-[#B49029]" />
                <span>Secretariat Support Desk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Content Composer Modal */}
      <PostComposer
        isOpen={composerOpen}
        initialMode={composerMode}
        onClose={() => setComposerOpen(false)}
        communities={communities}
        currentUser={currentUser}
        onSubmitPost={createCommunityPost}
        onSubmitCommunity={createCommunityProposal}
        onSuccess={msg => {
          showToast(msg);
          refreshPosts();
          refreshCommunities();
        }}
      />

      {/* 6. Universal Search Modal */}
      <UniversalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onOpenSupport={onOpenSupport}
      />
    </div>
  );
};

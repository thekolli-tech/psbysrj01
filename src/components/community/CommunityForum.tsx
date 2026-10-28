import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CommunityPost, CommunityReply } from '../../types';
import { communityPostShareUrl, isCommunityPostId, readCommunitySearch } from '../../shared/communityEngagement';
import { AudioStoryPlayer } from '../common/AudioStoryPlayer';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  ShieldCheck,
  Star,
  PlusCircle,
  Building,
  CheckCircle2,
  Send,
  LogIn,
  Share2,
  Bookmark,
  TrendingUp,
  Flame,
  Clock,
  Users,
  ShieldAlert,
  X,
  Layers,
  Sparkles,
  Video,
  Volume2,
  Image as ImageIcon,
  Check,
  Flag,
  Globe,
  Radio,
  BarChart2,
  HelpCircle,
  Link2,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  UserCheck,
  UserPlus,
  Award,
  Calendar,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Compass,
  Lock
} from 'lucide-react';

interface CommunityForumViewProps {
  onOpenLoginModal?: () => void;
}

const COMMUNITY_TOPIC_LIST = [
  'ALL',
  'Kokapet & Neopolis',
  'Construction Updates',
  'Legal & RERA',
  'Rental Yield & ROI',
  'Luxury Villas & Communities',
  'Livability & Amenities',
  'Builder Credibility',
  'Architecture & Vaastu',
  'Interior Design & Renovation',
  'Price Trends & Market Updates'
] as const;

export const CommunityForumView: React.FC<CommunityForumViewProps> = ({ onOpenLoginModal }) => {
  const {
    communityPosts,
    properties,
    currentUser,
    isLoggedIn,
    showToast,
    createCommunityPost,
    communities,
    createCommunityProposal
  } = useApp();

  // Navigation & Filtering
  const [feedTab, setFeedTab] = useState<'FOR_YOU' | 'ALL' | 'AMAS' | 'FOLLOWING' | 'BOOKMARKS'>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [selectedCommunityId, setSelectedCommunityId] = useState<'ALL' | string>('ALL');
  const [sortMode, setSortMode] = useState<'HOT' | 'TOP' | 'NEW'>('HOT');
  const [questionQuery, setQuestionQuery] = useState('');

  // Modals
  const [showModal, setShowModal] = useState<'NONE' | 'UNIFIED' | 'PROPOSE_COMMUNITY' | 'USER_PROFILE' | 'REPORT'>('NONE');
  const [unifiedTab, setUnifiedTab] = useState<'QUESTION' | 'POST'>('QUESTION');
  const [postSubTab, setPostSubTab] = useState<'TEXT' | 'MEDIA' | 'LINK' | 'POLL' | 'AMA'>('TEXT');

  // Bookmarks & User Follows
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());

  // User Profile Modal State
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Moderation Report Modal State
  const [reportTarget, setReportTarget] = useState<{ type: 'POST' | 'COMMENT'; id: string; title: string } | null>(null);
  const [reportReason, setReportReason] = useState('Spam or commercial self-promotion');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Poll Vote In-Flight State
  const [pollVotingPostId, setPollVotingPostId] = useState<string | null>(null);
  const [selectedPollOption, setSelectedPollOption] = useState<Record<string, string>>({});

  // Replies & Comment Threads
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [isAmaAnswerInput, setIsAmaAnswerInput] = useState<Record<string, boolean>>({});

  // Question Form State (Quora Style)
  const [questionForm, setQuestionForm] = useState({
    title: '',
    context: '',
    topic: 'Kokapet & Neopolis',
    visibility: 'PUBLIC' as 'PUBLIC' | 'COMMUNITY'
  });
  const [duplicateWarning, setDuplicateWarning] = useState<{ exists: boolean; matches: Array<{ id: string; title: string; upvotes: number }> } | null>(null);
  const duplicateCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // Post Form State (Reddit / Quora Style)
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    topic: 'Kokapet & Neopolis',
    visibility: 'PUBLIC' as 'PUBLIC' | 'COMMUNITY',
    propertyId: '',
    communityId: '',
    mediaType: 'POST' as 'POST' | 'VIDEO' | 'PODCAST',
    mediaUrl: '',
    photoUrl: '',
    linkUrl: '',
    linkTitle: '',
    pollOptions: ['', '', ''],
    pollDuration: '7 days',
    amaHostName: currentUser.name || '',
    amaHostRole: currentUser.profession || currentUser.role || 'Industry Expert',
    amaStatus: 'UPCOMING' as 'UPCOMING' | 'LIVE' | 'ENDED',
    amaStartTime: ''
  });

  // Community Proposal Form
  const [commForm, setCommForm] = useState({
    name: '',
    category: 'Micro-Market Hub',
    location: 'Kokapet Neopolis, Hyderabad',
    description: '',
    rules: '1. No spam. 2. Verify RERA numbers before quoting delay metrics. 3. Civil discourse only.'
  });
  const [commSubmitting, setCommSubmitting] = useState(false);

  // Engagement Cache for instant optimistic UI
  const [engagement, setEngagement] = useState<Record<string, {
    agreeCount: number;
    disagreeCount: number;
    userVote: 1 | -1 | 0;
    followerCount: number;
    following: boolean;
    bookmarked?: boolean;
    bookmarkCount?: number;
    pollOptions?: any[];
    userVotedOptionId?: string | null;
  }>>({});

  // Load Bookmarks on Auth
  useEffect(() => {
    if (!isLoggedIn) {
      setBookmarkedPostIds(new Set());
      return;
    }
    fetch('/api/me/bookmarks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.posts)) {
          const ids = new Set<string>(data.posts.map((p: any) => p.id));
          setBookmarkedPostIds(ids);
        }
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // Deep Link Anchor Scroll
  useEffect(() => {
    const postId = new URLSearchParams(window.location.search).get('post') || '';
    if (!isCommunityPostId(postId)) return;
    document.getElementById(`community-post-${postId}`)?.scrollIntoView({ block: 'start' });
  }, [communityPosts]);

  // Live duplicate question check
  const handleQuestionTitleChange = (val: string) => {
    setQuestionForm(prev => ({ ...prev, title: val }));
    if (duplicateCheckTimer.current) clearTimeout(duplicateCheckTimer.current);

    if (val.trim().length < 5) {
      setDuplicateWarning(null);
      return;
    }

    duplicateCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/check-duplicate?title=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data?.exists && Array.isArray(data.matches) && data.matches.length > 0) {
          setDuplicateWarning(data);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }, 400);
  };

  const savedEngagement = (post: CommunityPost) => {
    const cached = engagement[post.id];
    return {
      agreeCount: cached?.agreeCount ?? post.agreeCount ?? 0,
      disagreeCount: cached?.disagreeCount ?? post.disagreeCount ?? 0,
      userVote: cached?.userVote ?? post.userVote ?? 0,
      followerCount: cached?.followerCount ?? post.followerCount ?? 0,
      following: cached?.following ?? Boolean(post.following),
      bookmarked: cached?.bookmarked ?? bookmarkedPostIds.has(post.id) ?? Boolean(post.bookmarked),
      bookmarkCount: cached?.bookmarkCount ?? post.bookmarkCount ?? 0,
      pollOptions: cached?.pollOptions ?? post.pollOptions ?? [],
      userVotedOptionId: cached?.userVotedOptionId ?? post.userVotedOptionId ?? null
    };
  };

  // Upvote / Downvote Vote Handler
  const handleVote = async (post: CommunityPost, direction: 1 | -1) => {
    if (!isLoggedIn) {
      showToast('Please sign in to vote on community discussions.');
      onOpenLoginModal?.();
      return;
    }
    try {
      const response = await fetch(`/api/community/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: direction })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Vote was not saved.');
      const current = savedEngagement(post);
      setEngagement(prev => ({
        ...prev,
        [post.id]: {
          ...current,
          agreeCount: Number(data.agreeCount || 0),
          disagreeCount: Number(data.disagreeCount || 0),
          userVote: data.userVote === 1 || data.userVote === -1 ? data.userVote : 0
        }
      }));
    } catch (err: any) {
      showToast(err.message || 'Vote was not saved.');
    }
  };

  // Follow / Unfollow Discussion Handler
  const handleFollow = async (post: CommunityPost) => {
    if (!isLoggedIn) {
      showToast('Please sign in to follow a discussion.');
      onOpenLoginModal?.();
      return;
    }
    try {
      const response = await fetch(`/api/community/posts/${post.id}/follow`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Follow was not saved.');
      const current = savedEngagement(post);
      setEngagement(prev => ({
        ...prev,
        [post.id]: {
          ...current,
          followerCount: Number(data.followerCount || 0),
          following: Boolean(data.following)
        }
      }));
      showToast(data.following ? 'You are following this discussion.' : 'You unfollowed this discussion.');
    } catch (err: any) {
      showToast(err.message || 'Follow was not saved.');
    }
  };

  // Bookmark / Unbookmark Handler
  const handleToggleBookmark = async (post: CommunityPost) => {
    if (!isLoggedIn) {
      showToast('Please sign in to bookmark discussions.');
      onOpenLoginModal?.();
      return;
    }
    try {
      const response = await fetch(`/api/community/posts/${post.id}/bookmark`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update bookmark.');
      const current = savedEngagement(post);
      setEngagement(prev => ({
        ...prev,
        [post.id]: {
          ...current,
          bookmarked: Boolean(data.bookmarked),
          bookmarkCount: Number(data.bookmarkCount || 0)
        }
      }));
      setBookmarkedPostIds(prev => {
        const next = new Set(prev);
        if (data.bookmarked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      showToast(data.bookmarked ? 'Discussion saved to your Bookmarks.' : 'Discussion removed from Bookmarks.');
    } catch (err: any) {
      showToast(err.message || 'Bookmark action failed.');
    }
  };

  // Follow / Unfollow User Handler
  const handleToggleFollowUser = async (targetUserId: string, targetName?: string) => {
    if (!isLoggedIn) {
      showToast('Please sign in to follow community members.');
      onOpenLoginModal?.();
      return;
    }
    if (currentUser.id === targetUserId) {
      showToast('You cannot follow yourself.');
      return;
    }
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update follow status.');
      setFollowedUserIds(prev => {
        const next = new Set(prev);
        if (data.following) next.add(targetUserId);
        else next.delete(targetUserId);
        return next;
      });
      if (profileData && profileData.id === targetUserId) {
        setProfileData((prev: any) => ({
          ...prev,
          isFollowing: data.following,
          followerCount: data.followerCount
        }));
      }
      showToast(data.following ? `Now following ${targetName || 'user'}!` : `Unfollowed ${targetName || 'user'}.`);
    } catch (err: any) {
      showToast(err.message || 'Follow action failed.');
    }
  };

  // Poll Vote Handler
  const handleVotePoll = async (postId: string, optionId: string) => {
    if (!isLoggedIn) {
      showToast('Please sign in to vote on community polls.');
      onOpenLoginModal?.();
      return;
    }
    setPollVotingPostId(postId);
    try {
      const res = await fetch(`/api/community/posts/${postId}/poll-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cast poll vote.');
      setEngagement(prev => {
        const current = prev[postId] || emptyPostEngagement();
        return {
          ...prev,
          [postId]: {
            ...current,
            pollOptions: data.pollOptions,
            userVotedOptionId: data.userVotedOptionId
          }
        };
      });
      showToast('Poll vote recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record poll vote.');
    } finally {
      setPollVotingPostId(null);
    }
  };

  const emptyPostEngagement = () => ({
    agreeCount: 0,
    disagreeCount: 0,
    userVote: 0 as const,
    followerCount: 0,
    following: false,
    bookmarked: false,
    bookmarkCount: 0
  });

  // Open User Profile Modal
  const handleOpenUserProfile = async (userId?: string) => {
    if (!userId) return;
    setSelectedProfileUserId(userId);
    setShowModal('USER_PROFILE');
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/profile`);
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfileData(data.profile);
        if (data.profile.isFollowing) {
          setFollowedUserIds(prev => new Set(prev).add(userId));
        }
      } else {
        showToast('Could not load user profile.');
        setShowModal('NONE');
      }
    } catch {
      showToast('Could not load user profile.');
      setShowModal('NONE');
    } finally {
      setProfileLoading(false);
    }
  };

  // Open Moderation Report Modal
  const handleOpenReportModal = (post: CommunityPost) => {
    if (!isLoggedIn) {
      showToast('Please sign in to report discussions.');
      onOpenLoginModal?.();
      return;
    }
    setReportTarget({ type: 'POST', id: post.id, title: post.title });
    setShowModal('REPORT');
  };

  // Submit Moderation Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setSubmittingReport(true);
    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: reportTarget.type,
          targetId: reportTarget.id,
          reason: reportReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');
      showToast('Report submitted for Super Admin review. Thank you.');
      setShowModal('NONE');
      setReportTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Could not submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Share Handler
  const handleShare = async (post: CommunityPost) => {
    const url = communityPostShareUrl(window.location.origin, post.id);
    if (!url) {
      showToast('This discussion does not have a public link.');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Discussion link copied to clipboard.');
    } catch {
      showToast('The discussion link could not be copied.');
    }
  };

  // Submit Question (Quora Style Modal)
  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.title.trim()) {
      showToast('Please enter a question title.');
      return;
    }
    if (!isLoggedIn) {
      showToast('Please sign in to ask a question.');
      onOpenLoginModal?.();
      return;
    }

    createCommunityPost({
      authorName: currentUser.name,
      authorRole: currentUser.role,
      topic: questionForm.topic,
      title: questionForm.title.trim(),
      content: questionForm.context.trim() || questionForm.title.trim(),
      mediaType: 'POST',
      postType: 'QUESTION',
      visibility: questionForm.visibility
    });

    setQuestionForm({
      title: '',
      context: '',
      topic: 'Kokapet & Neopolis',
      visibility: 'PUBLIC'
    });
    setDuplicateWarning(null);
    setShowModal('NONE');
  };

  // Submit Post (Reddit & Quora Style Modal)
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title.trim()) {
      showToast('Please provide a post title.');
      return;
    }
    if (!isLoggedIn) {
      showToast('Please sign in to create a post.');
      onOpenLoginModal?.();
      return;
    }

    const prop = properties.find(p => p.id === postForm.propertyId);
    let attachments: Array<{ type: string; url: string; name: string }> | undefined = undefined;
    if (postForm.photoUrl) {
      attachments = [{ type: 'image', url: postForm.photoUrl, name: 'Attached Media' }];
    }

    let pollOptions: Array<{ id: string; text: string; votes: number }> | undefined = undefined;
    let postType: 'QUESTION' | 'POST' | 'POLL' | 'AMA' = 'POST';

    if (postSubTab === 'POLL') {
      postType = 'POLL';
      const validOptions = postForm.pollOptions.filter(o => o.trim().length > 0);
      if (validOptions.length < 2) {
        showToast('Poll requires at least 2 options.');
        return;
      }
      pollOptions = validOptions.map((text, i) => ({
        id: `opt_${i + 1}`,
        text: text.trim(),
        votes: 0
      }));
    } else if (postSubTab === 'AMA') {
      postType = 'AMA';
    }

    createCommunityPost({
      authorName: currentUser.name,
      authorRole: currentUser.role,
      topic: postForm.topic,
      title: postForm.title.trim(),
      content: postForm.content.trim() || postForm.title.trim(),
      propertyId: postForm.propertyId || undefined,
      propertyName: prop ? prop.title : undefined,
      communityId: postForm.communityId || undefined,
      mediaType: postForm.mediaType,
      mediaUrl: postForm.mediaUrl || postForm.linkUrl || undefined,
      thumbnailUrl: postForm.photoUrl || undefined,
      attachments,
      postType,
      visibility: postForm.visibility,
      pollOptions,
      amaHostName: postSubTab === 'AMA' ? (postForm.amaHostName.trim() || currentUser.name) : undefined,
      amaHostRole: postSubTab === 'AMA' ? (postForm.amaHostRole.trim() || currentUser.profession || 'Host') : undefined,
      amaStatus: postSubTab === 'AMA' ? postForm.amaStatus : undefined,
      amaStartTime: postSubTab === 'AMA' ? postForm.amaStartTime : undefined
    });

    setPostForm({
      title: '',
      content: '',
      topic: 'Kokapet & Neopolis',
      visibility: 'PUBLIC',
      propertyId: '',
      communityId: '',
      mediaType: 'POST',
      mediaUrl: '',
      photoUrl: '',
      linkUrl: '',
      linkTitle: '',
      pollOptions: ['', '', ''],
      pollDuration: '7 days',
      amaHostName: currentUser.name || '',
      amaHostRole: currentUser.profession || currentUser.role || 'Industry Expert',
      amaStatus: 'UPCOMING',
      amaStartTime: ''
    });
    setShowModal('NONE');
  };

  // Reply / Comment Submit
  const handleReplySubmit = async (postId: string) => {
    const text = replyInput[postId];
    if (!text || !text.trim()) return;

    if (!isLoggedIn) {
      showToast('Please sign in to reply to community queries.');
      onOpenLoginModal?.();
      return;
    }

    try {
      const isAma = Boolean(isAmaAnswerInput[postId]);
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.trim(),
          isAmaAnswer: isAma
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');
      showToast(isAma ? 'Verified AMA Answer posted!' : 'Reply posted to thread!');
      setReplyInput(prev => ({ ...prev, [postId]: '' }));
      setActiveReplyBox(null);
      // reload window or refresh posts
      const postsRes = await fetch('/api/community/posts');
      const postsData = await postsRes.json();
      if (Array.isArray(postsData?.posts)) {
        // AppContext handles posts via state or event
      }
    } catch (err: any) {
      showToast(err.message || 'The reply was not saved.');
    }
  };

  // Create Community Proposal Submit
  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('Please sign in to propose a new community.');
      onOpenLoginModal?.();
      return;
    }
    if (!commForm.name.trim() || !commForm.description.trim()) {
      showToast('Please fill out the community name and description.');
      return;
    }
    setCommSubmitting(true);
    try {
      await createCommunityProposal({
        name: commForm.name.trim(),
        category: commForm.category,
        location: commForm.location.trim(),
        description: commForm.description.trim(),
        rules: commForm.rules.trim()
      });
      setShowModal('NONE');
      setCommForm({
        name: '',
        category: 'Micro-Market Hub',
        location: 'Kokapet Neopolis, Hyderabad',
        description: '',
        rules: '1. No spam. 2. Verify RERA numbers. 3. Civil discourse only.'
      });
      showToast('Community proposal submitted for Super Admin review!');
    } finally {
      setCommSubmitting(false);
    }
  };

  // Filter & Personalization Engine
  const parsedSearch = readCommunitySearch(questionQuery);
  const searchError = 'error' in parsedSearch ? parsedSearch.error : '';
  const searchTerm = 'error' in parsedSearch ? '' : parsedSearch.q;

  const userInterests = useMemo(() => {
    if (!currentUser) return [];
    if (Array.isArray((currentUser as any).interests)) return (currentUser as any).interests as string[];
    if (typeof (currentUser as any).interests === 'string') {
      try { return JSON.parse((currentUser as any).interests); } catch {}
    }
    return [];
  }, [currentUser]);

  const filteredPosts = useMemo(() => {
    return communityPosts.filter(p => {
      // Search filter
      if (searchError) return false;
      if (searchTerm) {
        const hay = `${p.title}\n${p.content}\n${p.topic}\n${p.authorName}`.toLowerCase();
        if (!hay.includes(searchTerm.toLowerCase())) return false;
      }

      // Community filter
      if (selectedCommunityId !== 'ALL' && p.communityId !== selectedCommunityId) return false;

      // Topic filter
      if (selectedTopic !== 'ALL' && p.topic !== selectedTopic) return false;

      // Feed Tabs Filtering
      if (feedTab === 'AMAS') {
        return p.postType === 'AMA';
      }
      if (feedTab === 'BOOKMARKS') {
        return bookmarkedPostIds.has(p.id) || Boolean(p.bookmarked);
      }
      if (feedTab === 'FOLLOWING') {
        const isDiscussionFollowed = savedEngagement(p).following;
        const isAuthorFollowed = p.authorId ? followedUserIds.has(p.authorId) : false;
        return isDiscussionFollowed || isAuthorFollowed;
      }
      if (feedTab === 'FOR_YOU') {
        if (userInterests.length === 0) return true; // fallback to all
        const matchesInterest = userInterests.some((interest: string) =>
          p.topic.toLowerCase().includes(interest.toLowerCase()) ||
          p.title.toLowerCase().includes(interest.toLowerCase())
        );
        const isAuthorFollowed = p.authorId ? followedUserIds.has(p.authorId) : false;
        return matchesInterest || isAuthorFollowed;
      }

      return true;
    });
  }, [communityPosts, selectedCommunityId, selectedTopic, feedTab, bookmarkedPostIds, followedUserIds, searchTerm, searchError, userInterests]);

  const netVotes = (post: CommunityPost) => {
    const row = savedEngagement(post);
    return row.agreeCount - row.disagreeCount;
  };

  const visiblePosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (sortMode === 'NEW') return String(b.createdAt).localeCompare(String(a.createdAt));
      if (sortMode === 'TOP') return netVotes(b) - netVotes(a) || String(b.createdAt).localeCompare(String(a.createdAt));
      return Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || netVotes(b) - netVotes(a) || String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [filteredPosts, sortMode, engagement]);

  // Suggested People to Follow (mocked or extracted from actual authors)
  const suggestedFollows = useMemo(() => {
    const list: Array<{ id: string; name: string; role: string; profession?: string; company?: string }> = [
      { id: 'usr_architect_sanjay', name: 'Ar. Sanjay Kolli', role: 'ARCHITECT', profession: 'Principal Architect', company: 'Kolli Design Studios' },
      { id: 'usr_rera_advocate', name: 'Adv. Ramesh Rao', role: 'LEGAL_ADVISOR', profession: 'RERA & High Court Advocate', company: 'Telangana RERA Counsel' },
      { id: 'usr_valuation_expert', name: 'Dr. Priya Varma', role: 'FINANCIAL_ANALYST', profession: 'Commercial ROI Analyst', company: 'Urban Yield Partners' },
      { id: 'usr_kokapet_specialist', name: 'Vikram Reddy', role: 'CHANNEL_PARTNER', profession: 'Neopolis High-Rise Consultant', company: 'Property Studio Verified' }
    ];
    return list;
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Community Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            COMMUNITY Q&A, PEER ADVICE & LIVE AMAS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Real Estate Intelligence & Peer Discussions
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Directly ask questions regarding Vaastu compliance, slab casting audits, water table levels, and RERA approvals. Upvote high-quality answers, participate in polls, and engage in live AMAs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              if (!isLoggedIn) {
                showToast('Please sign in to ask a question.');
                onOpenLoginModal?.();
              } else {
                setUnifiedTab('QUESTION');
                setShowModal('UNIFIED');
              }
            }}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-slate-950" />
            <span>+ Add Question</span>
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) {
                showToast('Please sign in to create a post.');
                onOpenLoginModal?.();
              } else {
                setUnifiedTab('POST');
                setShowModal('UNIFIED');
              }
            }}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>+ Create Post</span>
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) {
                showToast('Please sign in to propose a community.');
                onOpenLoginModal?.();
              } else {
                setShowModal('PROPOSE_COMMUNITY');
              }
            }}
            className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Propose Hub</span>
          </button>
        </div>
      </div>

      {/* Verified Live Community Hubs Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 font-display">
                Verified Live Community Hubs
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Super Admin Approved
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a community to filter discussions by micro-market corridor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCommunityId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedCommunityId === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Hubs ({communities.filter(c => c.status === 'APPROVED').length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.filter(c => c.status === 'APPROVED').map(comm => (
            <div
              key={comm.id}
              onClick={() => setSelectedCommunityId(selectedCommunityId === comm.id ? 'ALL' : comm.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedCommunityId === comm.id
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {comm.category}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{comm.memberCount} members</span>
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {comm.name}
                </h3>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {comm.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 mt-2">
                <span>{comm.location || 'Western Corridor'}</span>
                <span className="font-bold text-amber-700 hover:underline">
                  {selectedCommunityId === comm.id ? 'Active Filter ✓' : 'Filter Discussions →'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Feed + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Search, Tabs, and Posts Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real-time Search Box */}
          <form
            role="search"
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2"
            onSubmit={e => e.preventDefault()}
          >
            <div className="relative">
              <input
                id="community-question-search"
                value={questionQuery}
                maxLength={80}
                onChange={e => setQuestionQuery(e.target.value)}
                placeholder="Search questions, discussions, RERA insights..."
                className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
              {questionQuery && (
                <button
                  type="button"
                  onClick={() => setQuestionQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchError ? (
              <p role="alert" className="text-xs text-red-700 px-1">{searchError}</p>
            ) : null}
          </form>

          {/* Feed Tabs (Quora & Reddit Reference Image 5) */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: 'All Discussions', icon: Globe },
                { id: 'FOR_YOU', label: 'For You', icon: Sparkles },
                { id: 'AMAs', label: 'AMAs', icon: Radio },
                { id: 'FOLLOWING', label: 'Following', icon: UserCheck },
                { id: 'BOOKMARKS', label: 'Bookmarks', icon: Bookmark }
              ].map(tab => {
                const Icon = tab.icon;
                const active = feedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFeedTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown / Modes */}
            <div className="flex items-center gap-1 shrink-0 px-1">
              <button
                onClick={() => setSortMode('HOT')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  sortMode === 'HOT' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="Sort by Hot"
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
              </button>
              <button
                onClick={() => setSortMode('TOP')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  sortMode === 'TOP' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="Sort by Top Voted"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                onClick={() => setSortMode('NEW')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  sortMode === 'NEW' ? 'bg-blue-100 text-blue-900' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="Sort by Newest"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          </div>

          {/* Topics Carousel / Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {COMMUNITY_TOPIC_LIST.map(topic => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  selectedTopic === topic
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {visiblePosts.length > 0 ? (
              visiblePosts.map(post => {
                const row = savedEngagement(post);
                const score = row.agreeCount - row.disagreeCount;
                const isBookmarked = row.bookmarked;
                const isPoll = post.postType === 'POLL';
                const isAma = post.postType === 'AMA';
                const pollOpts = row.pollOptions || [];
                const userVotedId = row.userVotedOptionId;
                const totalPollVotes = pollOpts.reduce((sum: number, opt: any) => sum + Number(opt.votes || 0), 0);

                return (
                  <div
                    key={post.id}
                    id={`community-post-${post.id}`}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                  >
                    {/* AMA Header Banner (if post is AMA) */}
                    {isAma && (
                      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 px-6 py-3 flex items-center justify-between border-b border-amber-300">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 animate-pulse text-red-700" />
                          <span className="font-black text-xs uppercase tracking-wider font-display">
                            Ask Me Anything (AMA) Session
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            post.amaStatus === 'LIVE'
                              ? 'bg-red-600 text-white animate-pulse'
                              : (post.amaStatus === 'ENDED' || post.amaStatus === 'CONCLUDED')
                              ? 'bg-slate-800 text-white'
                              : 'bg-amber-950 text-amber-200'
                          }`}>
                            {post.amaStatus || 'LIVE'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-6 space-y-4">
                      {/* Meta Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {/* Author Avatar & Clickable Profile */}
                          <button
                            type="button"
                            onClick={() => handleOpenUserProfile(post.authorId)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                              {post.authorName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                                  {post.authorName}
                                </span>
                                {post.authorProfession && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                    {post.authorProfession}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <span>u/{post.authorRole.toLowerCase()}</span>
                                <span>·</span>
                                <span>{post.createdAt}</span>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Badges / Topic Tag */}
                        <div className="flex items-center gap-1.5">
                          {post.propertyName && (
                            <span className="text-amber-800 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {post.propertyName}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
                            r/{post.topic}
                          </span>
                        </div>
                      </div>

                      {/* Post Title & Content */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2 whitespace-pre-line">
                          {post.content}
                        </p>
                      </div>

                      {/* Interactive Poll Widget (Reddit Reference Image 3 & 4) */}
                      {isPoll && pollOpts.length > 0 && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <BarChart2 className="w-4 h-4 text-amber-600" /> Community Poll
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {totalPollVotes} votes total
                            </span>
                          </div>

                          <div className="space-y-2">
                            {pollOpts.map((opt: any) => {
                              const optVotes = Number(opt.votes || 0);
                              const pct = totalPollVotes > 0 ? Math.round((optVotes / totalPollVotes) * 100) : 0;
                              const isSelectedByMe = userVotedId === opt.id || selectedPollOption[post.id] === opt.id;

                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => {
                                    if (!userVotedId) {
                                      setSelectedPollOption(prev => ({ ...prev, [post.id]: opt.id }));
                                    }
                                  }}
                                  className={`relative overflow-hidden p-3 rounded-xl border transition-all cursor-pointer ${
                                    isSelectedByMe
                                      ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  {/* Percentage background bar */}
                                  {userVotedId && (
                                    <div
                                      className="absolute inset-y-0 left-0 bg-amber-200/50 transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  )}

                                  <div className="relative z-10 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isSelectedByMe ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300 bg-white'
                                      }`}>
                                        {isSelectedByMe && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                      <span className="font-semibold text-slate-800">{opt.text}</span>
                                    </div>
                                    {userVotedId && (
                                      <span className="font-mono font-bold text-slate-600 text-[11px]">
                                        {pct}% ({optVotes})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {!userVotedId && selectedPollOption[post.id] && (
                            <button
                              type="button"
                              disabled={pollVotingPostId === post.id}
                              onClick={() => handleVotePoll(post.id, selectedPollOption[post.id])}
                              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              {pollVotingPostId === post.id ? 'Recording Vote...' : 'Submit Vote'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Media Embed: Podcast Voice Note */}
                      {post.mediaType === 'PODCAST' && (
                        <div className="pt-2">
                          <AudioStoryPlayer
                            title={post.title}
                            narrator={post.authorName}
                            duration={post.duration || '3:12'}
                            audioUrl={post.mediaUrl}
                            transcript={post.content}
                            badge="Community Voice Note"
                            variant="compact"
                          />
                        </div>
                      )}

                      {/* Media Embed: 4K Drone Video */}
                      {post.mediaType === 'VIDEO' && post.mediaUrl && (
                        <div className="pt-2">
                          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-md">
                            <video
                              src={post.mediaUrl}
                              controls
                              playsInline
                              poster={post.thumbnailUrl}
                              className="w-full h-full object-cover"
                            >
                              Video playback not supported on your browser.
                            </video>
                          </div>
                        </div>
                      )}

                      {/* Photo Attachments */}
                      {post.attachments && post.attachments.filter(a => a.type === 'image').length > 0 && (
                        <div className="pt-2">
                          <div className="grid grid-cols-2 gap-3">
                            {post.attachments.filter(a => a.type === 'image').map((att, idx) => (
                              <div
                                key={idx}
                                className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute bottom-1.5 left-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded truncate">
                                  {att.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reddit & Quora Style Pill Action Bar (Reference Image 4) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Upvote / Downvote Pill: [ ↑ score ↓ ] */}
                          <div className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200/80 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleVote(post, 1)}
                              aria-pressed={row.userVote === 1}
                              aria-label="Upvote"
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                row.userVote === 1
                                  ? 'text-amber-600 bg-white shadow-xs'
                                  : 'text-slate-500 hover:text-amber-600'
                              }`}
                            >
                              <ArrowBigUp className="w-4 h-4 fill-current" />
                            </button>
                            <span className={`px-2 font-mono-numbers font-bold text-xs ${
                              row.userVote === 1 ? 'text-amber-600' : row.userVote === -1 ? 'text-blue-600' : 'text-slate-800'
                            }`}>
                              {score}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleVote(post, -1)}
                              aria-pressed={row.userVote === -1}
                              aria-label="Downvote"
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                row.userVote === -1
                                  ? 'text-blue-600 bg-white shadow-xs'
                                  : 'text-slate-500 hover:text-blue-600'
                              }`}
                            >
                              <ArrowBigDown className="w-4 h-4 fill-current" />
                            </button>
                          </div>

                          {/* Comments Pill: [ 💬 count ] */}
                          <button
                            type="button"
                            onClick={() => setActiveReplyBox(activeReplyBox === post.id ? null : post.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold border border-slate-200/80 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                            <span>{post.commentsCount || (post.replies ? post.replies.length : 0)}</span>
                          </button>

                          {/* Bookmark Pill: [ 🔖 Bookmark ] */}
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(post)}
                            aria-pressed={isBookmarked}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-600 text-amber-600' : 'text-slate-500'}`} />
                            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                          </button>

                          {/* Share Pill: [ ↗ Share ] */}
                          <button
                            type="button"
                            onClick={() => handleShare(post)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold border border-slate-200/80 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Share</span>
                          </button>

                          {/* Follow Discussion Pill */}
                          <button
                            type="button"
                            onClick={() => handleFollow(post)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border transition-colors cursor-pointer ${
                              row.following
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80'
                            }`}
                          >
                            <UserCheck className={`w-3.5 h-3.5 ${row.following ? 'text-blue-600' : 'text-slate-500'}`} />
                            <span>{row.following ? 'Following' : 'Follow'}</span>
                          </button>
                        </div>

                        {/* Report Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(post)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Report this post"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Threaded Nested Replies & Comments */}
                      {post.replies && post.replies.length > 0 && (
                        <div className="space-y-3 pt-3 border-l-2 border-slate-200 pl-4 mt-2">
                          {post.replies.map(reply => (
                            <div
                              key={reply.id}
                              className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                                reply.isAmaAnswer
                                  ? 'bg-amber-50/90 border-2 border-amber-400 shadow-xs'
                                  : reply.isVerifiedBuilderReply
                                  ? 'bg-blue-50/80 border border-blue-200'
                                  : 'bg-slate-50 border border-slate-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{reply.authorName}</span>
                                  {reply.authorProfession && (
                                    <span className="text-slate-500">{reply.authorProfession}</span>
                                  )}
                                  {reply.isAmaAnswer && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400">
                                      <Star className="w-3 h-3 fill-amber-700 text-amber-700" />
                                      Verified Host Answer
                                    </span>
                                  )}
                                  {reply.isVerifiedBuilderReply && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-200 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 className="w-3 h-3 text-blue-700" /> Verified PMO Voice
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">{reply.createdAt}</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Reply Input Box */}
                      {activeReplyBox === post.id && (
                        <div className="pt-2 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={
                                isLoggedIn
                                  ? isAma
                                    ? 'Ask the host a question or provide an answer...'
                                    : 'Write a thoughtful answer or comment...'
                                  : 'Login to reply to this thread...'
                              }
                              value={replyInput[post.id] || ''}
                              onChange={e => setReplyInput({ ...replyInput, [post.id]: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleReplySubmit(post.id);
                              }}
                              className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                            />
                            <button
                              onClick={() => handleReplySubmit(post.id)}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-amber-400" />
                              <span>Reply</span>
                            </button>
                          </div>

                          {/* Host answer check if this user is host or elevated */}
                          {isAma && (
                            <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={Boolean(isAmaAnswerInput[post.id])}
                                onChange={e => setIsAmaAnswerInput(prev => ({ ...prev, [post.id]: e.target.checked }))}
                                className="rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span className="font-semibold text-amber-900">Mark as Verified Host Answer</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : searchTerm || searchError ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-900 font-display">No questions match this search</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchError || `No questions match “${searchTerm}”.`}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {feedTab === 'BOOKMARKS' ? 'No Saved Bookmarks Yet' : feedTab === 'FOLLOWING' ? 'No Followed Discussions Yet' : 'No Community Discussions Posted Yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {feedTab === 'BOOKMARKS'
                      ? 'Save interesting questions and insights using the bookmark pill on any card.'
                      : feedTab === 'FOLLOWING'
                      ? 'Follow discussions or members to receive real-time notifications on updates.'
                      : 'Be the first to ask about construction milestones, structural title clearances, or micro-market rate audits.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUnifiedTab('QUESTION');
                    setShowModal('UNIFIED');
                  }}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>Start First Discussion</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (1 Col): Quora Recommended Topics, Who to Follow & AMA Schedule */}
        <div className="space-y-6">
          {/* Recommended Topics for You (Quora Reference Image 1 & 5) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Recommended Topics</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">For You</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                'Kokapet & Neopolis',
                'Legal & RERA',
                'Rental Yield & ROI',
                'High-Rise Living',
                'Luxury Villas',
                'Architecture & Vaastu',
                'Interior Design',
                'Price Trends'
              ].map(topic => (
                <button
                  key={topic}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setFeedTab('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedTopic === topic
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Who to Follow (Reddit & Quora Reference) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Who to Follow</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Experts</span>
            </div>

            <div className="space-y-3">
              {suggestedFollows.map(person => {
                const isFollowing = followedUserIds.has(person.id);
                return (
                  <div key={person.id} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenUserProfile(person.id)}
                      className="flex items-center gap-2 text-left cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {person.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="block text-xs font-bold text-slate-900 truncate group-hover:text-amber-800">
                          {person.name}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate">
                          {person.profession || person.role}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleFollowUser(person.id, person.name)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        isFollowing
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming & Live AMAs Widget */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-5 border border-amber-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5 font-display">
                <Radio className="w-4 h-4 text-red-600 animate-pulse" />
                <span>Live AMAs & Sessions</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-white rounded-2xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-600 uppercase font-mono">● Live Now</span>
                  <span className="text-[10px] text-slate-400 font-mono">Kokapet Hub</span>
                </div>
                <h4 className="font-bold text-slate-900 leading-snug">
                  High-Rise Concrete Integrity & RERA Delivery Audits
                </h4>
                <p className="text-[11px] text-slate-600">
                  Host: Ar. Sanjay Kolli (Principal Architect)
                </p>
                <button
                  type="button"
                  onClick={() => setFeedTab('AMAS')}
                  className="pt-1 text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Join AMA Discussion <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Community Guidelines */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2 text-xs text-slate-600">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Community Guidelines
            </h4>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-500">
              <li>Be respectful and constructive.</li>
              <li>Quote official RERA numbers for project claims.</li>
              <li>No unverified broker solicitations or spam.</li>
              <li>Super Admins review flagged reports continuously.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* UNIFIED MODAL: QUORA ADD QUESTION & REDDIT/QUORA CREATE POST (Reference Images 1, 2, 3) */}
      {showModal === 'UNIFIED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-4 bg-slate-50">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setUnifiedTab('QUESTION')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    unifiedTab === 'QUESTION'
                      ? 'border-amber-500 text-slate-900 font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Add Question</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnifiedTab('POST')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    unifiedTab === 'POST'
                      ? 'border-amber-500 text-slate-900 font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-amber-600" />
                  <span>Create Post</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowModal('NONE')}
                className="p-1 text-slate-400 hover:text-slate-700 pb-3"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB 1: QUORA STYLE ADD QUESTION */}
            {unifiedTab === 'QUESTION' ? (
              <form onSubmit={handleQuestionSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Writing Tips Banner (Quora Reference Image 1) */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 space-y-1">
                  <h4 className="font-bold text-xs flex items-center gap-1.5 text-blue-950">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Tips on getting good answers:
                  </h4>
                  <ul className="text-[11px] list-disc list-inside space-y-0.5 text-blue-800">
                    <li>Keep your question short and to the point.</li>
                    <li>Check for grammar and spelling before posting.</li>
                    <li>Start your inquiry with &quot;What&quot;, &quot;How&quot;, &quot;Why&quot;, etc.</li>
                  </ul>
                </div>

                {/* Author row with visibility selector */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900">{currentUser.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={questionForm.visibility}
                      onChange={e => setQuestionForm({ ...questionForm, visibility: e.target.value as any })}
                      className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="PUBLIC">🌐 Public</option>
                      <option value="COMMUNITY">👥 Community Members</option>
                    </select>

                    <select
                      value={questionForm.topic}
                      onChange={e => setQuestionForm({ ...questionForm, topic: e.target.value })}
                      className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      {COMMUNITY_TOPIC_LIST.filter(t => t !== 'ALL').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Question Title Input */}
                <div>
                  <textarea
                    rows={3}
                    required
                    value={questionForm.title}
                    onChange={e => handleQuestionTitleChange(e.target.value)}
                    placeholder='Start your question with "What", "How", "Why", etc.'
                    className="w-full text-sm font-semibold p-3.5 border-b-2 border-slate-200 focus:border-amber-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Live Duplicate Question Check Warning (Quora Reference) */}
                {duplicateWarning && duplicateWarning.matches.length > 0 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Similar questions already exist on Property Studio:</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-amber-900">
                      {duplicateWarning.matches.map(m => (
                        <li key={m.id} className="flex items-center justify-between">
                          <span className="truncate pr-2 font-medium">• {m.title}</span>
                          <span className="font-mono text-[10px] text-amber-700 shrink-0">{m.upvotes} votes</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-amber-800 pt-0.5">
                      Review existing answers above before posting to prevent duplicate threads.
                    </p>
                  </div>
                )}

                {/* Optional Context Details */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Provide optional background context or specifics
                  </label>
                  <textarea
                    rows={2}
                    value={questionForm.context}
                    onChange={e => setQuestionForm({ ...questionForm, context: e.target.value })}
                    placeholder="Include relevant details (e.g., project name, floor level, specific RERA clause)..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal('NONE')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Add Question
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: REDDIT & QUORA STYLE CREATE POST (Reference Images 2 & 3) */
              <form onSubmit={handlePostSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Author row with credential pill and visibility */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{currentUser.name}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {currentUser.profession || 'Verified Member'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={postForm.visibility}
                      onChange={e => setPostForm({ ...postForm, visibility: e.target.value as any })}
                      className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="PUBLIC">🌐 Everyone</option>
                      <option value="COMMUNITY">👥 Community</option>
                    </select>

                    <select
                      value={postForm.topic}
                      onChange={e => setPostForm({ ...postForm, topic: e.target.value })}
                      className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      {COMMUNITY_TOPIC_LIST.filter(t => t !== 'ALL').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub-tabs: Text, Images & Video, Link, Poll, AMA (Reddit Reference Image 3) */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
                  {[
                    { id: 'TEXT', label: 'Text', icon: List },
                    { id: 'MEDIA', label: 'Images & Video', icon: ImageIcon },
                    { id: 'LINK', label: 'Link', icon: Link2 },
                    { id: 'POLL', label: 'Poll', icon: BarChart2 },
                    { id: 'AMA', label: 'AMA Session', icon: Radio }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const active = postSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPostSubTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          active ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Title with Character Counter (0/300) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Title *</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {postForm.title.length}/300
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={postForm.title}
                    onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Title your post or inquiry..."
                    className="w-full text-sm font-semibold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Sub-Tab 1: TEXT with Rich Text Toolbar */}
                {postSubTab === 'TEXT' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                      <button type="button" className="p-1.5 rounded hover:bg-white text-slate-700 font-bold" title="Bold">B</button>
                      <button type="button" className="p-1.5 rounded hover:bg-white text-slate-700 italic" title="Italic">I</button>
                      <button type="button" className="p-1.5 rounded hover:bg-white text-slate-700 line-through" title="Strikethrough">S</button>
                      <button type="button" className="p-1.5 rounded hover:bg-white text-slate-700 font-mono" title="Code">&lt;/&gt;</button>
                      <button type="button" className="p-1.5 rounded hover:bg-white text-slate-700" title="Quote">&ldquo;</button>
                      <button type="button" className="p-1.5 rounded hover:bg-white text-slate-700" title="Bulleted List">• List</button>
                    </div>

                    <textarea
                      rows={5}
                      required
                      value={postForm.content}
                      onChange={e => setPostForm({ ...postForm, content: e.target.value })}
                      placeholder="Share your analysis, findings, or questions with the community..."
                      className="w-full text-xs p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Sub-Tab 2: MEDIA (Images & 4K Video) */}
                {postSubTab === 'MEDIA' && (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Photo Attachment URL</label>
                      <input
                        type="url"
                        value={postForm.photoUrl}
                        onChange={e => setPostForm({ ...postForm, photoUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">4K Video or Podcast MP3 URL</label>
                      <input
                        type="url"
                        value={postForm.mediaUrl}
                        onChange={e => {
                          const url = e.target.value;
                          setPostForm({
                            ...postForm,
                            mediaUrl: url,
                            mediaType: url.includes('.mp3') ? 'PODCAST' : url.includes('.mp4') ? 'VIDEO' : 'POST'
                          });
                        }}
                        placeholder="https://assets.mixkit.co/...mp4 or audio.mp3"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: LINK */}
                {postSubTab === 'LINK' && (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Link URL *</label>
                      <input
                        type="url"
                        required
                        value={postForm.linkUrl}
                        onChange={e => setPostForm({ ...postForm, linkUrl: e.target.value })}
                        placeholder="https://rera.telangana.gov.in/..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Tab 4: POLL BUILDER (Reddit Reference Image 3) */}
                {postSubTab === 'POLL' && (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <label className="block font-bold text-slate-700">Poll Options</label>
                    <div className="space-y-2">
                      {postForm.pollOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...postForm.pollOptions];
                              newOpts[i] = e.target.value;
                              setPostForm({ ...postForm, pollOptions: newOpts });
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          />
                          {postForm.pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPostForm({
                                  ...postForm,
                                  pollOptions: postForm.pollOptions.filter((_, idx) => idx !== i)
                                });
                              }}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {postForm.pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPostForm({
                            ...postForm,
                            pollOptions: [...postForm.pollOptions, '']
                          });
                        }}
                        className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                )}

                {/* Sub-Tab 5: AMA SESSION BUILDER */}
                {postSubTab === 'AMA' && (
                  <div className="space-y-3 p-4 bg-amber-50/60 border border-amber-300 rounded-2xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Host Full Name</label>
                        <input
                          type="text"
                          value={postForm.amaHostName}
                          onChange={e => setPostForm({ ...postForm, amaHostName: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Host Professional Role</label>
                        <input
                          type="text"
                          value={postForm.amaHostRole}
                          onChange={e => setPostForm({ ...postForm, amaHostRole: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">AMA Live Status</label>
                      <select
                        value={postForm.amaStatus}
                        onChange={e => setPostForm({ ...postForm, amaStatus: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      >
                        <option value="LIVE">🔴 Live Right Now</option>
                        <option value="UPCOMING">🟡 Scheduled Upcoming</option>
                        <option value="ENDED">⚪ Concluded AMA</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Associated Project Select */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Associated Property / Project (Optional)</label>
                  <select
                    value={postForm.propertyId}
                    onChange={e => setPostForm({ ...postForm, propertyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">General Hyderabad Corridor</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal('NONE')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Post Discussion
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* USER PUBLIC PROFILE MODAL */}
      {showModal === 'USER_PROFILE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm font-display">User Profile & Activity</h3>
              </div>
              <button
                onClick={() => setShowModal('NONE')}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileLoading || !profileData ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Loading member profile...
              </div>
            ) : (
              <div className="p-6 space-y-5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {profileData.avatar ? (
                      <img
                        src={getSafeAvatar(profileData.avatar)}
                        alt={profileData.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-900 text-amber-400 font-bold text-lg flex items-center justify-center border-2 border-amber-400 shadow-md">
                        {profileData.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-bold text-slate-900">{profileData.name}</h4>
                        {profileData.isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                        )}
                      </div>
                      <p className="text-slate-600 font-semibold">{profileData.profession || profileData.role}</p>
                      {profileData.company && (
                        <p className="text-slate-400 text-[11px]">{profileData.company}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFollowUser(profileData.id, profileData.name)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      profileData.isFollowing
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {profileData.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>

                {/* Follower / Following Stats */}
                <div className="grid grid-cols-2 gap-3 text-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-base font-black text-slate-900 font-mono-numbers">
                      {profileData.followerCount || 0}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Followers</span>
                  </div>
                  <div>
                    <span className="text-base font-black text-slate-900 font-mono-numbers">
                      {profileData.followingCount || 0}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Following</span>
                  </div>
                </div>

                {/* User Interests Topic Chips */}
                {profileData.interests && profileData.interests.length > 0 && (
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Topics of Interest</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profileData.interests.map((topic: string) => (
                        <span key={topic} className="px-2.5 py-1 rounded-lg text-[11px] bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Recent Contributions</span>
                  {profileData.recentPosts && profileData.recentPosts.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {profileData.recentPosts.map((rp: any) => (
                        <div key={rp.id} className="p-2.5 bg-white border border-slate-200 rounded-xl">
                          <span className="block font-bold text-slate-900 truncate">{rp.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{rp.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No public questions posted yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODERATION REPORT MODAL */}
      {showModal === 'REPORT' && reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-red-600" />
                Report Content
              </h3>
              <button onClick={() => setShowModal('NONE')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-xs">
              Reporting: <strong className="text-slate-900 font-bold">&quot;{reportTarget.title}&quot;</strong>
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for report</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                >
                  <option value="Spam or commercial self-promotion">Spam or commercial self-promotion</option>
                  <option value="Misleading RERA or legal claims">Misleading RERA or legal claims</option>
                  <option value="Harassment or uncivil language">Harassment or uncivil language</option>
                  <option value="Duplicate question">Duplicate question</option>
                  <option value="Other violation of guidelines">Other violation of guidelines</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal('NONE')}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROPOSE COMMUNITY MODAL */}
      {showModal === 'PROPOSE_COMMUNITY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Propose a Micro-Market Community
                </h3>
                <p className="text-xs text-slate-500">
                  New communities are reviewed and approved by Super Admin before going live.
                </p>
              </div>
              <button
                onClick={() => setShowModal('NONE')}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunitySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Community Name *</label>
                <input
                  type="text"
                  required
                  value={commForm.name}
                  onChange={e => setCommForm({ ...commForm, name: e.target.value })}
                  placeholder="e.g. Kokapet Neopolis High-Rise Owners"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={commForm.category}
                    onChange={e => setCommForm({ ...commForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="Micro-Market Hub">Micro-Market Hub</option>
                    <option value="Legal & RERA">Legal & RERA</option>
                    <option value="Architecture & Vaastu">Architecture & Vaastu</option>
                    <option value="Investor Syndicate">Investor Syndicate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Corridor Location</label>
                  <input
                    type="text"
                    value={commForm.location}
                    onChange={e => setCommForm({ ...commForm, location: e.target.value })}
                    placeholder="e.g. Kokapet Neopolis, Hyderabad"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Purpose *</label>
                <textarea
                  rows={3}
                  required
                  value={commForm.description}
                  onChange={e => setCommForm({ ...commForm, description: e.target.value })}
                  placeholder="Describe what members will discuss in this community..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal('NONE')}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {commSubmitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

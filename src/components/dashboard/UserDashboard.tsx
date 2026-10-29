import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Property } from '../../types';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { PropertyDetailModal } from '../properties/PropertyDetailModal';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  PROPERTY_CATEGORY_GROUPS,
  ALL_PROPERTY_TYPES,
  matchesPropertyTypeFilter,
  displayPropertyType
} from '../../shared/propertyCategories';
import {
  LayoutDashboard,
  FileText,
  Star,
  Bell,
  Settings,
  Plus,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  MessageSquare,
  KeyRound,
  RefreshCw,
  ArrowUpRight,
  Check,
  Building,
  UserCheck,
  Search,
  RotateCcw,
  Video,
  Play,
  Repeat,
  Users
} from 'lucide-react';

type TabType = 'OVERVIEW' | 'REQUIREMENTS' | 'REVIEWS' | 'NOTIFICATIONS' | 'COMMUNITY' | 'SETTINGS';

interface RepostRecord {
  repostId: string;
  mediaId: string;
  repostedAt: string;
  note?: string;
  title: string;
  summary: string;
  videoUrl: string;
  thumbnail: string;
  type: string;
  duration: string;
  views: number;
  originalCreator: string;
}

interface RequirementRecord {
  id: string;
  seekerId: string;
  propertyType: string;
  location: string;
  budget: string;
  details: string;
  createdAt: string;
  updatedAt: string;
}

interface OwnReview {
  id: string;
  entityId: string;
  rating: number;
  body: string;
  authorName: string;
  status: string;
  rejectionReason: string;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string;
  actor_name?: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: number;
  created_at: string;
}

interface CommunitySummaryPost {
  id: string;
  title: string;
  body?: string;
  topic?: string;
  communityName?: string;
  upvotes?: number;
  created_at?: string;
}

interface JoinedCommunityRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  location?: string;
  member_count?: number;
  memberCount?: number;
  banner_image?: string;
  bannerImage?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  membership_role?: string;
  membership_status?: string;
}

interface DiscussionRepostRecord {
  repostId: string;
  postId: string;
  repostedAt: string;
  note?: string;
  title: string;
  content: string;
  topic: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  communityId?: string;
  communityName?: string;
  upvotes: number;
  commentsCount: number;
  shareUrl: string;
}

function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'Not configured';
  const clean = phone.trim();
  if (clean.length < 8) return clean;
  // Mask middle digits, e.g. +91 98490 ●●●●●
  return clean.slice(0, 5) + ' ●●●●● ' + clean.slice(-2);
}

export const UserDashboard: React.FC = () => {
  const { currentUser, setActiveView, walletBalance, showToast, refreshSession, properties, constructionLogs, setSelectedMedia, mediaItems } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');

  // Property search state
  const [dashboardProperties, setDashboardProperties] = useState<Property[]>(properties || []);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('ALL');
  const [searchType, setSearchType] = useState<string>(ALL_PROPERTY_TYPES);
  const [hasSearched, setHasSearched] = useState(false);
  const [activePropertyModal, setActivePropertyModal] = useState<Property | null>(null);

  // Sync / fetch properties
  useEffect(() => {
    if (properties && properties.length > 0) {
      setDashboardProperties(properties);
    } else {
      setLoadingProperties(true);
      fetch('/api/properties')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data?.properties)) {
            setDashboardProperties(data.properties);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProperties(false));
    }
  }, [properties]);

  const microMarkets = ['ALL', 'Neopolis', 'Kokapet', 'Financial District', 'Tellapur', 'Nanakramguda', 'Gachibowli'];

  const filteredProperties = dashboardProperties.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchDev = p.developerName?.toLowerCase().includes(q);
      const matchLoc = p.location?.toLowerCase().includes(q) || p.microMarket?.toLowerCase().includes(q);
      const matchHighlights = (p.highlights || []).some(h => h.toLowerCase().includes(q));
      if (!matchTitle && !matchDev && !matchLoc && !matchHighlights) return false;
    }
    if (searchLocation !== 'ALL') {
      const loc = searchLocation.toLowerCase();
      const matchLoc = p.location?.toLowerCase().includes(loc) || p.microMarket?.toLowerCase().includes(loc);
      if (!matchLoc) return false;
    }
    if (!matchesPropertyTypeFilter(p.propertyType, searchType)) {
      return false;
    }
    return true;
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    setSearchLocation('ALL');
    setSearchType(ALL_PROPERTY_TYPES);
    setHasSearched(false);
  };

  // Requirements state
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [submittingRequirement, setSubmittingRequirement] = useState(false);
  const [reqPropertyType, setReqPropertyType] = useState<string>(PROPERTY_CATEGORY_GROUPS[0].options[0]);
  const [reqLocation, setReqLocation] = useState('');
  const [reqBudget, setReqBudget] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [requirementFormError, setRequirementFormError] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<OwnReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editBody, setEditBody] = useState('');
  const [submittingReviewEdit, setSubmittingReviewEdit] = useState(false);
  const [reviewEditError, setReviewEditError] = useState<string | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Community discussions state
  const [communityPosts, setCommunityPosts] = useState<CommunitySummaryPost[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Settings state
  const [townCity, setTownCity] = useState(currentUser.townCity || '');
  const [profession, setProfession] = useState(currentUser.profession || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Fetch requirements
  const fetchRequirements = useCallback(async () => {
    setLoadingRequirements(true);
    setRequirementsError(null);
    try {
      const res = await fetch('/api/requirements');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch requirements');
      setRequirements(Array.isArray(data.requirements) ? data.requirements : []);
    } catch (err: any) {
      setRequirementsError(err.message || 'Could not load requirements');
    } finally {
      setLoadingRequirements(false);
    }
  }, []);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    setReviewsError(null);
    try {
      const res = await fetch('/api/me/reviews');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch reviews');
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (err: any) {
      setReviewsError(err.message || 'Could not load your reviews');
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch notifications');
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (err: any) {
      setNotificationsError(err.message || 'Could not load notifications');
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Fetch community posts preview
  const fetchCommunityPosts = useCallback(async () => {
    setLoadingCommunity(true);
    try {
      const res = await fetch('/api/community/posts?limit=5');
      const data = await res.json();
      if (res.ok && Array.isArray(data.posts)) {
        setCommunityPosts(data.posts);
      }
    } catch {
      // Community preview is non-blocking
    } finally {
      setLoadingCommunity(false);
    }
  }, []);

  // Reposted broadcasts state
  const [userReposts, setUserReposts] = useState<RepostRecord[]>([]);
  const [loadingReposts, setLoadingReposts] = useState(false);

  // Joined Communities & Discussion Reposts State
  const [joinedCommunities, setJoinedCommunities] = useState<JoinedCommunityRecord[]>([]);
  const [loadingJoinedCommunities, setLoadingJoinedCommunities] = useState(false);
  const [discussionReposts, setDiscussionReposts] = useState<DiscussionRepostRecord[]>([]);
  const [loadingDiscussionReposts, setLoadingDiscussionReposts] = useState(false);

  const fetchJoinedCommunities = useCallback(async () => {
    setLoadingJoinedCommunities(true);
    try {
      const res = await fetch('/api/me/communities');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.communities)) {
          setJoinedCommunities(data.communities);
        }
      }
    } catch {
    } finally {
      setLoadingJoinedCommunities(false);
    }
  }, []);

  const fetchDiscussionReposts = useCallback(async () => {
    setLoadingDiscussionReposts(true);
    try {
      const res = await fetch('/api/me/discussion-reposts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reposts)) {
          setDiscussionReposts(data.reposts);
        }
      }
    } catch {
    } finally {
      setLoadingDiscussionReposts(false);
    }
  }, []);

  const fetchUserReposts = useCallback(async () => {
    setLoadingReposts(true);
    try {
      const res = await fetch('/api/me/reposts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reposts)) {
          setUserReposts(data.reposts);
        }
      }
    } catch {
      // Reposts load is non-blocking
    } finally {
      setLoadingReposts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRequirements();
    fetchReviews();
    fetchNotifications();
    fetchCommunityPosts();
    fetchUserReposts();
    fetchJoinedCommunities();
    fetchDiscussionReposts();
  }, [fetchRequirements, fetchReviews, fetchNotifications, fetchCommunityPosts, fetchUserReposts, fetchJoinedCommunities, fetchDiscussionReposts]);

  // Sync profile fields if currentUser changes
  useEffect(() => {
    setTownCity(currentUser.townCity || '');
    setProfession(currentUser.profession || '');
  }, [currentUser.townCity, currentUser.profession]);

  // Handle requirement creation
  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequirementFormError(null);
    setSubmittingRequirement(true);

    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: reqPropertyType,
          location: reqLocation.trim(),
          budget: reqBudget.trim(),
          details: reqDetails.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit requirement');

      showToast('Property requirement posted successfully!');
      setReqLocation('');
      setReqBudget('');
      setReqDetails('');
      setShowRequirementForm(false);
      fetchRequirements();
    } catch (err: any) {
      setRequirementFormError(err.message || 'Failed to post requirement. Please check the inputs.');
    } finally {
      setSubmittingRequirement(false);
    }
  };

  // Handle review update
  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReviewId) return;
    setReviewEditError(null);
    setSubmittingReviewEdit(true);

    try {
      const res = await fetch(`/api/reviews/${editingReviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: editRating,
          body: editBody.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update review');

      showToast('Review updated and resubmitted for moderation.');
      setEditingReviewId(null);
      fetchReviews();
    } catch (err: any) {
      setReviewEditError(err.message || 'Could not update review.');
    } finally {
      setSubmittingReviewEdit(false);
    }
  };

  // Mark single notification as read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // Non-blocking
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
        showToast('All notifications marked as read.');
      }
    } catch {
      // Non-blocking
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Update profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    setSavingProfile(true);

    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          townCity: townCity.trim(),
          profession: profession.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileSuccessMsg('Profile details saved successfully.');
      showToast('Profile updated.');
      await refreshSession();
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.');
    } catch (err: any) {
      setPasswordErrorMsg(err.message || 'Failed to update password. Check your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Member Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <img
              src={getSafeAvatar(currentUser.avatar)}
              alt={currentUser.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/40 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display text-white">
                  {currentUser.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <UserCheck className="w-3 h-3" />
                  Verified Member
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span>{currentUser.email}</span>
                {currentUser.emailVerified && (
                  <span title="Email verified"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /></span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                <span>Phone: {maskPhoneNumber(currentUser.phone)}</span>
                {currentUser.townCity && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    {currentUser.townCity}
                  </span>
                )}
                {currentUser.profession && (
                  <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                    • {currentUser.profession}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats / Actions */}
          <div className="flex items-center gap-3 sm:gap-4 self-start md:self-center">
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl px-4 py-3 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                Wallet Credit
              </span>
              <span className="text-lg font-black text-amber-400 font-mono-numbers">
                ₹{walletBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className="p-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700 rounded-2xl transition-colors cursor-pointer"
              title="Account Settings"
              aria-label="Account Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-amber-600" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('REQUIREMENTS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'REQUIREMENTS'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>My Requirements</span>
          {requirements.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {requirements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('REVIEWS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'REVIEWS'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Star className="w-4 h-4 text-amber-600" />
          <span>My Reviews</span>
          {reviews.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {reviews.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'NOTIFICATIONS'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-600" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('COMMUNITY')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'COMMUNITY'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-600" />
          <span>Community Forum</span>
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'SETTINGS'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Settings className="w-4 h-4 text-amber-600" />
          <span>Settings & Security</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Requirements</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono-numbers">
                {loadingRequirements ? '…' : requirements.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Submitted property briefs</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Reviews</span>
                <Star className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono-numbers">
                {loadingReviews ? '…' : reviews.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {reviews.filter(r => r.status === 'APPROVED').length} approved & live
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Unread Alerts</span>
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono-numbers">
                {loadingNotifications ? '…' : unreadCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Platform notifications</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">Account</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-base font-black text-emerald-700 mt-1">
                Active & Protected
              </p>
              <p className="text-[11px] text-slate-500 mt-1">DPDP & RERA compliant</p>
            </div>
          </div>

          {/* Responsive Property Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5" data-testid="dashboard-search-container">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-600" />
                  <span>Search Verified Properties</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filter by location, property type, or keyword across Hyderabad
                </p>
              </div>
              {(hasSearched || searchQuery || searchLocation !== 'ALL' || searchType !== ALL_PROPERTY_TYPES) && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset filters
                </button>
              )}
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                {/* Keyword Search */}
                <div className="sm:col-span-2 lg:col-span-5">
                  <label htmlFor="dashboard-search-query" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Keyword or Project Name
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="dashboard-search-query"
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setHasSearched(true);
                      }}
                      placeholder="e.g. My Home, SAS Crown, Kokapet..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div className="sm:col-span-1 lg:col-span-3">
                  <label htmlFor="dashboard-search-location" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Location / Corridor
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="dashboard-search-location"
                      aria-label="Filter by Location"
                      value={searchLocation}
                      onChange={e => {
                        setSearchLocation(e.target.value);
                        setHasSearched(true);
                      }}
                      className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                    >
                      {microMarkets.map(loc => (
                        <option key={loc} value={loc}>
                          {loc === 'ALL' ? 'All Locations' : loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Property Type Filter */}
                <div className="sm:col-span-1 lg:col-span-4">
                  <label htmlFor="dashboard-search-type" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Property Type
                  </label>
                  <PropertyCategorySelect
                    id="dashboard-search-type"
                    ariaLabel="Filter by Property Type"
                    value={searchType}
                    onChange={val => {
                      setSearchType(val);
                      setHasSearched(true);
                    }}
                    includeAll={true}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-500 order-2 sm:order-1 text-center sm:text-left">
                  {hasSearched ? (
                    <span>
                      Found <strong className="text-slate-900 font-mono-numbers">{filteredProperties.length}</strong> matching{' '}
                      {filteredProperties.length === 1 ? 'property' : 'properties'}
                    </span>
                  ) : (
                    <span>{dashboardProperties.length} verified listings available in the registry</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Properties</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Results Display */}
            {hasSearched && (
              <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-150" data-testid="dashboard-search-results">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Search Results ({filteredProperties.length})
                  </h3>
                  <button
                    onClick={() => {
                      setActiveView('PROPERTIES');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    View in full catalog
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingProperties ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
                    <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
                    <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">No properties found</h4>
                      <p className="text-xs text-slate-500">
                        No verified listings match your criteria. Try adjusting your keyword, choosing &quot;All Locations&quot;, or selecting &quot;All property types&quot;.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetSearch}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProperties.slice(0, 9).map(property => (
                      <div
                        key={property.id}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                      >
                        <div className="relative h-40 bg-slate-100 overflow-hidden">
                          <img
                            src={property.heroImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold rounded-md">
                              {displayPropertyType(property.propertyType)}
                            </span>
                          </div>
                          {property.microMarket && (
                            <div className="absolute bottom-2.5 left-2.5">
                              <span className="px-2 py-0.5 bg-amber-500/90 backdrop-blur-xs text-slate-950 text-[10px] font-bold rounded-md flex items-center gap-1 shadow-xs">
                                <MapPin className="w-2.5 h-2.5" />
                                {property.microMarket}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                              {property.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {property.developerName}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 block uppercase">Price</span>
                              <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                                {property.priceRange || (property.pricePerSqft ? `₹${property.pricePerSqft.toLocaleString()}/sq.ft` : 'Price on request')}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActivePropertyModal(property)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Action Shortcuts */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">Quick Navigation</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  setActiveTab('REQUIREMENTS');
                  setShowRequirementForm(true);
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left transition-all hover:shadow-md cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Post Requirement</h3>
                <p className="text-[11px] text-slate-500">Submit your property needs to connect with verified listings.</p>
              </button>

              <button
                onClick={() => {
                  setActiveView('PROPERTIES');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left transition-all hover:shadow-md cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Explore Properties</h3>
                <p className="text-[11px] text-slate-500">Search verified RERA-approved residential and commercial projects.</p>
              </button>

              <button
                onClick={() => {
                  setActiveView('REVIEWS');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left transition-all hover:shadow-md cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Star className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Write a Review</h3>
                <p className="text-[11px] text-slate-500">Rate projects and share genuine buyer insights with the community.</p>
              </button>

              <button
                onClick={() => {
                  setActiveView('COMMUNITY');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left transition-all hover:shadow-md cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Community Q&A</h3>
                <p className="text-[11px] text-slate-500">Participate in verified discussions regarding water, traffic, and pricing.</p>
              </button>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Requirements Preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Recent Requirements</span>
                </h3>
                <button
                  onClick={() => setActiveTab('REQUIREMENTS')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  View All ({requirements.length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingRequirements ? (
                <div className="space-y-3 py-2">
                  <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              ) : requirements.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs text-slate-500">No requirements submitted yet.</p>
                  <button
                    onClick={() => {
                      setActiveTab('REQUIREMENTS');
                      setShowRequirementForm(true);
                    }}
                    className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    Submit a requirement now
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {requirements.slice(0, 3).map(req => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{req.propertyType}</span>
                          {req.location && (
                            <span className="text-slate-500 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {req.location}
                            </span>
                          )}
                        </div>
                        {req.budget && (
                          <p className="text-[11px] text-amber-800 font-medium mt-0.5">Budget: {req.budget}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reviews Preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-600" />
                  <span>Your Reviews</span>
                </h3>
                <button
                  onClick={() => setActiveTab('REVIEWS')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  View All ({reviews.length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingReviews ? (
                <div className="space-y-3 py-2">
                  <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs text-slate-500">You haven't written any project reviews yet.</p>
                  <button
                    onClick={() => {
                      setActiveView('REVIEWS');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    Browse projects to review
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviews.slice(0, 3).map(rev => (
                    <div
                      key={rev.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rev.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rev.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rev.status}
                        </span>
                      </div>
                      <p className="text-slate-700 line-clamp-1">{rev.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reposted Broadcasts Feed */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-amber-600" />
                  <span>My Reposted Broadcasts & Podcasts</span>
                  {userReposts.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      {userReposts.length}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Published broadcasts and structural audits you've reposted to your account feed with attribution to original hosts.
                </p>
              </div>
              <button
                onClick={() => setActiveView('MEDIA')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Browse All Broadcasts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingReposts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ) : userReposts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Video className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">No reposted broadcasts yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Browse expert masterclasses and builder podcasts hosted by Swamy Reddy Javidi, and click Repost to share insights on your feed.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('MEDIA')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>Explore Masterclasses</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userReposts.map(rep => (
                  <div
                    key={rep.repostId}
                    className="group border border-slate-200 hover:border-amber-400 rounded-xl overflow-hidden bg-slate-50/50 hover:bg-white transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Repost Header Badge */}
                      <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Repeat className="w-3 h-3 text-amber-600" />
                          <span>Reposted by you</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rep.repostedAt ? new Date(rep.repostedAt).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>

                      {/* Video Thumbnail & Original Creator Attribution */}
                      <div className="p-4 space-y-3">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950">
                          <img
                            src={rep.thumbnail}
                            alt={rep.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-slate-900/90 px-2 py-0.5 rounded font-mono">
                            {rep.type} • {rep.duration}
                          </span>
                        </div>

                        {/* Attribution Note */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-[11px] text-slate-600">Original broadcast by</span>
                          <span className="text-[11px] font-bold text-slate-900">{rep.originalCreator}</span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2">
                            {rep.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {rep.summary}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action: Link to original video without media duplication */}
                    <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        {rep.views.toLocaleString()} views
                      </span>
                      <button
                        onClick={() => {
                          const target = (mediaItems && mediaItems.find(m => m.id === rep.mediaId)) || {
                            id: rep.mediaId,
                            title: rep.title,
                            summary: rep.summary,
                            videoUrl: rep.videoUrl,
                            thumbnail: rep.thumbnail,
                            type: rep.type as any,
                            duration: rep.duration,
                            host: rep.originalCreator,
                            keyTakeaways: [],
                            timestamps: [],
                            views: rep.views,
                            publishedDate: 'Original Broadcast'
                          };
                          setSelectedMedia(target);
                          setActiveView('MEDIA');
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Watch Original Broadcast</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY REQUIREMENTS */}
      {activeTab === 'REQUIREMENTS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Property Requirements</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Track your submitted property briefs. Only verified developers and RERA agents can view non-confidential briefs.
              </p>
            </div>
            <button
              onClick={() => setShowRequirementForm(!showRequirementForm)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start cursor-pointer shadow-sm transition-all active:scale-95"
            >
              {showRequirementForm ? (
                <>
                  <X className="w-4 h-4 text-amber-400" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Post New Requirement</span>
                </>
              )}
            </button>
          </div>

          {/* New Requirement Form */}
          {showRequirementForm && (
            <div className="bg-white border-2 border-amber-500/30 rounded-2xl p-6 shadow-md animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center gap-2 mb-4 text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold">Submit a New Property Requirement</h3>
              </div>

              {requirementFormError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{requirementFormError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRequirement} className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Property Type from Catalog */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Property Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reqPropertyType}
                      onChange={e => setReqPropertyType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    >
                      {PROPERTY_CATEGORY_GROUPS.map(group => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Location / Micro-market <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={reqLocation}
                      onChange={e => setReqLocation(e.target.value)}
                      placeholder="e.g. Kokapet, Financial District, Neopolis"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Budget Range <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={reqBudget}
                      onChange={e => setReqBudget(e.target.value)}
                      placeholder="e.g. ₹1.5 Cr – ₹2.5 Cr"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specific Requirements & Preferences <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reqDetails}
                    onChange={e => setReqDetails(e.target.value)}
                    rows={3}
                    placeholder="Specify configurations (e.g. 3 BHK, 2400 sq.ft., East-facing, possession within 12 months, high floor preferred)..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-slate-500">
                    Your direct contact details are never exposed publicly.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingRequirement}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submittingRequirement ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Post Requirement</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Requirements List */}
          {requirementsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
              <span>{requirementsError}</span>
              <button
                onClick={fetchRequirements}
                className="underline font-bold hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loadingRequirements ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : requirements.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Requirements Submitted</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Post your target configuration, preferred micro-market, and budget to connect with verified RERA-approved properties.
              </p>
              <button
                onClick={() => setShowRequirementForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Post Your First Requirement</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requirements.map(req => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold">
                        {req.propertyType}
                      </span>
                      {req.location && (
                        <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          {req.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono-numbers font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {req.budget}
                      </span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{req.details}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Reference ID: {req.id}</span>
                    <span className="text-emerald-700 font-medium">Status: Active in Matchmaker</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY REVIEWS */}
      {activeTab === 'REVIEWS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Project Reviews & Ratings</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Reviews submitted on Property Studio undergo moderation to maintain integrity and prevent fraudulent claims.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveView('REVIEWS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start cursor-pointer shadow-sm transition-all"
            >
              <Star className="w-4 h-4 text-amber-400" />
              <span>Browse Projects to Review</span>
            </button>
          </div>

          {/* Edit Review Modal / Form */}
          {editingReviewId && (
            <div className="bg-white border-2 border-amber-500/40 rounded-2xl p-6 shadow-md animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-600" />
                  <span>Edit Review</span>
                </h3>
                <button
                  onClick={() => setEditingReviewId(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reviewEditError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {reviewEditError}
                </div>
              )}

              <form onSubmit={handleUpdateReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= editRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">{editRating} / 5 Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Review Content</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Provide detailed, objective feedback about the project..."
                    required
                  />
                  <p className="text-[11px] text-amber-800 mt-1">
                    Note: Editing will return this review to PENDING status for moderation.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingReviewId(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReviewEdit}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReviewEdit ? 'Updating...' : 'Save & Submit'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {reviewsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
              <span>{reviewsError}</span>
              <button
                onClick={fetchReviews}
                className="underline font-bold hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loadingReviews ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Reviews Submitted</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Share your verified experiences on project build quality, handover timelines, and amenities to help fellow homebuyers.
              </p>
              <button
                onClick={() => {
                  setActiveView('REVIEWS');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span>Explore Approved Projects to Review</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(rev => (
                <div
                  key={rev.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                        {rev.rating}.0 / 5.0
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rev.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rev.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rev.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {rev.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {rev.status === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
                        <span>
                          {rev.status === 'APPROVED'
                            ? 'Approved & Live'
                            : rev.status === 'PENDING'
                            ? 'Under Moderation'
                            : 'Needs Revision'}
                        </span>
                      </span>

                      <button
                        onClick={() => {
                          setEditingReviewId(rev.id);
                          setEditRating(rev.rating);
                          setEditBody(rev.body);
                          setReviewEditError(null);
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{rev.body}</p>

                  {rev.rejectionReason && rev.status === 'REJECTED' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                      <span className="font-bold">Moderator Feedback: </span>
                      {rev.rejectionReason}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Project: {rev.entityId || 'Catalog Project'}</span>
                    <span>Submitted: {new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">In-App Notifications</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Real-time updates regarding your requirements, community responses, and reviews.
              </p>
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{markingAllRead ? 'Marking...' : 'Mark All as Read'}</span>
              </button>
            )}
          </div>

          {notificationsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
              <span>{notificationsError}</span>
              <button
                onClick={fetchNotifications}
                className="underline font-bold hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loadingNotifications ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Notifications</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You're all caught up! New alerts regarding your listings, enquiries, and community discussions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map(item => {
                const isRead = Boolean(item.is_read);
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                      isRead
                        ? 'bg-white border-slate-200'
                        : 'bg-amber-50/40 border-amber-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isRead ? 'bg-slate-100 text-slate-600' : 'bg-amber-500 text-slate-950 font-bold'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title="Unread" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!isRead && (
                      <button
                        onClick={() => handleMarkNotificationRead(item.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100/60 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COMMUNITY FORUM */}
      {activeTab === 'COMMUNITY' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Community Hubs & Discussions</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Discover corridor hubs, engage with fellow buyers, and manage your community memberships.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveView('COMMUNITY');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start cursor-pointer shadow-sm transition-all"
            >
              <span>Explore All Communities</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* Section 1: My Joined Communities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>My Joined Communities ({joinedCommunities.length})</span>
              </h3>
            </div>

            {loadingJoinedCommunities ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : joinedCommunities.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs text-slate-600">
                  You haven't joined any communities yet. Join public micro-market hubs or request access to private investor circles.
                </p>
                <button
                  onClick={() => {
                    setActiveView('COMMUNITY');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <span>Discover Communities</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {joinedCommunities.map(comm => (
                  <div
                    key={comm.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {comm.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                          {comm.visibility === 'PRIVATE' ? 'Private Hub' : 'Public Hub'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{comm.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{comm.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-600" />
                        {comm.member_count || comm.memberCount || 1} members
                      </span>
                      <button
                        onClick={() => {
                          setActiveView('COMMUNITY');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Enter Hub</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Discussions from My Communities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Relevant Discussions & Questions</span>
            </h3>

            {loadingCommunity ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : communityPosts.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs text-slate-500">No recent discussions found. Start a topic in your corridor hub.</p>
                <button
                  onClick={() => {
                    setActiveView('COMMUNITY');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span>Browse Active Discussions</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {communityPosts.map(post => (
                  <div
                    key={post.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        {post.topic || 'General Discussion'}
                      </span>
                      {post.created_at && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{post.title}</h4>
                    {post.body && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{post.body}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>{post.communityName || 'Local Community'}</span>
                      <button
                        onClick={() => {
                          setActiveView('COMMUNITY');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Join Conversation
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: My Discussion Reposts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-amber-600" />
              <span>My Discussion Reposts ({discussionReposts.length})</span>
            </h3>

            {loadingDiscussionReposts ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : discussionReposts.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-1">
                <p className="text-xs text-slate-500">You haven't reposted any discussions yet.</p>
                <p className="text-[11px] text-slate-400">When you repost discussions with attribution, they will appear here on your feed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {discussionReposts.map(repost => (
                  <div
                    key={repost.repostId}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 flex items-center gap-1">
                          <Repeat className="w-3 h-3 text-amber-600" />
                          <span>Reposted Discussion</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Original by <strong className="text-slate-800">{repost.authorName}</strong> ({repost.authorRole})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(repost.repostedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {repost.note && (
                      <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                        "{repost.note}"
                      </p>
                    )}

                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-amber-800 font-bold">
                        {repost.topic}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{repost.title}</h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{repost.content}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">
                        {repost.upvotes} upvotes • {repost.commentsCount} comments
                      </span>
                      <button
                        onClick={() => {
                          setActiveView('COMMUNITY');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        View Original Discussion
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & SECURITY */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-600" />
                <span>Profile Information</span>
              </h3>

              {profileSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={currentUser.name}
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Managed via registration record</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Verified primary contact</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Town / City</label>
                  <input
                    type="text"
                    value={townCity}
                    onChange={e => setTownCity(e.target.value)}
                    placeholder="e.g. Hyderabad, Bengaluru, Mumbai"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profession</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={e => setProfession(e.target.value)}
                    placeholder="e.g. Software Architect, Financial Consultant, Doctor"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Profession helps tailor relevant investment opportunities.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Security & Password</span>
              </h3>

              {passwordSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

          {/* Privacy & Data Governance Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Data Protection & Seeker Privacy Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Property Studio enforces strict consent-first buyer privacy. Your contact telephone number is masked
              across public interfaces and is never traded or distributed to external marketing agencies.
              Enquiries are unlocked only after explicit user consent and wallet transactions by accredited professionals.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-amber-800 pt-1">
              <button
                onClick={() => {
                  setActiveView('PRIVACY');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  setActiveView('TERMS');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:underline cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Detail Modal */}
      {activePropertyModal && (
        <PropertyDetailModal
          property={activePropertyModal}
          constructionLogs={constructionLogs}
          onClose={() => setActivePropertyModal(null)}
        />
      )}
    </div>
  );
};

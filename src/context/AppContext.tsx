import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  UserRole,
  Property,
  ConstructionLog,
  Lead,
  LeadTier,
  MediaItem,
  CorporateConference,
  MicroMarketTrend,
  CommunityPost,
  CommunityHub,
  AgentApplication,
  DeveloperClaim,
  PropertyAdminAssignment,
  ChatMessage,
  ViewType,
  DeviceMode,
  NavItemKey,
  WorkspaceTabType
} from '../types';
import {
  MICRO_MARKET_TRENDS
} from '../data/mockData';
import { isPropertySeeker, postLoginDestination } from '../shared/policy';
import { matchRoute, urlForView } from '../router/routes';

interface AppContextType {
  currentUser: User;
  users: User[];
  switchUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  activeView: ViewType;
  setActiveView: (view: ViewType, customUrl?: string) => void;
  currentPath: string;
  routeParams: Record<string, string>;
  isNotFound: boolean;
  navigate: (to: string, options?: { replace?: boolean; skipScroll?: boolean }) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  activeNav: NavItemKey;
  setActiveNav: (key: NavItemKey) => void;
  activeWorkspaceTab: WorkspaceTabType;
  setActiveWorkspaceTab: (tab: WorkspaceTabType) => void;
  navigateToNav: (key: NavItemKey) => void;

  // Properties
  properties: Property[];
  selectedProperty: Property | null;
  setSelectedProperty: (prop: Property | null) => void;
  constructionLogs: ConstructionLog[];
  updatePropertyInventory: (propertyId: string, availableUnits: number, pricePerSqft: number) => void;
  addConstructionLog: (propertyId: string, log: Omit<ConstructionLog, 'id'>) => void;

  // Leads Marketplace
  leads: Lead[];
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  leadPrices: Record<LeadTier, number>;
  updateLeadPrice: (tier: LeadTier, price: number) => void;
  unlockLead: (leadId: string) => Promise<boolean>;

  // Wallet
  walletBalance: number;
  topUpWallet: (amount: number) => void;

  // Media
  mediaItems: MediaItem[];
  selectedMedia: MediaItem | null;
  setSelectedMedia: (item: MediaItem | null) => void;
  createMediaItem: (item: Omit<MediaItem, 'id' | 'views' | 'publishedDate'>) => void;
  deleteMediaItem: (id: string) => void;
  refreshMedia: () => Promise<void>;

  // Leads
  createBuyerLead: (lead: Omit<Lead, 'id' | 'isUnlocked' | 'createdAt'> & {
    consentGranted?: boolean;
    consentVersion?: string;
    consentPurpose?: string;
    propertyId?: string;
  }) => void;
  deleteBuyerLead: (id: string) => void;

  // Conference
  conference: CorporateConference;
  upvoteQuestion: (questionId: string) => void;
  submitQuestion: (text: string) => void;
  votePoll: (pollId: string, optionIndex: number) => void;
  changeSlide: (delta: number) => void;

  // Community
  communityPosts: CommunityPost[];
  refreshPosts: () => Promise<void>;
  upvoteCommunityPost: (postId: string) => void;
  addCommunityReply: (postId: string, content: string) => void;
  createCommunityPost: (post: Omit<CommunityPost, 'id' | 'createdAt' | 'upvotes' | 'replies'>) => Promise<{ success: boolean; post?: any; error?: string }>;

  // Community Hubs (Super Admin approval gated)
  communities: CommunityHub[];
  refreshCommunities: () => Promise<void>;
  createCommunityProposal: (community: {
    name: string;
    description: string;
    category: string;
    location?: string;
    coverImage?: string;
    bannerImage?: string;
    icon?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
    rules?: string;
  }) => Promise<{ success: boolean; message: string }>;
  updateCommunityDetails: (communityId: string, updates: Partial<CommunityHub>) => Promise<{ success: boolean; message?: string }>;
  joinCommunity: (communityId: string) => Promise<{ success: boolean; status?: string; message?: string }>;
  leaveCommunity: (communityId: string) => Promise<{ success: boolean; message?: string }>;
  repostDiscussion: (postId: string, note?: string) => Promise<{ success: boolean; reposted?: boolean; count?: number }>;
  approveCommunity: (id: string) => Promise<void>;
  rejectCommunity: (id: string, reason?: string) => Promise<void>;
  deleteCommunityHub: (id: string) => Promise<void>;

  // RBAC & Admin
  agentApplications: AgentApplication[];
  approveAgentApplication: (id: string) => void;
  rejectAgentApplication: (id: string) => void;
  developerClaims: DeveloperClaim[];
  approveDeveloperClaim: (id: string) => void;
  rejectDeveloperClaim: (id: string) => void;
  submitDeveloperClaim: (claim: Omit<DeveloperClaim, 'id' | 'status' | 'submittedAt'>) => void;
  submitAgentApplication: (app: Omit<AgentApplication, 'id' | 'status' | 'submittedAt'>) => void;
  assignments: PropertyAdminAssignment[];
  provisionPropertyAdmin: (name: string, email: string, phone: string, propertyId: string) => { success: boolean; message: string };

  // Trends
  marketTrends: MicroMarketTrend[];

  // Live Chat
  messages: ChatMessage[];
  sendMessage: (text: string, recipientId?: string, leadContextId?: string) => void;

  // Notification Toast
  toast: string | null;
  showToast: (msg: string) => void;

  // Authentication & Guest Mode
  isLoggedIn: boolean;
  login: (user?: User) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;

  // Scroll Progress for Hero Morph Animation
  scrollProgress: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GUEST_USER: User = {
  id: 'guest',
  name: 'Guest',
  email: '',
  phone: '',
  role: 'PROPERTY_SEEKER',
  avatar: '',
  walletBalance: 0
};

const DEFAULT_CONFERENCE: CorporateConference = {
  id: 'conf-neopolis-summit-2026',
  title: 'Neopolis High-Rise Engineering & RERA Compliance Summit',
  developerName: 'Property Studio Secretariat & Verified Developers',
  projectFocus: 'Kokapet & Neopolis Corridor Infrastructure Master Plan',
  date: 'Active Live Stream',
  time: '11:00 AM IST',
  status: 'LIVE',
  attendeesCount: 248,
  currentPresenter: 'Swamy Reddy Javidi',
  presenterRole: 'Founder & Real Estate Intelligence Lead',
  streamThumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  presentationSlideUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  currentSlideIndex: 3,
  totalSlides: 12,
  agenda: [
    '11:00 AM - Corridor Infrastructure Timeline & Metro Phase 2 Link (Swamy Reddy Javidi)',
    '11:30 AM - RERA Legal Due Diligence & Escrow Audits (Adv. RERA Counsel)',
    '12:00 PM - Live Attendee Q&A & Investor Voting (Secretariat Panel)'
  ],
  questions: [
    { id: 'q-1', authorName: 'Kishore Varma', authorRole: 'Attendee', question: 'What is the projected completion timeline for the Trumpet flyover at Neopolis Exit 1?', upvotes: 18, isAnswered: true, timestamp: '10m ago' },
    { id: 'q-2', authorName: 'Dr. Ramana Rao', authorRole: 'Investor', question: 'Are the escrow account audit reports publicly accessible for under-construction towers in Tellapur?', upvotes: 14, isAnswered: false, timestamp: '5m ago' },
    { id: 'q-3', authorName: 'Pooja Hegde', authorRole: 'Property Seeker', question: 'How does high-speed aluminum formwork impact long-term acoustic insulation between adjacent units?', upvotes: 9, isAnswered: false, timestamp: '2m ago' }
  ],
  polls: [
    {
      id: 'poll-1',
      question: 'Which factor is most critical in your Hyderabad high-rise purchasing decision?',
      options: [
        { label: 'RERA Clean Title & Escrow Audits (55%)', votes: 136 },
        { label: 'Approach Road Width & Corridor Infrastructure (30%)', votes: 74 },
        { label: 'Developer Track Record & Delivery Punctuality (15%)', votes: 38 }
      ],
      totalVotes: 248
    }
  ]
};

function mapLead(raw: any): Lead {
  return {
    id: raw.id,
    seekerName: raw.seekerName || 'Seeker',
    seekerPhone: raw.seekerPhone || '',
    seekerEmail: raw.seekerEmail || '',
    budget: raw.budget || '',
    budgetMinLakhs: Number(raw.budgetMinLakhs || 0),
    microMarket: raw.microMarket || '',
    propertyType: raw.propertyType || '',
    timeframe: raw.timeframe || 'Next 30-45 Days',
    requirements: raw.requirements || '',
    tier: raw.tier || 'STANDARD',
    priceCredits: Number(raw.priceCredits || 0),
    isUnlocked: Boolean(raw.isUnlocked || raw.revealed),
    createdAt: raw.createdAt || ''
  };
}

function mapApiUser(raw: any): User {
  return {
    id: raw.id,
    publicId: raw.public_id || raw.publicId,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || '',
    role: raw.role,
    avatar: raw.avatar || '',
    organization: raw.organization || '',
    townCity: raw.townCity || raw.town_city || '',
    profession: raw.profession || '',
    walletBalance: Number(raw.wallet_balance ?? raw.walletBalance ?? 0),
    isVerified: Boolean(raw.is_verified ?? raw.isVerified),
    emailVerified: Boolean(raw.email_verified ?? raw.emailVerified),
    phoneVerified: Boolean(raw.phone_verified ?? raw.phoneVerified),
    accountStatus: raw.account_status || raw.accountStatus,
    assignedPropertyIds: raw.assignedPropertyIds || []
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [sessionUser, setSessionUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ps_session_user') || localStorage.getItem('ps_auth_user');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });
  const currentUser = sessionUser ?? GUEST_USER;
  const isLoggedIn = Boolean(sessionUser);

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') return window.location.pathname || '/';
    return '/';
  });

  const [routeParams, setRouteParams] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const match = matchRoute(window.location.pathname || '/');
      return match.params;
    }
    return {};
  });

  const [isNotFound, setIsNotFound] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return matchRoute(window.location.pathname || '/').isNotFound || false;
    }
    return false;
  });

  const [activeView, setActiveViewState] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const match = matchRoute(window.location.pathname || '/');
      if (match.isNotFound) return 'NOT_FOUND';
      return match.view;
    }
    return 'HOME';
  });

  const [deviceMode, setDeviceMode] = useState<DeviceMode>('AUTO');

  const [activeNav, setActiveNav] = useState<NavItemKey>(() => {
    if (typeof window !== 'undefined') {
      const match = matchRoute(window.location.pathname || '/');
      return match.navKey || 'HOME';
    }
    return 'HOME';
  });

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTabType>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/saved') return 'SAVED';
      if (p === '/profile') return 'SETTINGS';
    }
    return 'OVERVIEW';
  });

  // Navigate helper pushing or replacing browser history
  const navigate = (to: string, options?: { replace?: boolean; skipScroll?: boolean }) => {
    if (typeof window === 'undefined') return;
    const targetUrl = new URL(to, window.location.origin);
    const targetPath = targetUrl.pathname;
    const fullTarget = targetPath + targetUrl.search + targetUrl.hash;

    const currentFull = window.location.pathname + window.location.search + window.location.hash;
    if (fullTarget !== currentFull) {
      if (options?.replace) {
        window.history.replaceState({ path: fullTarget }, '', fullTarget);
      } else {
        window.history.pushState({ path: fullTarget }, '', fullTarget);
      }
    }

    setCurrentPath(targetPath);
    const match = matchRoute(targetPath);
    setRouteParams(match.params);
    setIsNotFound(Boolean(match.isNotFound));

    if (match.isNotFound) {
      setActiveViewState('NOT_FOUND');
    } else {
      setActiveViewState(match.view);
      setActiveNav(match.navKey);
    }

    if (!options?.skipScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const setActiveView = (view: ViewType, customUrl?: string) => {
    setActiveViewState(view);
    setIsNotFound(view === 'NOT_FOUND');
    if (typeof window !== 'undefined') {
      const targetUrl = customUrl || urlForView(view);
      const currentFull = window.location.pathname + window.location.search + window.location.hash;
      if (window.location.pathname !== targetUrl && currentFull !== targetUrl) {
        window.history.pushState({ path: targetUrl }, '', targetUrl);
      }
      setCurrentPath(targetUrl);
      const match = matchRoute(targetUrl);
      setRouteParams(match.params);
    }
  };

  const navigateToNav = (key: NavItemKey) => {
    setActiveNav(key);
    switch (key) {
      case 'HOME':
        setActiveView('HOME', '/');
        break;
      case 'MEDIA':
      case 'REAL_ESTATE_MEDIA':
        setActiveView('MEDIA', '/media');
        break;
      case 'MARKET_INSIGHTS':
      case 'PROPERTY_INSIGHTS':
        setActiveView('MARKET_INSIGHTS', '/insights');
        break;
      case 'REVIEWS':
        setActiveView('REVIEWS', '/reviews');
        break;
      case 'COMMUNITY':
      case 'COMMUNITIES':
        setActiveView('COMMUNITY', '/communities');
        break;
      case 'CONFERENCE':
      case 'LIVE_SESSIONS':
        setActiveView('CONFERENCE', '/live');
        break;
      case 'REQUIREMENT':
        setActiveView('REQUIREMENT', '/requirements');
        break;
      case 'CONTACT':
        setActiveView('CONTACT', '/contact');
        break;
      case 'PROGRAMS':
        setActiveView('PROGRAMS', '/programs');
        break;
      case 'TESTIMONIALS':
        setActiveView('TESTIMONIALS', '/testimonials');
        break;
      case 'ABOUT':
        setActiveView('ABOUT', '/about');
        break;
      case 'LEADS_MARKET':
        setActiveView('LEADS_MARKET', '/leads');
        break;
      case 'DASHBOARD':
        setActiveView('DASHBOARD', '/dashboard');
        break;
      case 'PROFESSIONAL':
        setActiveView('PROFESSIONAL', '/network');
        break;
      case 'PROPERTY_ADMIN':
        setActiveView('PROPERTY_ADMIN', '/property-admin');
        break;
      case 'ADMIN':
      case 'SUPER_ADMIN_CONSOLE':
        setActiveView('ADMIN', '/admin');
        break;
      case 'DEVELOPER':
      case 'DEVELOPER_DASHBOARD':
        setActiveView('DEVELOPER', '/developer');
        break;
      case 'DISCUSSIONS':
        setActiveView('HOME', '/discussions');
        break;
      case 'DISCOVER':
        setActiveView('PROPERTIES', '/properties');
        break;
      case 'SAVED_ITEMS':
        setActiveView('DASHBOARD', '/saved');
        setActiveWorkspaceTab('SAVED');
        break;
      case 'MY_PROFILE':
        setActiveView('DASHBOARD', '/profile');
        setActiveWorkspaceTab('SETTINGS');
        break;
      case 'MY_POSTS':
      case 'MY_QUESTIONS':
      case 'MY_COMMUNITIES':
        setActiveView('DASHBOARD', '/dashboard');
        setActiveWorkspaceTab('COMMUNITY');
        break;
      case 'MY_ENQUIRIES':
        setActiveView('DASHBOARD', '/dashboard');
        setActiveWorkspaceTab('REQUIREMENTS');
        break;
      case 'FIND_PROFESSIONALS':
      case 'DEVELOPERS':
      case 'CHANNEL_PARTNERS':
      case 'RERA_PROFESSIONALS':
        setActiveView('PROFESSIONALS', '/network');
        break;
      default:
        setActiveView('HOME', '/');
        break;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Synchronize with browser Back and Forward history buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      const match = matchRoute(path);
      setRouteParams(match.params);
      setIsNotFound(Boolean(match.isNotFound));
      if (match.isNotFound) {
        setActiveViewState('NOT_FOUND');
      } else {
        setActiveViewState(match.view);
        setActiveNav(match.navKey);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const directMap: Record<string, NavItemKey> = {
      HOME: 'HOME',
      MEDIA: 'MEDIA',
      MARKET_INSIGHTS: 'MARKET_INSIGHTS',
      REVIEWS: 'REVIEWS',
      COMMUNITY: 'COMMUNITY',
      CONFERENCE: 'CONFERENCE',
      REQUIREMENT: 'REQUIREMENT',
      CONTACT: 'CONTACT',
      PROGRAMS: 'PROGRAMS',
      TESTIMONIALS: 'TESTIMONIALS',
      ABOUT: 'ABOUT',
      LEADS_MARKET: 'LEADS_MARKET',
      DASHBOARD: 'DASHBOARD',
      PROFESSIONAL: 'PROFESSIONAL',
      PROPERTY_ADMIN: 'PROPERTY_ADMIN',
      ADMIN: 'ADMIN',
      DEVELOPER: 'DEVELOPER'
    };
    if (directMap[activeView]) {
      setActiveNav(directMap[activeView]);
    }
  }, [activeView]);

  const [properties, setProperties] = useState<Property[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ps_properties_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [constructionLogs, setConstructionLogs] = useState<ConstructionLog[]>([]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [leadPrices, setLeadPrices] = useState<Record<LeadTier, number>>({
    STANDARD: 300,
    PREMIUM: 750,
    HNI: 2000
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ps_media_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const [conference, setConference] = useState<CorporateConference>(DEFAULT_CONFERENCE);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ps_community_posts_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [communities, setCommunities] = useState<CommunityHub[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ps_communities_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const refreshPosts = async () => {
    try {
      const res = await fetch('/api/community/posts');
      if (res.status === 401) {
        return;
      }
      const data = await res.json();
      if (Array.isArray(data?.posts)) {
        const valid = data.posts.filter((p: any) => p.status !== 'DELETED');
        setCommunityPosts(valid);
        try {
          sessionStorage.setItem('ps_community_posts_cache', JSON.stringify(valid));
        } catch {}
      }
    } catch (_err) {}
  };

  const refreshCommunities = async () => {
    try {
      const url = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEVELOPER'
        ? '/api/admin/communities/all'
        : '/api/communities';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.communities && Array.isArray(data.communities)) {
        const mapped: CommunityHub[] = data.communities.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          category: c.category,
          location: c.location,
          createdById: c.created_by_id,
          createdByName: c.created_by_name,
          status: c.status,
          rejectionReason: c.rejection_reason,
          memberCount: c.member_count || 1,
          icon: c.icon || 'Users',
          bannerImage: c.banner_image,
          rules: c.rules,
          visibility: c.visibility || 'PUBLIC',
          membershipStatus: c.membership_status || 'NONE',
          membershipRole: c.membership_role || undefined,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
        setCommunities(mapped);
        try {
          sessionStorage.setItem('ps_communities_cache', JSON.stringify(mapped));
        } catch {}
      }
    } catch (_err) {}
  };

  const lastSyncTimeRef = useRef<number>(Date.now());

  // Real-time EventSource (SSE) connection with automatic auto-reconnect & event dispatching
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectSSE = () => {
      if (isDisposed) return;
      try {
        eventSource = new EventSource('/api/community/events');

        const handlePostEvent = () => {
          lastSyncTimeRef.current = Date.now();
          refreshPosts();
        };

        const handleCommunityEvent = () => {
          lastSyncTimeRef.current = Date.now();
          refreshCommunities();
        };

        const postEvents = [
          'POST_CREATED',
          'POST_APPROVED',
          'POST_MODERATED',
          'POST_UPDATED',
          'POST_DELETED',
          'POST_DELETION_REQUESTED',
          'POST_DELETION_APPROVED',
          'POST_DELETION_REJECTED',
          'REQUIREMENT_DELETED',
          'POST_VOTE_UPDATED',
          'COMMENT_CREATED',
          'COMMENT_UPDATED',
          'COMMENT_DELETED',
          'COMMENT_LIKED',
          'LIKE_CHANGED',
          'POST_REPOSTED',
          'POST_FOLLOW_UPDATED',
          'POST_BOOKMARK_UPDATED',
          'POST_POLL_VOTED'
        ];

        const commEvents = [
          'COMMUNITY_CREATED',
          'COMMUNITY_APPROVED',
          'COMMUNITY_MODERATED',
          'COMMUNITY_UPDATED',
          'COMMUNITY_MEMBERSHIP_UPDATED',
          'COMMUNITY_MEMBER_STATUS_UPDATED',
          'COMMUNITY_MEMBER_ROLE_UPDATED'
        ];

        postEvents.forEach(type => {
          eventSource?.addEventListener(type, (e: MessageEvent) => {
            handlePostEvent();
            try {
              const parsedData = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
              window.dispatchEvent(new CustomEvent('community-sse-event', { detail: { type, data: parsedData } }));
            } catch {}
          });
        });

        commEvents.forEach(type => {
          eventSource?.addEventListener(type, handleCommunityEvent);
        });

        eventSource.onerror = () => {
          eventSource?.close();
          if (!reconnectTimeout && !isDisposed) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 3000);
          }
        };
      } catch (_err) {}
    };

    connectSSE();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [currentUser?.id]);

  // Dual-mode active short-interval polling (30s) & window focus sync to guarantee delivery across browsers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncAuthoritativeFeed = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`/api/live/sync-status?since=${lastSyncTimeRef.current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasUpdates) {
            lastSyncTimeRef.current = data.timestamps?.lastUpdated || Date.now();
            if (data.postsUpdated) refreshPosts();
            if (data.communitiesUpdated) refreshCommunities();
          }
        } else {
          refreshPosts();
          refreshCommunities();
        }
      } catch {
        refreshPosts();
        refreshCommunities();
      }
    };

    const interval = setInterval(syncAuthoritativeFeed, 30000);

    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        refreshPosts();
        refreshCommunities();
        lastSyncTimeRef.current = Date.now();
      }
    };

    const handleOnline = () => {
      refreshPosts();
      refreshCommunities();
      lastSyncTimeRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleFocusSync);
    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleFocusSync);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser?.id, currentUser?.role, isLoggedIn]);

  // Sync live dynamic content from server database on load
  useEffect(() => {
    // 1. Dynamic Media Items
    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        if (data?.items && Array.isArray(data.items)) {
          const mapped: MediaItem[] = data.items.map((it: any) => ({
            id: it.id,
            title: it.title,
            type: it.type || 'MASTERCLASS',
            duration: it.duration || '15:00',
            host: it.author_name || it.host || 'Swamy Reddy Javidi',
            guest: it.guest || undefined,
            guestTitle: it.guest_title || undefined,
            videoUrl: it.video_url || it.media_url || '',
            audioUrl: it.audio_url || '',
            mediaUrl: it.media_url || it.video_url || it.audio_url || '',
            thumbnail: it.thumbnail || '',
            summary: it.summary || '',
            keyTakeaways: Array.isArray(it.key_takeaways) ? it.key_takeaways : [],
            timestamps: Array.isArray(it.timestamps) ? it.timestamps : [],
            views: it.views || 0,
            publishedDate: it.created_at ? new Date(it.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
            status: it.status || 'PUBLISHED',
            category: it.category || 'Real Estate Intelligence',
            tags: it.tags || '[]',
            episodeTitle: it.episode_title || undefined,
            episodeNumber: it.episode_number ? Number(it.episode_number) : undefined,
            contentType: it.content_type || (it.type === 'PODCAST' ? 'PODCAST' : 'VIDEO'),
            provider: it.storage_provider || undefined,
            providerVideoId: it.provider_video_id || undefined,
            broadcastStatus: it.broadcast_status || null,
            scheduledStartTime: it.scheduled_start_time || undefined,
            actualStartTime: it.actual_start_time || undefined,
            endTime: it.end_time || undefined,
            replayUrl: it.replay_url || undefined,
            isLive: it.broadcast_status === 'LIVE' || it.type === 'LIVE_VIDEO' || it.type === 'LIVE_AUDIO'
          }));
          setMediaItems(mapped);
          try {
            sessionStorage.setItem('ps_media_cache', JSON.stringify(mapped));
          } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.properties)) {
          setProperties(data.properties);
          try {
            sessionStorage.setItem('ps_properties_cache', JSON.stringify(data.properties));
          } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setSessionUser(mapApiUser(data.user));
      })
      .catch(() => {});

    fetch('/api/conference')
      .then(res => res.json())
      .then(data => {
        const conferenceRow = data?.conference;
        if (conferenceRow?.id) {
          setConference(prev => ({
            ...prev,
            id: conferenceRow.id,
            title: conferenceRow.title || '',
            projectFocus: conferenceRow.subtitle || '',
            date: conferenceRow.date || '',
            time: conferenceRow.time || '',
            status: conferenceRow.status === 'LIVE' ? 'LIVE' : conferenceRow.status === 'RECORDED' ? 'RECORDED' : 'UPCOMING'
          }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCommunities();
    refreshPosts();
    if (!sessionUser) {
      setLeads([]);
      return;
    }
    fetch('/api/leads')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data?.leads)) setLeads(data.leads.map(mapLead));
      })
      .catch(() => {});
  }, [sessionUser?.id, sessionUser?.role]);

  const [agentApplications, setAgentApplications] = useState<AgentApplication[]>([]);
  const [developerClaims, setDeveloperClaims] = useState<DeveloperClaim[]>([]);
  const [assignments, setAssignments] = useState<PropertyAdminAssignment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [marketTrends] = useState<MicroMarketTrend[]>(MICRO_MARKET_TRENDS);
  const [toast, setToast] = useState<string | null>(null);

  // Track global scroll progress (0 to 1) throttled via requestAnimationFrame
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    let ticking = false;
    let lastProgress = 0;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const progress = Math.min(1, Math.max(0, scrollY / 280));
          if (Math.abs(progress - lastProgress) >= 0.05 || progress === 0 || progress === 1) {
            lastProgress = progress;
            setScrollProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const login = (user?: User) => {
    if (user) {
      const mapped = mapApiUser(user);
      setSessionUser(mapped);
      try {
        localStorage.setItem('ps_session_user', JSON.stringify(mapped));
      } catch {}

      // Check if user was trying to access a specific page before login
      let redirectTarget = '';
      try {
        redirectTarget = sessionStorage.getItem('ps_redirect_after_login') || '';
        if (redirectTarget) sessionStorage.removeItem('ps_redirect_after_login');
      } catch {}

      if (redirectTarget && redirectTarget !== '/' && redirectTarget !== '/home') {
        const match = matchRoute(redirectTarget);
        if (!match.isNotFound) {
          navigate(redirectTarget);
          showToast(`Signed in as ${mapped.name}`);
          return;
        }
      }

      if (isPropertySeeker(mapped.role)) {
        setActiveView('DASHBOARD');
      } else {
        setActiveView(postLoginDestination(mapped.role));
      }
      showToast(`Signed in as ${mapped.name}`);
      return;
    }
    showToast('Signed in');
  };

  const refreshSession = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const data = await res.json();
    if (data?.user) {
      const mapped = mapApiUser(data.user);
      setSessionUser(mapped);
      try {
        localStorage.setItem('ps_session_user', JSON.stringify(mapped));
      } catch {}
    }
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setSessionUser(null);
    try {
      localStorage.removeItem('ps_session_user');
      localStorage.removeItem('ps_auth_user');
    } catch {}
    setActiveView('HOME');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Signed out. Continuing in guest mode.');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ps_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ps_properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem('ps_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('ps_logs', JSON.stringify(constructionLogs));
  }, [constructionLogs]);

  useEffect(() => {
    localStorage.setItem('ps_community', JSON.stringify(communityPosts));
  }, [communityPosts]);

  useEffect(() => {
    localStorage.setItem('ps_agent_apps', JSON.stringify(agentApplications));
  }, [agentApplications]);

  useEffect(() => {
    localStorage.setItem('ps_dev_claims', JSON.stringify(developerClaims));
  }, [developerClaims]);

  useEffect(() => {
    localStorage.setItem('ps_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('ps_messages', JSON.stringify(messages));
  }, [messages]);

  const switchUser = (_user: User) => {
    showToast('Account identity comes from the server session.');
  };

  const switchRole = (_role: UserRole) => {
    showToast('Roles are assigned on the server and cannot be switched in the browser.');
  };

  const topUpWallet = (amount: number) => {
    fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, purpose: 'WALLET_TOPUP' })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Payment provider is NOT_CONFIGURED.');
          return;
        }
        showToast(data.notice || 'Payment is pending verification.');
      })
      .catch(() => showToast('Payment provider is NOT_CONFIGURED.'));
  };

  const unlockLead = async (leadId: string): Promise<boolean> => {
    const response = await fetch(`/api/leads/${leadId}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(data.error || 'Lead unlock was denied.');
      return false;
    }
    if (data.lead) {
      setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, ...data.lead, isUnlocked: true } : lead));
    }
    if (typeof data.balance === 'number') {
      setSessionUser(prev => prev ? { ...prev, walletBalance: data.balance } : prev);
    }
    showToast(data.charged > 0 ? `Lead unlocked. ₹${data.charged} debited.` : 'Lead contact details are available.');
    return true;
  };

  const updateLeadPrice = (tier: LeadTier, price: number) => {
    setLeadPrices(prev => ({ ...prev, [tier]: price }));
    showToast(`Updated dynamic lead price for ${tier} to ₹${price}`);
  };

  const updatePropertyInventory = (propertyId: string, availableUnits: number, pricePerSqft: number) => {
    setProperties(prev =>
      prev.map(p =>
        p.id === propertyId
          ? { ...p, availableUnits, pricePerSqft }
          : p
      )
    );
    showToast('Project inventory updated in real-time');
  };

  const addConstructionLog = (propertyId: string, logData: Omit<ConstructionLog, 'id'>) => {
    const newLog: ConstructionLog = {
      ...logData,
      id: `log_${Date.now()}`
    };

    setConstructionLogs(prev => [newLog, ...prev]);

    // Also update property progress percent if higher
    setProperties(prev =>
      prev.map(p =>
        p.id === propertyId
          ? { ...p, progressPercent: Math.max(p.progressPercent, logData.progressPercentage) }
          : p
      )
    );

    showToast(`Construction milestone logged: "${logData.milestoneTitle}"`);
  };

  const upvoteCommunityPost = (postId: string) => {
    fetch(`/api/community/posts/${postId}/upvote`, { method: 'POST' })
      .then(async res => {
        if (!res.ok) {
          showToast('Sign in to vote on an approved post.');
          return;
        }
        const data = await res.json();
        setCommunityPosts(prev =>
          prev.map(p => (p.id === postId ? { ...p, upvotes: Number(data.upvotes ?? p.upvotes) } : p))
        );
      })
      .catch(() => showToast('The vote was not saved.'));
  };

  const addCommunityReply = (postId: string, content: string) => {
    const isVerifiedBuilderReply = currentUser.role === 'PROPERTY_ADMIN' || currentUser.role === 'DEVELOPER';
    const newReply = {
      id: `reply_${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      isVerifiedBuilderReply,
      content,
      createdAt: 'Just now'
    };

    fetch(`/api/community/posts/${postId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
      .then(async res => {
        if (!res.ok) {
          showToast('The reply was not accepted.');
          return;
        }
        setCommunityPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, replies: [...p.replies, newReply] }
              : p
          )
        );
        showToast('Reply posted to community thread');
      })
      .catch(() => showToast('The reply was not saved.'));
  };

  const createCommunityPost = async (postData: Omit<CommunityPost, 'id' | 'createdAt' | 'upvotes' | 'replies'>): Promise<{ success: boolean; post?: any; error?: string }> => {
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: postData.propertyId,
          propertyName: postData.propertyName,
          communityId: postData.communityId,
          communityName: postData.communityName,
          topic: postData.topic,
          title: postData.title,
          content: postData.content,
          mediaType: postData.mediaType,
          mediaUrl: postData.mediaUrl,
          attachments: postData.attachments,
          postType: postData.postType,
          visibility: postData.visibility,
          pollOptions: postData.pollOptions,
          amaHostName: postData.amaHostName,
          amaHostRole: postData.amaHostRole,
          amaStatus: postData.amaStatus,
          amaStartTime: postData.amaStartTime,
          amaEndTime: postData.amaEndTime
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'The post was not submitted.');
        return { success: false, error: data.error || 'The post was not submitted.' };
      }
      if (data.post?.status === 'APPROVED') {
        showToast('Official post published live to the community!');
      } else {
        showToast('Question submitted! It is pending Super Admin approval before appearing publicly.');
      }
      await refreshPosts();
      return { success: true, post: data.post };
    } catch (err: any) {
      showToast(err.message || 'The post was not submitted.');
      return { success: false, error: err.message || 'The post was not submitted.' };
    }
  };

  const createCommunityProposal = async (proposal: {
    name: string;
    description: string;
    category: string;
    location?: string;
    coverImage?: string;
    bannerImage?: string;
    icon?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
    rules?: string;
  }) => {
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposal,
          createdById: currentUser.id,
          createdByName: currentUser.name
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit proposal');
      }
      if (data.community?.status === 'APPROVED') {
        showToast('Community created successfully and is now active!');
      } else {
        showToast('Community proposal submitted! Super Admin approval is required before it appears publicly.');
      }
      await refreshCommunities();
      return { success: true, message: data.message };
    } catch (err: any) {
      showToast(err.message || 'Error submitting community proposal');
      return { success: false, message: err.message };
    }
  };

  const updateCommunityDetails = async (communityId: string, updates: Partial<CommunityHub>) => {
    try {
      const res = await fetch(`/api/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update community');
        return { success: false, message: data.error };
      }
      showToast('Community details updated successfully!');
      await refreshCommunities();
      return { success: true, message: 'Updated' };
    } catch (err: any) {
      showToast(err.message || 'Error updating community');
      return { success: false, message: err.message };
    }
  };

  const joinCommunity = async (communityId: string) => {
    try {
      const res = await fetch(`/api/communities/${communityId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to join community');
        return { success: false, message: data.error };
      }
      showToast(data.message || (data.status === 'PENDING' ? 'Request submitted' : 'Joined community!'));
      await refreshCommunities();
      return { success: true, status: data.status, message: data.message };
    } catch (err: any) {
      showToast(err.message || 'Error joining community');
      return { success: false, message: err.message };
    }
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      const res = await fetch(`/api/communities/${communityId}/leave`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to leave community');
        return { success: false, message: data.error };
      }
      showToast('Left community');
      await refreshCommunities();
      return { success: true };
    } catch (err: any) {
      showToast(err.message || 'Error leaving community');
      return { success: false, message: err.message };
    }
  };

  const repostDiscussion = async (postId: string, note?: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to repost discussion');
        return { success: false };
      }
      showToast(data.reposted ? 'Discussion reposted to your profile!' : 'Discussion repost removed');
      await refreshPosts();
      return { success: true, reposted: data.reposted, count: data.count };
    } catch (err: any) {
      showToast(err.message || 'Error reposting discussion');
      return { success: false };
    }
  };

  const approveCommunity = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/communities/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      if (res.ok) {
        showToast('Community approved and is now live!');
        await refreshCommunities();
      }
    } catch (_err) {
      showToast('Failed to approve community');
    }
  };

  const rejectCommunity = async (id: string, reason?: string) => {
    try {
      const res = await fetch(`/api/admin/communities/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', reason })
      });
      if (res.ok) {
        showToast('Community proposal rejected.');
        await refreshCommunities();
      }
    } catch (_err) {
      showToast('Failed to reject community');
    }
  };

  const deleteCommunityHub = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/communities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Community deleted.');
        await refreshCommunities();
      }
    } catch (_err) {
      showToast('Failed to delete community');
    }
  };

  const createMediaItem = (itemData: Omit<MediaItem, 'id' | 'views' | 'publishedDate'>) => {
    fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: itemData.title,
        summary: itemData.summary,
        video_url: itemData.videoUrl,
        audio_url: itemData.audioUrl,
        media_url: itemData.mediaUrl || itemData.videoUrl || itemData.audioUrl,
        thumbnail: itemData.thumbnail,
        type: itemData.type,
        duration: itemData.duration,
        author_name: itemData.host,
        category: itemData.category,
        broadcast_status: itemData.broadcastStatus,
        scheduled_start_time: itemData.scheduledStartTime,
        actual_start_time: itemData.actualStartTime,
        end_time: itemData.endTime,
        replay_url: itemData.replayUrl,
        content_type: itemData.contentType,
        provider: itemData.provider,
        provider_video_id: itemData.providerVideoId
      })
    })
      .then(res => res.json())
      .then(resData => {
        if (!resData.success && resData.error) {
          showToast(resData.error);
          return;
        }
        const newItem: MediaItem = {
          ...itemData,
          id: resData.mediaId || `media_${Date.now()}`,
          views: 1,
          publishedDate: 'Just now'
        };
        setMediaItems(prev => [newItem, ...prev]);
        showToast(`Broadcast "${itemData.title}" published successfully!`);
      })
      .catch(() => {
        showToast('Failed to upload broadcast to server.');
      });
  };

  const deleteMediaItem = (id: string) => {
    fetch(`/api/media/${id}`, { method: 'DELETE' })
      .then(() => {
        setMediaItems(prev => prev.filter(m => m.id !== id));
        showToast('Media broadcast removed.');
      })
      .catch(() => {});
  };

  const refreshMedia = async () => {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      if (data?.items && Array.isArray(data.items)) {
        const mapped: MediaItem[] = data.items.map((it: any) => ({
            id: it.id,
            title: it.title,
            type: it.type || 'MASTERCLASS',
            duration: it.duration || '15:00',
            host: it.author_name || it.host || 'Swamy Reddy Javidi',
            guest: it.guest || undefined,
            guestTitle: it.guest_title || undefined,
            videoUrl: it.video_url || it.media_url || '',
            audioUrl: it.audio_url || '',
            mediaUrl: it.media_url || it.video_url || it.audio_url || '',
            thumbnail: it.thumbnail || '',
            summary: it.summary || '',
            keyTakeaways: Array.isArray(it.key_takeaways) ? it.key_takeaways : [],
            timestamps: Array.isArray(it.timestamps) ? it.timestamps : [],
            views: it.views || 0,
            publishedDate: it.created_at ? new Date(it.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
            status: it.status || 'PUBLISHED',
            category: it.category || 'Real Estate Intelligence',
            tags: it.tags || '[]',
            episodeTitle: it.episode_title || undefined,
            episodeNumber: it.episode_number ? Number(it.episode_number) : undefined,
            contentType: it.content_type || (it.type === 'PODCAST' ? 'PODCAST' : 'VIDEO'),
            provider: it.storage_provider || undefined,
            providerVideoId: it.provider_video_id || undefined,
            broadcastStatus: it.broadcast_status || null,
            scheduledStartTime: it.scheduled_start_time || undefined,
            actualStartTime: it.actual_start_time || undefined,
            endTime: it.end_time || undefined,
            replayUrl: it.replay_url || undefined,
            isLive: it.broadcast_status === 'LIVE' || it.type === 'LIVE_VIDEO' || it.type === 'LIVE_AUDIO'
          }));
        setMediaItems(mapped);
      }
    } catch (_e) {}
  };

  const createBuyerLead = (leadData: Omit<Lead, 'id' | 'isUnlocked' | 'createdAt'> & {
    consentGranted?: boolean;
    consentVersion?: string;
    consentPurpose?: string;
    propertyId?: string;
  }) => {
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: leadData.seekerName,
        phone: leadData.seekerPhone,
        email: leadData.seekerEmail,
        budget: leadData.budget,
        property_type: leadData.propertyType,
        micro_market: leadData.microMarket,
        tier: leadData.tier,
        price: leadData.priceCredits,
        requirements: leadData.requirements,
        propertyId: leadData.propertyId,
        consentGranted: leadData.consentGranted === true,
        consentVersion: leadData.consentVersion,
        consentPurpose: leadData.consentPurpose
      })
    })
      .then(async res => {
        const resData = await res.json();
        if (!res.ok) {
          showToast(resData.error || 'Enquiry was not accepted.');
          return;
        }
        showToast('Enquiry submitted. Contact details stay masked until an authorized unlock.');
      })
      .catch(() => {
        showToast('Failed to submit buyer lead to server.');
      });
  };

  const deleteBuyerLead = (id: string) => {
    fetch(`/api/leads/${id}`, { method: 'DELETE' })
      .then(() => {
        setLeads(prev => prev.filter(l => l.id !== id));
        showToast('Lead record removed.');
      })
      .catch(() => {});
  };

  const approveAgentApplication = (id: string) => {
    setAgentApplications(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'APPROVED' } : a))
    );
    showToast('Agent RERA Application Approved. Verified Expert badge granted.');
  };

  const rejectAgentApplication = (id: string) => {
    setAgentApplications(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'REJECTED' } : a))
    );
    showToast('Agent Application rejected.');
  };

  const approveDeveloperClaim = (id: string) => {
    const claim = developerClaims.find(c => c.id === id);
    if (!claim) return;

    setDeveloperClaims(prev =>
      prev.map(c => (c.id === id ? { ...c, status: 'APPROVED' } : c))
    );

    // Mark the property as claimed by developer
    setProperties(prev =>
      prev.map(p =>
        p.id === claim.propertyId ? { ...p, isClaimedByDeveloper: true } : p
      )
    );

    showToast(`Developer Project Claim for "${claim.propertyName}" Approved!`);
  };

  const rejectDeveloperClaim = (id: string) => {
    setDeveloperClaims(prev =>
      prev.map(c => (c.id === id ? { ...c, status: 'REJECTED' } : c))
    );
    showToast('Developer project claim rejected.');
  };

  const submitDeveloperClaim = (claimData: Omit<DeveloperClaim, 'id' | 'status' | 'submittedAt'>) => {
    const newClaim: DeveloperClaim = {
      ...claimData,
      id: `claim_${Date.now()}`,
      status: 'PENDING',
      submittedAt: 'Just now'
    };

    setDeveloperClaims(prev => [newClaim, ...prev]);
    showToast('Project verification claim submitted to Super Admin review queue.');
  };

  const submitAgentApplication = (appData: Omit<AgentApplication, 'id' | 'status' | 'submittedAt'>) => {
    const newApp: AgentApplication = {
      ...appData,
      id: `agent_app_${Date.now()}`,
      status: 'PENDING',
      submittedAt: 'Just now'
    };

    setAgentApplications(prev => [newApp, ...prev]);
    showToast('RERA Verification application & onboarding fee processed.');
  };

  // Property Admin Provisioning (Strictly Super Admin only)
  const provisionPropertyAdmin = (
    name: string,
    email: string,
    phone: string,
    propertyId: string
  ): { success: boolean; message: string } => {
    if (currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Unauthorized: Only Super Admin can provision Property Admins.' };
    }

    const targetProp = properties.find(p => p.id === propertyId);
    if (!targetProp) {
      return { success: false, message: 'Invalid property specified.' };
    }

    const newUserId = `user_prop_admin_${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      name,
      email,
      phone,
      role: 'PROPERTY_ADMIN',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      organization: `${targetProp.title} PMO`,
      assignedPropertyIds: [propertyId],
      walletBalance: 10000,
      isVerified: true
    };

    const newAssignment: PropertyAdminAssignment = {
      id: `assign_${Date.now()}`,
      propertyId,
      adminUserId: newUserId,
      adminUserName: name,
      adminUserEmail: email,
      assignedAt: 'Today',
      assignedBySuperAdmin: currentUser.name
    };

    setUsers(prev => [...prev, newUser]);
    setAssignments(prev => [...prev, newAssignment]);
    setProperties(prev =>
      prev.map(p =>
        p.id === propertyId
          ? { ...p, assignedAdmins: [...(p.assignedAdmins || []), newUserId] }
          : p
      )
    );

    showToast(`Property Admin ${name} provisioned & scoped to ${targetProp.title}`);
    return { success: true, message: `Successfully provisioned ${name} for ${targetProp.title}` };
  };

  // Conference interactivity
  const upvoteQuestion = (questionId: string) => {
    setConference(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q
      )
    }));
  };

  const submitQuestion = (text: string) => {
    const newQ = {
      id: `cq_${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role.replace('_', ' '),
      question: text,
      upvotes: 1,
      isAnswered: false,
      timestamp: 'Just now'
    };

    setConference(prev => ({
      ...prev,
      questions: [newQ, ...prev.questions]
    }));

    showToast('Question submitted to live conference moderation panel');
  };

  const votePoll = (pollId: string, optionIndex: number) => {
    setConference(prev => ({
      ...prev,
      polls: prev.polls.map(poll => {
        if (poll.id !== pollId) return poll;
        const newOptions = [...poll.options];
        newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          votes: newOptions[optionIndex].votes + 1
        };
        return {
          ...poll,
          options: newOptions,
          totalVotes: poll.totalVotes + 1,
          userVotedIndex: optionIndex
        };
      })
    }));

    showToast('Your vote has been counted in real time!');
  };

  const changeSlide = (delta: number) => {
    setConference(prev => {
      const nextIndex = Math.max(1, Math.min(prev.totalSlides, prev.currentSlideIndex + delta));
      return { ...prev, currentSlideIndex: nextIndex };
    });
  };

  // Live Chat
  const sendMessage = (text: string, recipientId?: string, leadContextId?: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      senderRole: currentUser.role,
      recipientId: recipientId || 'user_agent_vikram',
      text,
      timestamp: 'Just now',
      leadContextId
    };

    setMessages(prev => [...prev, newMsg]);

    // Simulated automated professional response after 1.5 seconds if sent to agent
    if (recipientId === 'user_agent_vikram' || !recipientId) {
      setTimeout(() => {
        const reply: ChatMessage = {
          id: `msg_reply_${Date.now()}`,
          senderId: 'user_agent_vikram',
          senderName: 'Vikram Sethi (Agent)',
          senderRole: 'AGENT',
          recipientId: currentUser.id,
          text: `Thank you, ${currentUser.name}. I have acknowledged your message regarding the verified dossier and will share the schedule coordinates shortly.`,
          timestamp: 'Just now',
          leadContextId
        };
        setMessages(m => [...m, reply]);
      }, 1400);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        switchRole,
        activeView,
        setActiveView,
        currentPath,
        routeParams,
        isNotFound,
        navigate,
        deviceMode,
        setDeviceMode,
        activeNav,
        setActiveNav,
        activeWorkspaceTab,
        setActiveWorkspaceTab,
        navigateToNav,
        properties,
        selectedProperty,
        setSelectedProperty,
        constructionLogs,
        updatePropertyInventory,
        addConstructionLog,
        leads,
        selectedLead,
        setSelectedLead,
        leadPrices,
        updateLeadPrice,
        unlockLead,
        walletBalance: currentUser.walletBalance ?? 0,
        topUpWallet,
        mediaItems,
        selectedMedia,
        setSelectedMedia,
        createMediaItem,
        deleteMediaItem,
        refreshMedia,
        createBuyerLead,
        deleteBuyerLead,
        conference,
        upvoteQuestion,
        submitQuestion,
        votePoll,
        changeSlide,
        communityPosts,
        refreshPosts,
        upvoteCommunityPost,
        addCommunityReply,
        createCommunityPost,
        communities,
        refreshCommunities,
        createCommunityProposal,
        updateCommunityDetails,
        joinCommunity,
        leaveCommunity,
        repostDiscussion,
        approveCommunity,
        rejectCommunity,
        deleteCommunityHub,
        agentApplications,
        approveAgentApplication,
        rejectAgentApplication,
        developerClaims,
        approveDeveloperClaim,
        rejectDeveloperClaim,
        submitDeveloperClaim,
        submitAgentApplication,
        assignments,
        provisionPropertyAdmin,
        marketTrends,
        messages,
        sendMessage,
        toast,
        showToast,
        isLoggedIn,
        login,
        logout,
        refreshSession,
        scrollProgress
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

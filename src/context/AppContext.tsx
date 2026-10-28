import React, { createContext, useContext, useState, useEffect } from 'react';
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
  DeviceMode
} from '../types';
import {
  MICRO_MARKET_TRENDS
} from '../data/mockData';
import { isPropertySeeker, postLoginDestination } from '../shared/policy';

interface AppContextType {
  currentUser: User;
  users: User[];
  switchUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;

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
  upvoteCommunityPost: (postId: string) => void;
  addCommunityReply: (postId: string, content: string) => void;
  createCommunityPost: (post: Omit<CommunityPost, 'id' | 'createdAt' | 'upvotes' | 'replies'>) => void;

  // Community Hubs (Super Admin approval gated)
  communities: CommunityHub[];
  refreshCommunities: () => Promise<void>;
  createCommunityProposal: (community: {
    name: string;
    description: string;
    category: string;
    location?: string;
    rules?: string;
  }) => Promise<{ success: boolean; message: string }>;
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

const EMPTY_CONFERENCE: CorporateConference = {
  id: '',
  title: '',
  developerName: '',
  projectFocus: '',
  date: '',
  time: '',
  status: 'UPCOMING',
  attendeesCount: 0,
  currentPresenter: '',
  presenterRole: '',
  streamThumbnail: '',
  presentationSlideUrl: '',
  currentSlideIndex: 0,
  totalSlides: 0,
  agenda: [],
  questions: [],
  polls: []
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
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const currentUser = sessionUser ?? GUEST_USER;
  const isLoggedIn = Boolean(sessionUser);

  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('AUTO');

  const [properties, setProperties] = useState<Property[]>([]);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [constructionLogs, setConstructionLogs] = useState<ConstructionLog[]>([]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [leadPrices, setLeadPrices] = useState<Record<LeadTier, number>>({
    STANDARD: 300,
    PREMIUM: 750,
    HNI: 2000
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const [conference, setConference] = useState<CorporateConference>(EMPTY_CONFERENCE);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<CommunityHub[]>([]);

  const refreshCommunities = async () => {
    try {
      const url = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEVELOPER'
        ? '/api/admin/communities/all'
        : '/api/communities';
      const res = await fetch(url);
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
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
        setCommunities(mapped);
      }
    } catch (_err) {}
  };

  // Sync live dynamic content from server database on load
  useEffect(() => {
    // 0. Communities
    refreshCommunities();

    // 1. Community Posts
    fetch('/api/community/posts')
      .then(res => res.json())
      .then(data => {
        if (data?.posts && Array.isArray(data.posts)) {
          setCommunityPosts(data.posts);
        }
      })
      .catch(() => {});

    // 2. Dynamic Media Items
    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        if (data?.items && Array.isArray(data.items)) {
          const mapped: MediaItem[] = data.items.map((it: any) => ({
            id: it.id,
            title: it.title,
            type: it.type || 'MASTERCLASS',
            duration: it.duration || '15:00',
            host: it.author_name || 'Swamy Reddy Javidi',
            videoUrl: it.video_url || '',
            thumbnail: it.thumbnail || '',
            summary: it.summary || '',
            keyTakeaways: [],
            timestamps: [],
            views: it.views || 0,
            publishedDate: it.created_at ? new Date(it.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'
          }));
          setMediaItems(mapped);
        }
      })
      .catch(() => {});

    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.properties)) setProperties(data.properties);
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

  // Track global scroll progress (0 to 1) for the smooth image-to-logo morphing animation
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      // Progress over first 280px of scrolling
      const progress = Math.min(1, Math.max(0, scrollY / 280));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const login = (user?: User) => {
    if (user) {
      const mapped = mapApiUser(user);
      setSessionUser(mapped);
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
    if (data?.user) setSessionUser(mapApiUser(data.user));
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setSessionUser(null);
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

  const createCommunityPost = (postData: Omit<CommunityPost, 'id' | 'createdAt' | 'upvotes' | 'replies'>) => {
    fetch('/api/community/posts', {
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
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'The post was not submitted.');
          return;
        }
        showToast('Post submitted for approval. It stays hidden from the public feed until a Super Admin approves it.');
        const postsRes = await fetch('/api/community/posts');
        const postsData = await postsRes.json();
        if (Array.isArray(postsData?.posts)) setCommunityPosts(postsData.posts);
      })
      .catch(() => showToast('The post was not submitted.'));
  };

  const createCommunityProposal = async (proposal: {
    name: string;
    description: string;
    category: string;
    location?: string;
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
      showToast('Community proposal submitted! Super Admin approval is required for it to be available live.');
      await refreshCommunities();
      return { success: true, message: data.message };
    } catch (err: any) {
      showToast(err.message || 'Error submitting community proposal');
      return { success: false, message: err.message };
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
        thumbnail: itemData.thumbnail,
        type: itemData.type,
        duration: itemData.duration,
        author_name: itemData.host
      })
    })
      .then(res => res.json())
      .then(resData => {
        const newItem: MediaItem = {
          ...itemData,
          id: resData.mediaId || `media_${Date.now()}`,
          views: 1,
          publishedDate: 'Just now'
        };
        setMediaItems(prev => [newItem, ...prev]);
        showToast(`Video broadcast "${itemData.title}" uploaded successfully!`);
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
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
        deviceMode,
        setDeviceMode,
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
        walletBalance: currentUser.walletBalance,
        topUpWallet,
        mediaItems,
        selectedMedia,
        setSelectedMedia,
        createMediaItem,
        deleteMediaItem,
        createBuyerLead,
        deleteBuyerLead,
        conference,
        upvoteQuestion,
        submitQuestion,
        votePoll,
        changeSlide,
        communityPosts,
        upvoteCommunityPost,
        addCommunityReply,
        createCommunityPost,
        communities,
        refreshCommunities,
        createCommunityProposal,
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

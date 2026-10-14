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
  INITIAL_USERS,
  INITIAL_PROPERTIES,
  INITIAL_CONSTRUCTION_LOGS,
  INITIAL_LEADS,
  INITIAL_MEDIA_ITEMS,
  INITIAL_CONFERENCE,
  MICRO_MARKET_TRENDS,
  INITIAL_COMMUNITY_POSTS,
  INITIAL_AGENT_APPLICATIONS,
  INITIAL_DEVELOPER_CLAIMS,
  INITIAL_ASSIGNMENTS,
  INITIAL_MESSAGES
} from '../data/mockData';

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
  unlockLead: (leadId: string) => boolean;

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
  createBuyerLead: (lead: Omit<Lead, 'id' | 'isUnlocked' | 'createdAt'>) => void;
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

  // Scroll Progress for Hero Morph Animation
  scrollProgress: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ps_users');
    const parsed = saved ? JSON.parse(saved) : INITIAL_USERS;
    return parsed.map((u: User) => ({ ...u, walletBalance: 0 }));
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('ps_current_user_id') || 'user_super_admin';
  });

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('AUTO');

  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('ps_properties');
    return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [constructionLogs, setConstructionLogs] = useState<ConstructionLog[]>(() => {
    const saved = localStorage.getItem('ps_logs');
    return saved ? JSON.parse(saved) : INITIAL_CONSTRUCTION_LOGS;
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [leadPrices, setLeadPrices] = useState<Record<LeadTier, number>>({
    STANDARD: 300,
    PREMIUM: 750,
    HNI: 2000
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const [conference, setConference] = useState<CorporateConference>(() => {
    const saved = localStorage.getItem('ps_conference');
    return saved ? JSON.parse(saved) : INITIAL_CONFERENCE;
  });

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<CommunityHub[]>([]);

  const refreshCommunities = async () => {
    try {
      const url = currentUser?.role === 'SUPER_ADMIN' ? '/api/admin/communities' : '/api/communities';
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
            videoUrl: it.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            thumbnail: it.thumbnail || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
            summary: it.summary || '',
            keyTakeaways: [
              'Regulatory due diligence & TG-RERA verification',
              'Vector floor plan structural layout examination',
              'Real-time landing cost calculations without marketing bias'
            ],
            timestamps: [
              { time: '00:00', label: 'Executive Intro & Foundation Audit' },
              { time: '05:30', label: 'Detailed Engineering Breakdown' }
            ],
            views: it.views || 1,
            publishedDate: it.created_at ? new Date(it.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'
          }));
          setMediaItems(mapped);
        }
      })
      .catch(() => {});

    // 3. Dynamic Buyer Leads
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => {
        if (data?.leads && Array.isArray(data.leads)) {
          const mapped: Lead[] = data.leads.map((l: any) => ({
            id: l.id,
            seekerName: l.name ? (l.name.length > 2 ? `${l.name[0]}*** ${l.name.slice(-1)}***` : 'Verified Seeker') : 'S*** K***',
            seekerPhone: l.phone ? `+91 ${l.phone.slice(0, 2)}****${l.phone.slice(-4)}` : '+91 98****3210',
            seekerEmail: l.email ? `${l.email[0]}***@gmail.com` : 's***@domain.com',
            budget: l.budget || '₹4.00 Cr - ₹6.00 Cr',
            budgetMinLakhs: 400,
            microMarket: l.micro_market || 'Western Corridor',
            propertyType: l.property_type || 'Luxury High-Rise',
            timeframe: 'Immediate (Within 15 Days)',
            requirements: l.requirements || 'Verified buyer inquiry.',
            tier: l.tier || 'PREMIUM',
            priceCredits: l.price || 750,
            isUnlocked: false,
            createdAt: 'Recently'
          }));
          setLeads(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const [agentApplications, setAgentApplications] = useState<AgentApplication[]>(() => {
    const saved = localStorage.getItem('ps_agent_apps');
    return saved ? JSON.parse(saved) : INITIAL_AGENT_APPLICATIONS;
  });

  const [developerClaims, setDeveloperClaims] = useState<DeveloperClaim[]>(() => {
    const saved = localStorage.getItem('ps_dev_claims');
    return saved ? JSON.parse(saved) : INITIAL_DEVELOPER_CLAIMS;
  });

  const [assignments, setAssignments] = useState<PropertyAdminAssignment[]>(() => {
    const saved = localStorage.getItem('ps_assignments');
    return saved ? JSON.parse(saved) : INITIAL_ASSIGNMENTS;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('ps_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [marketTrends] = useState<MicroMarketTrend[]>(MICRO_MARKET_TRENDS);
  const [toast, setToast] = useState<string | null>(null);

  // Auth & Guest Mode: default to false as requested ("the website should be without login", only Login button)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('ps_is_logged_in') === 'true';
  });

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
      setCurrentUserId(user.id);
    }
    setIsLoggedIn(true);
    localStorage.setItem('ps_is_logged_in', 'true');
    showToast(`Signed in as ${user ? user.name : currentUser.name}`);
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('ps_is_logged_in');
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
    localStorage.setItem('ps_current_user_id', currentUserId);
  }, [currentUserId]);

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

  const switchUser = (user: User) => {
    setCurrentUserId(user.id);
    setIsLoggedIn(true);
    localStorage.setItem('ps_is_logged_in', 'true');
    showToast(`Switched profile to: ${user.name} (${user.role.replace('_', ' ')})`);
  };

  const switchRole = (role: UserRole) => {
    const foundUser = users.find(u => u.role === role);
    if (foundUser) {
      setCurrentUserId(foundUser.id);
      setIsLoggedIn(true);
      localStorage.setItem('ps_is_logged_in', 'true');
      showToast(`Active Role: ${role.replace('_', ' ')} (${foundUser.name})`);
    } else {
      showToast(`No user profile found for role ${role}`);
    }
  };

  const topUpWallet = (amount: number) => {
    setUsers(prev =>
      prev.map(u => (u.id === currentUser.id ? { ...u, walletBalance: u.walletBalance + amount } : u))
    );
    showToast(`Wallet credited with ₹${amount.toLocaleString('en-IN')}`);
  };

  const unlockLead = (leadId: string): boolean => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return false;
    if (lead.isUnlocked) {
      showToast('Lead is already unlocked!');
      return true;
    }

    const price = leadPrices[lead.tier] || lead.priceCredits;
    if (currentUser.walletBalance < price) {
      showToast(`Insufficient wallet balance (Need ₹${price}, Available ₹${currentUser.walletBalance}). Please recharge.`);
      return false;
    }

    // Deduct balance
    setUsers(prev =>
      prev.map(u => (u.id === currentUser.id ? { ...u, walletBalance: u.walletBalance - price } : u))
    );

    // Unlock lead
    setLeads(prev =>
      prev.map(l =>
        l.id === leadId
          ? {
              ...l,
              isUnlocked: true,
              unlockedAt: 'Just now',
              unlockedByUserId: currentUser.id,
              unlockedByRole: currentUser.role
            }
          : l
      )
    );

    showToast(`Lead verified & unlocked for ₹${price}! Contact details now visible.`);
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
    setCommunityPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p))
    );
    fetch(`/api/community/posts/${postId}/upvote`, { method: 'POST' }).catch(() => {});
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

    setCommunityPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, replies: [...p.replies, newReply] }
          : p
      )
    );

    showToast('Reply posted to community thread');

    fetch(`/api/community/posts/${postId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        isVerifiedBuilder: isVerifiedBuilderReply,
        content
      })
    }).catch(() => {});
  };

  const createCommunityPost = (postData: Omit<CommunityPost, 'id' | 'createdAt' | 'upvotes' | 'replies'>) => {
    const newPost: CommunityPost = {
      ...postData,
      id: `post_${Date.now()}`,
      upvotes: 1,
      replies: [],
      createdAt: 'Just now'
    };

    setCommunityPosts(prev => [newPost, ...prev]);
    showToast('Community query submitted successfully');

    fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        propertyId: postData.propertyId,
        propertyName: postData.propertyName,
        topic: postData.topic,
        title: postData.title,
        content: postData.content,
        mediaType: postData.mediaType,
        mediaUrl: postData.mediaUrl,
        attachments: postData.attachments
      })
    }).catch(() => {});
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
        method: 'PUT',
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejection_reason: reason })
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

  const createBuyerLead = (leadData: Omit<Lead, 'id' | 'isUnlocked' | 'createdAt'>) => {
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
        requirements: leadData.requirements
      })
    })
      .then(res => res.json())
      .then(resData => {
        const newLead: Lead = {
          ...leadData,
          id: resData.leadId || `lead_${Date.now()}`,
          isUnlocked: false,
          createdAt: 'Just now'
        };
        setLeads(prev => [newLead, ...prev]);
        showToast(`Buyer lead for ${leadData.propertyType} (${leadData.budget}) submitted!`);
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

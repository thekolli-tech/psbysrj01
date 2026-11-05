import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LeadTier, UserRole } from '../../types';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  ShieldAlert,
  Building,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Tag,
  PlusCircle,
  Check,
  LogOut,
  Users,
  MessageSquare,
  KeyRound,
  Trash2,
  Edit2,
  Pin,
  Eye,
  AlertCircle,
  Sparkles,
  Search,
  Lock,
  UserCheck,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  Database,
  MapPin,
  CreditCard,
  History,
  ArrowRight
} from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  organization: string;
  profession?: string | null;
  wallet_balance: number;
  postCount?: number;
  created_at?: string;
  assignedPropertyIds?: string[];
  account_status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'RESTRICTED';
  is_restricted?: number;
  restricted_reason?: string | null;
}

interface ManagedPost {
  id: string;
  authorId?: string;
  authorName: string;
  authorRole: string;
  propertyId?: string;
  propertyName?: string;
  topic: string;
  title: string;
  content: string;
  upvotes: number;
  isPinned: boolean;
  isFlagged: boolean;
  status?: string;
  createdAt: string;
  replies: Array<{
    id: string;
    authorName: string;
    authorRole: string;
    content: string;
    createdAt: string;
    isVerifiedBuilderReply?: boolean;
  }>;
}

function formatRelativeTime(dateStr?: string | number): string {
  if (!dateStr) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

export const SuperAdminDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    agentApplications,
    approveAgentApplication,
    rejectAgentApplication,
    developerClaims,
    approveDeveloperClaim,
    rejectDeveloperClaim,
    leadPrices,
    updateLeadPrice,
    properties,
    assignments,
    provisionPropertyAdmin,
    logout,
    setActiveView,
    showToast,
    communities,
    approveCommunity,
    rejectCommunity,
    deleteCommunityHub
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'MODERATION' | 'USERS_DIRECTORY' | 'REQUIREMENTS' | 'AUDIT_LOGS' | 'FINANCE' | 'COMMUNITIES' | 'ALL_POSTS' | 'CREDENTIALS' | 'AGENTS_QUEUE' | 'DEV_CLAIMS' | 'LEAD_PRICING' | 'PROVISION_PMO'
  >('OVERVIEW');

  // Moderation Queue State
  const [moderationListings, setModerationListings] = useState<any[]>([]);
  const [moderationProfessionals, setModerationProfessionals] = useState<any[]>([]);
  const [moderationPosts, setModerationPosts] = useState<any[]>([]);
  const [moderationCommunities, setModerationCommunities] = useState<any[]>([]);
  const [moderationDeletionRequests, setModerationDeletionRequests] = useState<any[]>([]);
  const [moderatingItemId, setModeratingItemId] = useState<string | null>(null);

  // Requirements State
  const [adminRequirements, setAdminRequirements] = useState<any[]>([]);
  const [requirementSearch, setRequirementSearch] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Finance State
  const [financeData, setFinanceData] = useState<{ payments: string; transactions: any[]; ledger: any[] } | null>(null);
  const [adjustmentUserId, setAdjustmentUserId] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [adjustmentSuccessMsg, setAdjustmentSuccessMsg] = useState<string | null>(null);
  const [adjustmentErrorMsg, setAdjustmentErrorMsg] = useState<string | null>(null);

  // Live Users Directory State
  const [liveUsers, setLiveUsers] = useState<ManagedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT' as UserRole,
    phone: '',
    organization: ''
  });

  // Live Community Posts State
  const [livePosts, setLivePosts] = useState<ManagedPost[]>([]);
  const [postSearch, setPostSearch] = useState('');
  const [postTopicFilter, setPostTopicFilter] = useState<string>('ALL');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Super Admin Password Update state
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPwdStatus, setAdminPwdStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminPwdStep, setAdminPwdStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [adminPwdOtp, setAdminPwdOtp] = useState('');
  const [adminOtpDestination, setAdminOtpDestination] = useState<string | null>(null);
  const [adminRequestingOtp, setAdminRequestingOtp] = useState(false);
  const [adminSavingPassword, setAdminSavingPassword] = useState(false);

  // Property Admin Provisioning Form State
  const [pmoForm, setPmoForm] = useState({
    name: '',
    email: '',
    phone: '',
    propertyId: properties[0]?.id || ''
  });
  const [pmoStatusMessage, setPmoStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic pricing temp state
  const [customRates, setCustomRates] = useState<Record<LeadTier, number>>({
    STANDARD: leadPrices.STANDARD,
    PREMIUM: leadPrices.PREMIUM,
    HNI: leadPrices.HNI
  });

  // Live Server Health & Telemetry State
  const [serverHealth, setServerHealth] = useState<{
    status: string;
    uptimeSeconds: number;
    databaseConnected: boolean;
    dbTarget: string;
    latencyMs?: number;
  }>({
    status: 'OPERATIONAL',
    uptimeSeconds: 0,
    databaseConnected: true,
    dbTarget: 'PostgreSQL Production'
  });

  // Fetch live users and posts from server API
  const refreshServerData = async () => {
    setLoadingData(true);
    try {
      // 0. Fetch Health & Server Telemetry
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const hData = await healthRes.json();
          setServerHealth({
            status: hData.status === 'OK' ? 'OPERATIONAL' : 'DEGRADED',
            uptimeSeconds: typeof hData.uptime === 'number' ? Math.floor(hData.uptime) : 0,
            databaseConnected: Boolean(hData.database?.connected),
            dbTarget: hData.authoritativeDatabase === 'postgresql' ? 'PostgreSQL Production' : 'SQLite Local',
            latencyMs: hData.database?.latencyMs
          });
        }
      } catch {}

      // 1. Fetch Users
      const userRes = await fetch('/api/admin/users');
      if (userRes.ok) {
        const uData = await userRes.json();
        setLiveUsers(uData.users || []);
      }

      const postRes = await fetch('/api/admin/moderation/queue');
      if (postRes.ok) {
        const pData = await postRes.json();
        setModerationListings(Array.isArray(pData.listings) ? pData.listings : []);
        setModerationProfessionals(Array.isArray(pData.professionals) ? pData.professionals : []);
        setModerationCommunities(Array.isArray(pData.communities) ? pData.communities : []);
        setModerationDeletionRequests(Array.isArray(pData.deletionRequests) ? pData.deletionRequests : []);
        const queued = Array.isArray(pData.posts) ? pData.posts : [];
        setModerationPosts(queued);
        setLivePosts(queued.map((p: any) => ({
          id: p.id,
          authorId: p.author_id,
          authorName: p.author_name,
          authorRole: p.author_role,
          topic: p.topic,
          title: p.title,
          content: p.content,
          status: p.status,
          upvotes: Number(p.upvotes || 0),
          isPinned: Boolean(p.is_pinned),
          isFlagged: Boolean(p.is_flagged),
          createdAt: p.created_at,
          replies: []
        })));
      }

      // Fetch Requirements
      const reqRes = await fetch('/api/admin/requirements');
      if (reqRes.ok) {
        const rData = await reqRes.json();
        setAdminRequirements(Array.isArray(rData.requirements) ? rData.requirements : []);
      }

      // Fetch Audit Logs
      const auditRes = await fetch('/api/admin/audit-logs?limit=50');
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditLogs(Array.isArray(aData.logs) ? aData.logs : []);
      }

      // Fetch Finance
      const finRes = await fetch('/api/admin/finance');
      if (finRes.ok) {
        const fData = await finRes.json();
        setFinanceData(fData);
      }
    } catch (e) {
      console.warn('Using client-side fallback data', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    refreshServerData();
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        refreshServerData();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePrices = () => {
    updateLeadPrice('STANDARD', customRates.STANDARD);
    updateLeadPrice('PREMIUM', customRates.PREMIUM);
    updateLeadPrice('HNI', customRates.HNI);
    showToast('Dynamic lead prices updated');
  };

  // Super Admin Moderation Handlers
  const handleModerateListing = async (listingId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setModeratingItemId(listingId);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/publication`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to moderate listing');
      showToast(`Listing marked as ${status}`);
      refreshServerData();
    } catch (err: any) {
      showToast(err.message || 'Moderation failed');
    } finally {
      setModeratingItemId(null);
    }
  };

  const handleModerateProfessional = async (userId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    setModeratingItemId(userId);
    try {
      const res = await fetch(`/api/admin/professionals/${userId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update professional verification');
      showToast(`Professional marked as ${status}`);
      refreshServerData();
    } catch (err: any) {
      showToast(err.message || 'Verification update failed');
    } finally {
      setModeratingItemId(null);
    }
  };

  const handleModeratePost = async (postId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setModeratingItemId(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to moderate post');
      showToast(`Question / Post marked as ${status}`);
      refreshServerData();
    } catch (err: any) {
      showToast(err.message || 'Moderation failed');
    } finally {
      setModeratingItemId(null);
    }
  };

  const handleApprovePostDeletion = async (postId: string) => {
    setModeratingItemId(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/approve-deletion`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve post deletion');
      showToast('Post deletion approved and removed from feeds.');
      setModerationDeletionRequests(prev => prev.filter(p => p.id !== postId));
      refreshServerData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve post deletion');
    } finally {
      setModeratingItemId(null);
    }
  };

  const handleRejectPostDeletion = async (postId: string, reason: string) => {
    if (!reason || reason.trim().length < 5) {
      showToast('A mandatory rejection reason of at least 5 characters is required.');
      return;
    }
    setModeratingItemId(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/reject-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject post deletion');
      showToast('Post deletion request rejected. Post restored to original status.');
      setModerationDeletionRequests(prev => prev.filter(p => p.id !== postId));
      refreshServerData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject post deletion');
    } finally {
      setModeratingItemId(null);
    }
  };

  const handleModerateCommunity = async (communityId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setModeratingItemId(communityId);
    try {
      const res = await fetch(`/api/admin/communities/${communityId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to moderate community');
      showToast(`Community marked as ${status}`);
      refreshServerData();
    } catch (err: any) {
      showToast(err.message || 'Moderation failed');
    } finally {
      setModeratingItemId(null);
    }
  };

  const handleFinanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustmentSuccessMsg(null);
    setAdjustmentErrorMsg(null);
    if (!adjustmentUserId || !adjustmentAmount) {
      setAdjustmentErrorMsg('User ID and amount are required.');
      return;
    }
    setSubmittingAdjustment(true);
    try {
      const res = await fetch('/api/admin/finance/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adjustmentUserId.trim(),
          amount: Number(adjustmentAmount),
          direction: adjustmentDirection,
          reason: adjustmentReason.trim() || 'Super Admin manual adjustment',
          idempotencyKey: crypto.randomUUID()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adjustment failed');
      setAdjustmentSuccessMsg(`Wallet successfully ${adjustmentDirection === 'CREDIT' ? 'credited' : 'debited'}.`);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      refreshServerData();
    } catch (err: any) {
      setAdjustmentErrorMsg(err.message || 'Adjustment request failed');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmoForm.name || !pmoForm.email || !pmoForm.propertyId) {
      setPmoStatusMessage({ type: 'error', text: 'All fields are required for provisioning.' });
      return;
    }

    const res = provisionPropertyAdmin(pmoForm.name, pmoForm.email, pmoForm.phone, pmoForm.propertyId);
    if (res.success) {
      setPmoStatusMessage({ type: 'success', text: res.message });
      setPmoForm({ name: '', email: '', phone: '', propertyId: properties[0]?.id || '' });
      refreshServerData();
    } else {
      setPmoStatusMessage({ type: 'error', text: res.message });
    }
  };

  // User Management Handlers
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the account for ${userName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      showToast(`Account for ${userName} deleted`);
      refreshServerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleRestrictUser = async (user: ManagedUser) => {
    const isCurrentlyRestricted = Boolean(user.is_restricted || user.account_status === 'RESTRICTED');
    let reason: string | null = null;
    if (!isCurrentlyRestricted) {
      reason = prompt(`Enter restriction reason for ${user.name}:`, 'Policy violation or suspicious activity');
      if (reason === null) return;
    } else {
      if (!confirm(`Are you sure you want to lift restrictions on ${user.name}?`)) return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrict: !isCurrentlyRestricted, reason: reason || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account restriction status');
      showToast(data.message || (isCurrentlyRestricted ? 'User unrestricted' : 'User restricted'));
      refreshServerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordInput) return;

    try {
      const res = await fetch(`/api/admin/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      showToast(`Password reset for ${resetPasswordUser.name}`);
      setResetPasswordUser(null);
      setNewPasswordInput('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      showToast(`User account created: ${newUserForm.name}`);
      setCreateUserModalOpen(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'AGENT',
        phone: '',
        organization: ''
      });
      refreshServerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Community Moderation Handlers
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this community post?')) return;
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      showToast('Community post deleted by Super Admin');
      refreshServerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePinPost = async (postId: string, currentPin: boolean) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPin })
      });
      if (!res.ok) throw new Error('Failed to pin/unpin');
      showToast(currentPin ? 'Post unpinned' : 'Post pinned to top');
      refreshServerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Super Admin Password Form Handler
  const handleAdminRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPwdStatus(null);

    if (!adminCurrentPassword) {
      setAdminPwdStatus({ type: 'error', text: 'Please enter current password.' });
      return;
    }

    if (adminNewPassword.length < 8) {
      setAdminPwdStatus({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPwdStatus({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setAdminRequestingOtp(true);
    try {
      const res = await fetch('/api/auth/request-password-change-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request verification code');
      setAdminOtpDestination(data.destination || 'info@propertystudio.org');
      setAdminPwdStep('OTP');
      showToast('Super Admin verification code dispatched.');
    } catch (err: any) {
      setAdminPwdStatus({ type: 'error', text: err.message || 'Error requesting verification code.' });
    } finally {
      setAdminRequestingOtp(false);
    }
  };

  const handleAdminConfirmPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPwdStatus(null);

    if (!adminPwdOtp || adminPwdOtp.trim().length !== 6) {
      setAdminPwdStatus({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }

    setAdminSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: adminCurrentPassword,
          newPassword: adminNewPassword,
          otp: adminPwdOtp.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setAdminPwdStatus({ type: 'success', text: 'Super Admin password updated! Confirmation sent to ' + (adminOtpDestination || 'info@propertystudio.org') });
      setAdminCurrentPassword('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setAdminPwdOtp('');
      setAdminPwdStep('INPUT');
      showToast('Super Admin password updated.');
    } catch (err: any) {
      setAdminPwdStatus({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setAdminSavingPassword(false);
    }
  };

  // Filtered Users
  const filteredUsers = liveUsers.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch));
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Posts
  const filteredPosts = livePosts.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.content.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.authorName.toLowerCase().includes(postSearch.toLowerCase());
    const matchesTopic = postTopicFilter === 'ALL' || p.topic === postTopicFilter;
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="min-h-screen bg-[#FAFCFD] flex">
      {/* 
        ====================================================================
        LEFT SIDEBAR: SUPER ADMIN NAVIGATION (MATCHING IMAGE 2)
        ====================================================================
      */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-white border-r border-[#E8E4D8] p-5 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Super Admin Pill */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setActiveView('HOME');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-[#B49029]" />
                <div>
                  <span className="font-extrabold text-sm tracking-tight text-[#030508] block font-display leading-tight">
                    PROPERTY STUDIO
                  </span>
                  <span className="text-[9px] font-mono text-[#B49029] font-bold tracking-widest uppercase block">
                    BY SWAMY REDDY JAVIDI
                  </span>
                </div>
              </div>
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCFBF3] text-[#A99137] border border-[#B49029]/40 text-[11px] font-bold">
              <span>👑</span>
              <span className="uppercase font-mono">SUPER ADMIN</span>
            </div>
          </div>

          {/* Navigation Links List */}
          <nav className="space-y-1">
            {[
              { id: 'OVERVIEW', label: 'Dashboard', icon: ShieldAlert },
              { id: 'OVERVIEW', label: 'Platform Metrics', icon: TrendingUp },
              { id: 'USERS_DIRECTORY', label: 'Users & Accounts', icon: Users, badge: liveUsers.length || users.length },
              { id: 'MODERATION', label: 'Content & Media', icon: Layers },
              { id: 'MODERATION', label: 'Projects & Listings', icon: Building, badge: properties.length },
              { id: 'REQUIREMENTS', label: 'Buyer Requirements', icon: Tag, badge: adminRequirements.length },
              { id: 'COMMUNITIES', label: 'Community & Q&A', icon: MessageSquare },
              { id: 'AUDIT_LOGS', label: 'Audits & Compliance', icon: ShieldCheck },
              { id: 'FINANCE', label: 'Finance & Ledger', icon: CreditCard },
              {
                id: 'MODERATION',
                label: 'Approvals & Queue',
                icon: CheckCircle2,
                badge: moderationListings.length + moderationProfessionals.length + moderationPosts.length + moderationCommunities.length + moderationDeletionRequests.length,
                badgeColor: 'bg-[#B49029] text-white'
              },
              { id: 'CREDENTIALS', label: 'Settings', icon: KeyRound }
            ].map((item, idx) => {
              const isActive = activeTab === item.id && (idx === 0 || item.label !== 'Dashboard');
              const IconComp = item.icon;

              return (
                <button
                  key={`${item.id}-${item.label}`}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FCFBF3] text-[#A99137] border border-[#CEC8A2] font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#B49029]' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Console Card - Live Telemetry Status */}
        <div className="pt-4 border-t border-slate-100">
          <div className="bg-gradient-to-br from-[#182A3E] via-[#0F1E2E] to-[#030508] text-white p-3.5 rounded-2xl relative overflow-hidden shadow-md border border-[#B49029]/20">
            {/* Subtle background glow */}
            <div
              className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80')"
              }}
            />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{serverHealth.databaseConnected ? 'Live Telemetry' : 'Syncing Node'}</span>
                </div>
                <button
                  type="button"
                  onClick={refreshServerData}
                  className="w-6 h-6 rounded-lg bg-[#B49029]/20 hover:bg-[#B49029] text-[#B49029] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Force Live Data Re-sync"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingData ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div>
                <span className="text-xs font-black block text-white tracking-wide">
                  Property Studio Core
                </span>
                <span className="text-[10px] text-slate-300 font-mono block">
                  {serverHealth.dbTarget || 'PostgreSQL Production'}
                </span>
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>Latency &bull; {serverHealth.latencyMs ? `${serverHealth.latencyMs}ms` : '12ms'}</span>
                <span className="text-emerald-400 font-bold">100% Operational</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 
        ====================================================================
        MAIN APPLICATION AREA (MATCHING IMAGE 2)
        ====================================================================
      */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (Matching Image 2) */}
        <header className="bg-white border-b border-[#E8E4D8] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[#030508] font-display leading-tight">
              Dashboard
            </h1>
            <p className="text-xs text-[#64748B]">
              Super Admin &bull; Platform Governance
            </p>
          </div>

          {/* Center Search Input with Ctrl K */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users, projects, posts, or requirements..."
              value={userSearch}
              onChange={e => {
                setUserSearch(e.target.value);
                if (activeTab === 'OVERVIEW') setActiveTab('USERS_DIRECTORY');
              }}
              className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl K
            </span>
          </div>

          {/* Right Status & Profile Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>Hyderabad</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={refreshServerData}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
                title="Notifications & Updates"
              >
                <Activity className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 ring-2 ring-white" />
              </button>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={getSafeAvatar(currentUser.avatar)}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-[#B49029]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <div className="hidden sm:block text-left text-xs">
                <span className="font-bold text-slate-900 block leading-tight">Super Admin</span>
                <span className="text-[10px] text-slate-500 block">Platform Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Sunset Skyline Hero Banner (Matching Image 2) */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#182A3E] via-[#182A3E] to-[#030508] text-white rounded-3xl p-6 sm:p-8 border border-[#CEC8A2]/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Skyline City Backdrop Silhouette */}
            <div
              className="absolute inset-0 opacity-20 bg-cover bg-right pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80')"
              }}
            />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#B49029]/20 border border-[#B49029]/50 flex items-center justify-center text-[#B49029] shrink-0 text-xl shadow-inner">
                👑
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
                  Super Admin Governance Suite
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Central control for platform operations, users, content, approvals and compliance.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{serverHealth.databaseConnected ? 'Live Server · Healthy' : 'Database Degraded'}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-slate-200">
                <Activity className="w-3.5 h-3.5 text-[#B49029]" />
                <span>
                  {serverHealth.uptimeSeconds > 0
                    ? `Uptime: ${Math.floor(serverHealth.uptimeSeconds / 3600)}h ${Math.floor((serverHealth.uptimeSeconds % 3600) / 60)}m`
                    : 'Uptime: 99.98% Active'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-slate-300">
                <Database className="w-3 h-3 text-[#B49029]" />
                <span>{serverHealth.dbTarget}</span>
              </div>
            </div>
          </div>

          {/* Sub-Tab Navigation Bar (Matching Image 2) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'OVERVIEW', label: 'Platform Overview' },
              { id: 'MODERATION', label: 'Moderation Queue', count: moderationListings.length + moderationProfessionals.length + moderationPosts.length + moderationCommunities.length + moderationDeletionRequests.length },
              { id: 'USERS_DIRECTORY', label: 'User Accounts' },
              { id: 'REQUIREMENTS', label: 'Buyer Requirements' },
              { id: 'AUDIT_LOGS', label: 'Audit Trail' },
              { id: 'FINANCE', label: 'Finance & Ledger' },
              { id: 'COMMUNITIES', label: 'Community Approvals' },
              { id: 'CREDENTIALS', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id + tab.label}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#FCFBF3] text-[#A99137] border border-[#B49029]/50 shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 
            ================================================================
            VIEW: OVERVIEW (MATCHING IMAGE 2)
            ================================================================
          */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* 4 Metric Cards with Sparklines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold">
                      <div className="w-8 h-8 rounded-lg bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span>Total Live Accounts</span>
                    </div>
                    <div className="text-2xl font-black text-[#030508] font-mono-numbers pl-1">
                      {liveUsers.length > 0 ? liveUsers.length.toLocaleString() : '1'}
                    </div>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5 pl-1">
                      ↑ {liveUsers.filter(u => u.account_status === 'ACTIVE' || !u.account_status).length || 1} active accounts
                    </span>
                  </div>
                  <svg className="w-24 h-10 text-[#B49029] overflow-visible" viewBox="0 0 96 40" fill="none">
                    <path d="M0 32 Q 25 30, 50 20 T 96 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold">
                      <div className="w-8 h-8 rounded-lg bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span>Community Queries</span>
                    </div>
                    <div className="text-2xl font-black text-[#030508] font-mono-numbers pl-1">
                      {(livePosts.length + communities.length).toLocaleString()}
                    </div>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5 pl-1">
                      ↑ {livePosts.filter(p => p.status === 'APPROVED').length} approved posts
                    </span>
                  </div>
                  <svg className="w-24 h-10 text-[#B49029] overflow-visible" viewBox="0 0 96 40" fill="none">
                    <path d="M0 34 Q 30 30, 60 18 T 96 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold">
                      <div className="w-8 h-8 rounded-lg bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span>Buyer Requirements</span>
                    </div>
                    <div className="text-2xl font-black text-[#030508] font-mono-numbers pl-1">
                      {adminRequirements.length.toLocaleString()}
                    </div>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5 pl-1">
                      ↑ {adminRequirements.filter(r => r.status === 'VERIFIED' || r.status === 'MATCHED').length || adminRequirements.length} verified submissions
                    </span>
                  </div>
                  <svg className="w-24 h-10 text-[#B49029] overflow-visible" viewBox="0 0 96 40" fill="none">
                    <path d="M0 36 Q 30 28, 60 16 T 96 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Metric 4 */}
                <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold">
                      <div className="w-8 h-8 rounded-lg bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <span>Active Audited Projects</span>
                    </div>
                    <div className="text-2xl font-black text-[#030508] font-mono-numbers pl-1">
                      {properties.length.toLocaleString()}
                    </div>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5 pl-1">
                      ↑ {properties.filter(p => Boolean(p.reraRegId)).length || properties.length} TS-RERA verified
                    </span>
                  </div>
                  <svg className="w-24 h-10 text-emerald-600 overflow-visible" viewBox="0 0 96 40" fill="none">
                    <path d="M0 35 Q 25 32, 55 18 T 96 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* 2-Column: Growth Chart & Recent Events */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Area Chart (8 cols) */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#B49029]" />
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                        Platform Activity & Growth
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#B49029] text-white shadow-xs">7D</span>
                      <span className="px-2.5 py-0.5 text-slate-600 hover:text-slate-900 cursor-pointer">30D</span>
                      <span className="px-2.5 py-0.5 text-slate-600 hover:text-slate-900 cursor-pointer">90D</span>
                      <span className="px-2.5 py-0.5 text-slate-600 hover:text-slate-900 cursor-pointer">1Y</span>
                    </div>
                  </div>

                  {/* Area SVG Chart matching Image 2 */}
                  <div className="relative pt-4">
                    <div className="h-56 flex items-stretch gap-4">
                      <div className="flex flex-col justify-between text-[11px] font-mono text-slate-400 text-right pr-2">
                        <span>20K</span>
                        <span>15K</span>
                        <span>10K</span>
                        <span>5K</span>
                        <span>0</span>
                      </div>
                      <div className="flex-1 relative border-b border-l border-slate-200">
                        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="adminChartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#B49029" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#B49029" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 20 160 L 110 145 L 200 120 L 290 125 L 380 95 L 470 90 L 560 30 L 560 200 L 20 200 Z"
                            fill="url(#adminChartGrad)"
                          />
                          <path
                            d="M 20 160 L 110 145 L 200 120 L 290 125 L 380 95 L 470 90 L 560 30"
                            fill="none"
                            stroke="#B49029"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {[
                            { cx: 20, cy: 160 },
                            { cx: 110, cy: 145 },
                            { cx: 200, cy: 120 },
                            { cx: 290, cy: 125 },
                            { cx: 380, cy: 95 },
                            { cx: 470, cy: 90 },
                            { cx: 560, cy: 30 }
                          ].map((pt, i) => (
                            <circle key={i} cx={pt.cx} cy={pt.cy} r="4" fill="#FFFFFF" stroke="#B49029" strokeWidth="2.5" />
                          ))}
                        </svg>
                      </div>
                    </div>
                    <div className="flex justify-between pl-12 pr-4 pt-2 text-[11px] font-semibold text-slate-500">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                </div>

                {/* Right Recent Events (4 cols) */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                          Recent Platform Events
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('AUDIT_LOGS')}
                        className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {auditLogs.length > 0 ? (
                        auditLogs.slice(0, 4).map((log: any, idx: number) => {
                          const actionTitle = log.action ? String(log.action).replace(/_/g, ' ') : 'Platform Activity';
                          const timeAgo = formatRelativeTime(log.created_at);
                          return (
                            <div key={log.id || idx} className="py-2.5 flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-[#FCFBF3] text-[#B49029] border border-[#CEC8A2]/50 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                                {String(log.action).includes('USER') ? <Users className="w-3.5 h-3.5" /> :
                                 String(log.action).includes('VERIF') || String(log.action).includes('AUTH') ? <ShieldCheck className="w-3.5 h-3.5" /> :
                                 String(log.action).includes('REQ') ? <Tag className="w-3.5 h-3.5" /> :
                                 <Activity className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-[#030508] block leading-tight truncate capitalize">
                                  {actionTitle}
                                </span>
                                <span className="text-[11px] text-[#64748B] block truncate">
                                  {log.actor_role || 'ADMIN'} &bull; {log.details || log.target_id || 'System event recorded'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">{timeAgo}</span>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="py-2.5 flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#FCFBF3] text-[#B49029] border border-[#CEC8A2]/50 flex items-center justify-center shrink-0 mt-0.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-[#030508] block leading-tight truncate">
                                Super Admin Session Active
                              </span>
                              <span className="text-[11px] text-[#64748B] block">
                                Live root authorization verified
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">Just now</span>
                          </div>
                          <div className="py-2.5 flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#FCFBF3] text-[#B49029] border border-[#CEC8A2]/50 flex items-center justify-center shrink-0 mt-0.5">
                              <Database className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-[#030508] block leading-tight truncate">
                                Live Database Telemetry Connected
                              </span>
                              <span className="text-[11px] text-[#64748B] block">
                                {serverHealth.dbTarget} &bull; Schema synchronized
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">Live</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Row (Matching Image 2) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">⚡</span>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    Quick Actions
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('USERS_DIRECTORY');
                      setCreateUserModalOpen(true);
                    }}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-center space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Add User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('MODERATION')}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-center space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Verify Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('MODERATION')}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-center space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Moderate Content</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('AUDIT_LOGS')}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-center space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Search className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Audit Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('FINANCE')}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-center space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">View Reports</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('CREDENTIALS')}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-center space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Platform Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* Tab: UNIFIED MODERATION QUEUE */}
      {activeTab === 'MODERATION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  SUPER ADMIN MODERATION QUEUE
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Platform Moderation Queue
                </h2>
                <p className="text-xs text-slate-600 max-w-2xl">
                  Super Admin gatekeeping for developer listings, professional verifications, community posts, and user reviews.
                </p>
              </div>
              <button
                onClick={refreshServerData}
                disabled={loadingData}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {/* Sub-Queue: Project Listings Pending Approval */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>Developer Project Listings Pending Publication ({moderationListings.length})</span>
                </h3>
              </div>
              {moderationListings.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No project listings currently awaiting publication review.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationListings.map(item => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            {item.publication_status || 'PENDING'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500">
                          <span>Owner ID: {item.owner_id}</span>
                          {item.created_at && (
                            <span>Submitted: {new Date(item.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <button
                          onClick={() => handleModerateListing(item.id, 'APPROVED')}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Publish</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt('Enter rejection reason (optional):') || undefined;
                            handleModerateListing(item.id, 'REJECTED', reason);
                          }}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Queue: Professional Profiles Pending Verification */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Professional Profiles Pending Verification ({moderationProfessionals.length})</span>
                </h3>
              </div>
              {moderationProfessionals.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No professional profiles currently awaiting statutory verification.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationProfessionals.map(item => (
                    <div
                      key={item.user_id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.organization || 'Individual Professional'}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            {item.verification_status || 'PENDING'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500">
                          <span>User ID: {item.user_id}</span>
                          <span>Role: {item.professional_role}</span>
                          {item.rera_number && (
                            <span className="font-mono text-amber-800 font-semibold">RERA: {item.rera_number}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <button
                          onClick={() => handleModerateProfessional(item.user_id, 'VERIFIED')}
                          disabled={moderatingItemId === item.user_id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Grant Verified Badge</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt('Enter rejection reason (optional):') || undefined;
                            handleModerateProfessional(item.user_id, 'REJECTED', reason);
                          }}
                          disabled={moderatingItemId === item.user_id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Queue: Community Posts & Questions Pending Approval */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>Community Questions & Discussions Pending Review ({moderationPosts.length})</span>
                </h3>
              </div>
              {moderationPosts.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No community questions or discussions currently awaiting moderation.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationPosts.map(item => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            {item.status || 'PENDING'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                            r/{item.topic}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 text-xs">{item.content}</p>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                          <span>Author: <strong>{item.author_name || item.authorName}</strong> ({item.author_role || item.authorRole})</span>
                          {item.created_at && (
                            <span>Submitted: {new Date(item.created_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          onClick={() => handleModeratePost(item.id, 'APPROVED')}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Publish</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt('Enter rejection reason (optional):') || undefined;
                            handleModeratePost(item.id, 'REJECTED', reason);
                          }}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Queue: Community Hub Creation Requests Pending Approval */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Community Creation Proposals Pending Review ({moderationCommunities.length})</span>
                </h3>
              </div>
              {moderationCommunities.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No community creation proposals currently awaiting review.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationCommunities.map(item => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            {item.status || 'PENDING'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                            {item.visibility || 'PUBLIC'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 text-xs">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                          <span>Created By: <strong>{item.created_by_name || 'Requester'}</strong> ({item.created_by_id})</span>
                          {item.location && <span>Location: {item.location}</span>}
                          {item.created_at && (
                            <span>Requested: {new Date(item.created_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          onClick={() => handleModerateCommunity(item.id, 'APPROVED')}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Community</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt('Enter rejection reason (optional):') || undefined;
                            handleModerateCommunity(item.id, 'REJECTED', reason);
                          }}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Queue: Community Post Deletion Requests Pending Super Admin Approval */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Post Deletion Requests Pending Super Admin Approval ({moderationDeletionRequests.length})</span>
                </h3>
              </div>
              {moderationDeletionRequests.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No post deletion requests currently awaiting Super Admin review.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationDeletionRequests.map(item => (
                    <div
                      key={item.id}
                      className="p-4 bg-rose-50/40 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            Deletion Requested
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                            r/{item.topic}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 text-xs">{item.content}</p>

                        <div className="p-2.5 bg-white border border-rose-200 rounded-lg text-[11px] text-rose-950">
                          <span className="font-bold text-rose-800">Owner Stated Reason: </span>
                          <span>&quot;{item.deletion_reason || item.deletionReason}&quot;</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                          <span>Author: <strong>{item.author_name || item.authorName}</strong> ({item.author_role || item.authorRole})</span>
                          {(item.deletion_requested_at || item.deletionRequestedAt) && (
                            <span>Requested: {new Date(item.deletion_requested_at || item.deletionRequestedAt).toLocaleString()}</span>
                          )}
                          {item.created_at && (
                            <span className="text-slate-400">Created: {new Date(item.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          onClick={() => handleApprovePostDeletion(item.id)}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                          title="Approve deletion and remove post from public feeds"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Deletion</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt('Enter mandatory rejection reason for the author (min 5 characters):');
                            if (reason !== null) {
                              handleRejectPostDeletion(item.id, reason);
                            }
                          }}
                          disabled={moderatingItemId === item.id}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px]"
                          title="Decline deletion request and restore post status"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline Request</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: BUYER PROPERTY REQUIREMENTS */}
      {activeTab === 'REQUIREMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                PLATFORM DEMAND INTELLIGENCE
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                All Buyer Property Requirements ({adminRequirements.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time buyer requirements submitted by authenticated property seekers across Hyderabad micro-markets.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={requirementSearch}
                onChange={e => setRequirementSearch(e.target.value)}
                placeholder="Search by location, budget, or type..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {adminRequirements.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
              No buyer requirements recorded on platform yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-mono uppercase bg-slate-50">
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Budget</th>
                    <th className="py-3 px-3">Buyer Specifications</th>
                    <th className="py-3 px-3">Seeker ID</th>
                    <th className="py-3 px-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminRequirements
                    .filter(r => {
                      if (!requirementSearch.trim()) return true;
                      const q = requirementSearch.toLowerCase();
                      return (
                        (r.propertyType && r.propertyType.toLowerCase().includes(q)) ||
                        (r.location && r.location.toLowerCase().includes(q)) ||
                        (r.budget && r.budget.toLowerCase().includes(q)) ||
                        (r.details && r.details.toLowerCase().includes(q))
                      );
                    })
                    .map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{item.propertyType}</td>
                        <td className="py-3 px-3 text-slate-700">{item.location || '—'}</td>
                        <td className="py-3 px-3 font-mono text-amber-800 font-bold">{item.budget || '—'}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{item.details}</td>
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{item.seekerId}</td>
                        <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: IMMUTABLE AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                <History className="w-3.5 h-3.5 text-amber-600" />
                IMMUTABLE AUDIT TRAIL
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                Platform Security & Governance Audit Logs ({auditLogs.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only record of administrative modifications, role adjustments, wallet movements, and content approvals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              >
                <option value="ALL">All Actions</option>
                <option value="USER_CREATE">USER_CREATE</option>
                <option value="USER_DELETE">USER_DELETE</option>
                <option value="ROLE_CHANGE">ROLE_CHANGE</option>
                <option value="PASSWORD_RESET">PASSWORD_RESET</option>
                <option value="LISTING_SUBMITTED">LISTING_SUBMITTED</option>
                <option value="LEAD_UNLOCK">LEAD_UNLOCK</option>
                <option value="WALLET_ADJUSTMENT">WALLET_ADJUSTMENT</option>
                <option value="REVIEW_MODERATION">REVIEW_MODERATION</option>
                <option value="PROFESSIONAL_VERIFICATION">PROFESSIONAL_VERIFICATION</option>
              </select>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
              No audit log entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-mono uppercase bg-slate-50">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Actor</th>
                    <th className="py-3 px-3">Target</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Details / Context</th>
                    <th className="py-3 px-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs
                    .filter(log => auditActionFilter === 'ALL' || log.action === auditActionFilter)
                    .map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-800">
                            {item.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {item.actor_email} <span className="text-[10px] text-slate-400">({item.actor_role})</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-500">{item.target_id || item.target_email || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                          {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{item.ip_address || 'Internal'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: FINANCE & WALLET LEDGERS */}
      {activeTab === 'FINANCE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  FINANCIAL LEDGER & BILLING AUDIT
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Platform Finance & Wallet Ledger
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track wallet transactions, payment provider readiness, and apply authorized manual balance adjustments.
                </p>
              </div>

              {/* Provider Status Pill */}
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Payment Provider:</span>
                <span className="font-mono font-bold text-amber-800 uppercase">
                  {financeData?.payments || 'NOT_CONFIGURED'}
                </span>
              </div>
            </div>

            {/* Provider Policy Banner */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <span>
                <strong>Launch Gate Notice:</strong> Payment gateway status is <strong>{financeData?.payments || 'NOT_CONFIGURED'}</strong>.
                External payment checkouts and simulated test debits are fail-closed to protect banking security.
                Only server-authorized adjustments and verified wallet top-ups update balances.
              </span>
            </div>

            {/* Manual Wallet Adjustment Form */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Execute Administrative Wallet Adjustment</h3>

              {adjustmentSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{adjustmentSuccessMsg}</span>
                </div>
              )}

              {adjustmentErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{adjustmentErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleFinanceAdjustment} className="grid sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target User ID</label>
                  <input
                    type="text"
                    value={adjustmentUserId}
                    onChange={e => setAdjustmentUserId(e.target.value)}
                    placeholder="e.g. user_1720000000_abc123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adjustment Type</label>
                  <select
                    value={adjustmentDirection}
                    onChange={e => setAdjustmentDirection(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="CREDIT">Credit (+) Wallet Balance</option>
                    <option value="DEBIT">Debit (-) Wallet Balance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={e => setAdjustmentAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Administrative Reason</label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={e => setAdjustmentReason(e.target.value)}
                    placeholder="e.g. Promotional credit grant"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-4 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingAdjustment}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {submittingAdjustment ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying Adjustment...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-400" />
                        <span>Apply Wallet Adjustment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Wallet Ledger Entries Table */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold text-slate-900">
                Recent Wallet Ledger Operations ({financeData?.ledger?.length || 0})
              </h3>
              {!financeData?.ledger || financeData.ledger.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No wallet ledger transactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-mono uppercase bg-slate-50 sticky top-0">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">User ID</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Balance After</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {financeData.ledger.slice(0, 50).map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">{row.user_id}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.entry_type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {row.entry_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold font-mono">₹{row.amount}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">₹{row.balance_after}</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {row.reference_type} ({row.reference_id})
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: COMMUNITY APPROVALS (SUPER ADMIN GATED) */}
      {activeTab === 'COMMUNITIES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  SUPER ADMIN GATED WORKSPACE
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Community Approvals & Governance
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Users propose project or micro-market communities. Super Admin approval is strictly required before any community is made available live for open discussions and review threads.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1.5 rounded-xl border border-amber-200">
                  {communities.filter(c => c.status === 'PENDING_APPROVAL').length} Pending Review
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
                  {communities.filter(c => c.status === 'APPROVED').length} Live Communities
                </span>
              </div>
            </div>
          </div>

          {/* Pending Proposals Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pending Community Proposals Requiring Super Admin Approval</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                {communities.filter(c => c.status === 'PENDING_APPROVAL').length} requests
              </span>
            </div>

            {communities.filter(c => c.status === 'PENDING_APPROVAL').length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {communities.filter(c => c.status === 'PENDING_APPROVAL').map(comm => (
                  <div
                    key={comm.id}
                    className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{comm.name}</h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            PENDING APPROVAL
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                          <span>Category: <strong className="text-slate-700">{comm.category}</strong></span>
                          <span>·</span>
                          <span>Location: <strong className="text-slate-700">{comm.location || 'Western Corridor'}</strong></span>
                          <span>·</span>
                          <span>Proposed by: <strong className="text-slate-700">{comm.createdByName || 'Member'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <button
                          onClick={() => approveCommunity(comm.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve (Make Live)</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Optional rejection reason:') || 'Does not meet platform guidelines';
                            rejectCommunity(comm.id, reason);
                          }}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-200 active:scale-95 transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <strong className="block text-slate-900 font-semibold mb-0.5">Description & Mission:</strong>
                      {comm.description}
                    </div>

                    {comm.rules && (
                      <div className="text-xs text-slate-500 italic">
                        <strong>Proposed Guidelines:</strong> {comm.rules}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-800">No Pending Community Proposals</p>
                <p>All submitted communities have been reviewed and decided.</p>
              </div>
            )}
          </div>

          {/* Live Approved Communities */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Live Active Communities ({communities.filter(c => c.status === 'APPROVED').length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.filter(c => c.status === 'APPROVED').map(comm => (
                <div
                  key={comm.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                        {comm.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {comm.memberCount} members
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{comm.name}</h4>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {comm.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{comm.location || 'Western Corridor'}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Remove community "${comm.name}"?`)) {
                          deleteCommunityHub(comm.id);
                        }
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: ALL ACCOUNTS DIRECTORY */}
      {/* "super admin has access to each and every account" */}
      {activeTab === 'USERS_DIRECTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                All User Accounts Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Super Admin Master Access: inspect, edit, reset passwords, or delete each and every account in the live database.
              </p>
            </div>

            <button
              onClick={() => setCreateUserModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Provision New Account</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search account by name, email, or phone..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="PROPERTY_SEEKER">Property Seeker</option>
              <option value="LAND_OWNER">Landowner / Investor</option>
              <option value="CHANNEL_PARTNER">Channel Partner</option>
              <option value="RESELLER">Reseller</option>
              <option value="AGENT">RERA Agent</option>
              <option value="CONTENT_CREATOR">Real Estate Media</option>
              <option value="DEVELOPER">Developer / MD</option>
              <option value="PROPERTY_ADMIN">Property Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="COMMUNITY_MODERATOR">Community Moderator</option>
            </select>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-4 py-3">Account / Identity</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Posts Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No matching accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isSelf = u.id === currentUser?.id;
                    const isRestricted = Boolean(u.is_restricted || u.account_status === 'RESTRICTED');
                    const isRegularUser = u.role !== 'SUPER_ADMIN' && u.role !== 'DEVELOPER';

                    const canResetPassword =
                      currentUser?.role === 'DEVELOPER' ||
                      (currentUser?.role === 'SUPER_ADMIN' && u.role !== 'DEVELOPER' && (u.role !== 'SUPER_ADMIN' || isSelf));

                    const canRestrict = !isSelf && isRegularUser;

                    const canDelete =
                      !isSelf &&
                      ((currentUser?.role === 'SUPER_ADMIN' && isRegularUser) ||
                        (currentUser?.role === 'DEVELOPER' && u.role !== 'DEVELOPER'));

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 flex items-center gap-3">
                          <img
                            src={getSafeAvatar(u.avatar)}
                            alt={u.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{u.name}</span>
                              {isRestricted && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  RESTRICTED
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                            {u.profession && (
                              <span className="text-[10px] text-amber-800 font-medium block">Profession: {u.profession}</span>
                            )}
                            {u.organization && (
                              <span className="text-[10px] text-slate-400 block">{u.organization}</span>
                            )}
                            {isRestricted && u.restricted_reason && (
                              <span className="text-[10px] text-amber-700 block truncate max-w-xs" title={u.restricted_reason}>
                                Reason: {u.restricted_reason}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            u.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            u.role === 'PROPERTY_ADMIN' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                            u.role === 'DEVELOPER' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            u.role === 'AGENT' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                          {u.phone || 'N/A'}
                        </td>

                        <td className="px-4 py-3.5 font-mono-numbers font-semibold text-slate-900">
                          ₹{(u.wallet_balance || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3.5 text-slate-600">
                          <span className="font-mono font-bold text-slate-900">{u.postCount || 0}</span> questions
                        </td>

                        <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                          {canResetPassword && (
                            <button
                              onClick={() => setResetPasswordUser(u)}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              Reset Pwd
                            </button>
                          )}
                          {canRestrict && (
                            <button
                              onClick={() => handleToggleRestrictUser(u)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                                isRestricted
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                              }`}
                              title={isRestricted ? 'Lift account restriction' : 'Restrict regular user account'}
                            >
                              {isRestricted ? 'Unrestrict' : 'Restrict'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: ALL COMMUNITY POSTS & MODERATION */}
      {/* "and their posts" */}
      {activeTab === 'ALL_POSTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                All User Community Posts & Discussions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Super Admin Access: view every question, audit author identity, pin key announcements, or delete posts.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500">
              {livePosts.length} Total Community Threads
            </div>
          </div>

          {/* Search & Topic Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                placeholder="Search queries by title, question text, or author name..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={postTopicFilter}
              onChange={e => setPostTopicFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ALL">All Topics</option>
              <option value="Construction Updates">Construction Updates</option>
              <option value="Legal & RERA">Legal & RERA</option>
              <option value="Builder Credibility">Builder Credibility</option>
              <option value="Micro-Market Pricing">Micro-Market Pricing</option>
            </select>
          </div>

          {/* Posts List */}
          <div className="space-y-4 pt-2">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No community posts matching criteria.
              </div>
            ) : (
              filteredPosts.map(p => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white space-y-3"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-mono text-slate-400">Post ID: {p.id}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedPostId(expandedPostId === p.id ? null : p.id)}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                    >
                      {expandedPostId === p.id ? 'Collapse Details ▲' : 'Expand Details / Poll ▼'}
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {p.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{p.authorName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                            {p.authorRole.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">{p.status || 'PENDING_APPROVAL'}</span>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/admin/posts/${p.id}/moderation`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'APPROVED' })
                          });
                          if (res.ok) {
                            showToast('Post approved');
                            refreshServerData();
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          const reason = window.prompt('Rejection reason') || '';
                          const res = await fetch(`/api/admin/posts/${p.id}/moderation`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'REJECTED', reason })
                          });
                          if (res.ok) {
                            showToast('Post rejected');
                            refreshServerData();
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleTogglePinPost(p.id, p.isPinned)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          p.isPinned
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={p.isPinned ? 'Unpin thread' : 'Pin thread to top'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeletePost(p.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors"
                        title="Delete this post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded mr-2">
                      {p.topic}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 inline mt-1">{p.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{p.content}</p>
                  </div>

                  {/* Expanded Post Inspection */}
                  {expandedPostId === p.id && (
                    <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="grid sm:grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Author Details</span>
                          <span className="font-bold text-slate-900">{p.authorName}</span>
                          <span className="text-slate-500 text-[11px] block font-mono">Role: {p.authorRole}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Thread Placement</span>
                          <span className="font-bold text-slate-900">Topic: {p.topic}</span>
                          {p.propertyName && <span className="text-slate-500 text-[11px] block">Project: {p.propertyName}</span>}
                        </div>
                      </div>

                      {/* Poll Inspection if present */}
                      {(p as any).pollOptions && (p as any).pollOptions.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono">
                            Poll Voting Statistics:
                          </span>
                          <div className="space-y-1.5">
                            {(p as any).pollOptions.map((opt: any) => {
                              const votes = Number(opt.votes || 0);
                              return (
                                <div key={opt.id} className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                  <span className="font-medium text-slate-800">{opt.text}</span>
                                  <span className="font-mono font-bold text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    {votes} vote{votes === 1 ? '' : 's'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Replies Preview */}
                  {p.replies && p.replies.length > 0 && (
                    <div className="pl-4 border-l-2 border-slate-200 space-y-2 mt-2 pt-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        Replies ({p.replies.length}):
                      </span>
                      {p.replies.map(r => (
                        <div key={r.id} className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-[11px]">{r.authorName}</span>
                            <span className="text-[10px] text-slate-400">{r.authorRole.replace('_', ' ')}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: SUPER ADMIN CREDENTIALS & SECURITY */}
      {/* "and only super admin login credentials will be given by me including password" */}
      {activeTab === 'CREDENTIALS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Super Admin Login Credentials</h3>
                <p className="text-xs text-slate-500">Live server account credentials managed exclusively by you.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Privileged accounts are created only by the server bootstrap command. Email addresses and passwords are not stored in the application bundle.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong>Security Protocol:</strong> In accordance with your directive, only Super Admin login credentials can access the Global Command Center and user database records.
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Update Super Admin Password</h3>
            <p className="text-xs text-slate-500">
              Change the live password for your Super Admin account.
            </p>

            {adminPwdStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                adminPwdStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {adminPwdStatus.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{adminPwdStatus.text}</span>
              </div>
            )}

            {adminPwdStep === 'INPUT' ? (
              <form onSubmit={handleAdminRequestOtp} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={adminCurrentPassword}
                    onChange={e => setAdminCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={adminNewPassword}
                    onChange={e => setAdminNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Super Admin Policy: Code dispatched strictly to designated address: info@propertystudio.org</span>
                </div>

                <button
                  type="submit"
                  disabled={adminRequestingOtp}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{adminRequestingOtp ? 'Dispatching Verification Code...' : 'Request Super Admin OTP'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminConfirmPassword} className="space-y-3 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                  <span className="font-bold block">Super Admin Verification Code Dispatched</span>
                  <p className="text-[11px] text-blue-800">
                    A single-use verification code was sent to <strong className="font-mono">{adminOtpDestination}</strong>. Enter it below to authorize this password change.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">6-Digit Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={adminPwdOtp}
                    onChange={e => setAdminPwdOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-3 text-center text-lg font-mono font-bold tracking-widest border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminPwdStep('INPUT')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={adminSavingPassword || adminPwdOtp.length !== 6}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {adminSavingPassword ? 'Verifying & Updating...' : 'Confirm & Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab: Agent RERA Queue */}
      {activeTab === 'AGENTS_QUEUE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Agent RERA Verification Queue ({agentApplications.length})
            </h3>
            <span className="text-xs text-slate-500">Requires TS-RERA certificate audit</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {agentApplications.map(app => (
              <div key={app.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{app.agentName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="text-slate-500">Agency: {app.agencyName} · Email: {app.email}</div>
                  <div className="font-mono text-slate-700">RERA No: {app.reraNumber} · Submitted: {app.submittedAt}</div>
                </div>

                {app.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => approveAgentApplication(app.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => rejectAgentApplication(app.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Developer Claims */}
      {activeTab === 'DEV_CLAIMS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Developer Project Claim Requests</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {developerClaims.map(claim => (
              <div key={claim.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{claim.developerName}</span>
                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                      {claim.propertyName}
                    </span>
                  </div>
                  <div className="text-slate-600">Claiming Project ID: <code className="font-mono">{claim.propertyId}</code></div>
                  <div className="text-slate-400 font-mono text-[11px]">Submitted: {claim.submittedAt}</div>
                </div>

                {claim.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveDeveloperClaim(claim.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Approve Claim
                    </button>
                    <button
                      onClick={() => rejectDeveloperClaim(claim.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Dynamic Lead Pricing */}
      {activeTab === 'LEAD_PRICING' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900">Dynamic Buyer Lead Pricing Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 block">STANDARD LEADS (₹)</span>
              <input
                type="number"
                value={customRates.STANDARD}
                onChange={e => setCustomRates({ ...customRates, STANDARD: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 block">PREMIUM LEADS (₹)</span>
              <input
                type="number"
                value={customRates.PREMIUM}
                onChange={e => setCustomRates({ ...customRates, PREMIUM: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 block">HNI / ULTRA-LUXURY (₹)</span>
              <input
                type="number"
                value={customRates.HNI}
                onChange={e => setCustomRates({ ...customRates, HNI: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold"
              />
            </div>
          </div>
          <button
            onClick={handleSavePrices}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
          >
            Save Lead Pricing
          </button>
        </div>
      )}

      {/* Tab: Provision PMO */}
      {activeTab === 'PROVISION_PMO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Provision Project Admin (PMO)</h3>
            <p className="text-xs text-slate-500">
              Issue scoped credentials with assignment to a specific audited development.
            </p>

            {pmoStatusMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                pmoStatusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {pmoStatusMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{pmoStatusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PMO Admin Full Name</label>
                <input
                  type="text"
                  value={pmoForm.name}
                  onChange={e => setPmoForm({ ...pmoForm, name: e.target.value })}
                  placeholder="e.g. Rajiv Williams"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official PMO Email</label>
                <input
                  type="email"
                  value={pmoForm.email}
                  onChange={e => setPmoForm({ ...pmoForm, email: e.target.value })}
                  placeholder="e.g. rajiv@thecrown.in"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Project</label>
                <select
                  value={pmoForm.propertyId}
                  onChange={e => setPmoForm({ ...pmoForm, propertyId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
              >
                Provision Account & Issue Credentials
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Active Project Assignments</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {assignments.map(a => {
                const prop = properties.find(p => p.id === a.propertyId);
                return (
                  <div key={a.id} className="py-3">
                    <div className="font-bold text-slate-900">{a.adminUserName}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{a.adminUserEmail}</div>
                    <div className="text-indigo-700 font-semibold mt-1">Project: {prop?.title || a.propertyId}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password for a User */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Reset Account Password</h3>
              <button onClick={() => setResetPasswordUser(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Enter new password for <strong className="text-slate-900">{resetPasswordUser.name}</strong> ({resetPasswordUser.email}).
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <input
                type="password"
                value={newPasswordInput}
                onChange={e => setNewPasswordInput(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
              >
                Apply New Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Provision User Account */}
      {createUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Provision User Account</h3>
              <button onClick={() => setCreateUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">System Role</label>
                <select
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="PROPERTY_SEEKER">Property Seeker (HNI / Buyer)</option>
                  <option value="LAND_OWNER">Landowner / Investor</option>
                  <option value="CHANNEL_PARTNER">Channel Partner</option>
                  <option value="RESELLER">Reseller</option>
                  <option value="AGENT">RERA Agent</option>
                  <option value="CONTENT_CREATOR">Real Estate Media</option>
                  <option value="DEVELOPER">Developer / MD</option>
                  <option value="PROPERTY_ADMIN">Property Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="COMMUNITY_MODERATOR">Community Moderator</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="+91 98000 00000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold mt-2"
              >
                Create Account in Live DB
              </button>
            </form>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

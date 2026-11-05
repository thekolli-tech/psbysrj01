import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LeadTier } from '../../types';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import {
  ALL_PROPERTY_TYPES,
  DEFAULT_NEW_PROPERTY_TYPE,
  displayPropertyType,
  matchesPropertyTypeFilter
} from '../../shared/propertyCategories';
import {
  Lock,
  Unlock,
  Wallet,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
  Trash2,
  X,
  Filter,
  RotateCcw,
  Users,
  Compass,
  Award,
  Eye,
  Star,
  Play,
  FileText,
  Handshake,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building
} from 'lucide-react';

interface LeadMarketplaceProps {
  onOpenWalletModal: () => void;
}

export const LeadMarketplace: React.FC<LeadMarketplaceProps> = ({ onOpenWalletModal }) => {
  const {
    leads,
    unlockLead,
    currentUser,
    leadPrices,
    setActiveView,
    sendMessage,
    createBuyerLead,
    deleteBuyerLead,
    showToast
  } = useApp();

  const [selectedTier, setSelectedTier] = useState<'ALL' | LeadTier>('ALL');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(ALL_PROPERTY_TYPES);
  const [isPostLeadModalOpen, setIsPostLeadModalOpen] = useState(false);

  // New Lead form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('₹4.50 Cr - ₹6.50 Cr');
  const [propertyType, setPropertyType] = useState(DEFAULT_NEW_PROPERTY_TYPE);
  const [microMarket, setMicroMarket] = useState('Neopolis, Kokapet');
  const [tier, setTier] = useState<LeadTier>('PREMIUM');
  const [requirements, setRequirements] = useState('');
  const [consentGranted, setConsentGranted] = useState(false);

  // Mobile number OTP verification state
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phoneCountdown > 0) {
      timer = setTimeout(() => setPhoneCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [phoneCountdown]);

  const handleSendPhoneOtp = async () => {
    if (!phone.trim() || phone.trim().length < 8) {
      showToast('Please enter a valid 10-digit mobile number first.');
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp code');
      }
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      showToast('WhatsApp verification code sent. Check WhatsApp on the mobile number you entered.');
    } catch (err: any) {
      showToast(err.message || 'Error sending WhatsApp code');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpInput.trim() || phoneOtpInput.trim().length < 4) {
      showToast('Please enter the 6-digit verification code.');
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: phoneOtpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code');
      }
      setPhoneVerified(true);
      setPhoneOtpSent(false);
      showToast(`Phone number verified successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to verify OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (selectedTier !== 'ALL' && lead.tier !== selectedTier) return false;
    if (selectedMarket !== 'ALL' && !lead.microMarket.toLowerCase().includes(selectedMarket.toLowerCase())) return false;
    if (!matchesPropertyTypeFilter(lead.propertyType, selectedPropertyType)) return false;
    return true;
  });

  const unlockedCount = leads.filter(l => l.isUnlocked).length;
  const highIntentCount = leads.filter(l => l.tier === 'HNI' || l.tier === 'PREMIUM').length;

  const handlePostLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !requirements.trim()) {
      showToast('Please provide seeker name, phone, and requirements.');
      return;
    }
    if (!consentGranted) {
      showToast('Consent is required before contact details can be shared with professionals.');
      return;
    }

    const price = leadPrices[tier] || 750;

    createBuyerLead({
      seekerName: name.trim(),
      seekerPhone: phone.trim(),
      seekerEmail: email.trim(),
      consentGranted: true,
      consentVersion: '2026-10-15',
      consentPurpose: 'Share my contact details with eligible verified professionals solely to respond to this property enquiry.',
      budget,
      budgetMinLakhs: 450,
      microMarket,
      propertyType,
      timeframe: 'Immediate (Within 15 Days)',
      requirements: requirements.trim(),
      tier,
      priceCredits: price
    });

    setIsPostLeadModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setRequirements('');
    setConsentGranted(false);
    setPhoneVerified(false);
    setPhoneOtpSent(false);
    setPhoneOtpInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sm:space-y-8 bg-[#F7F9FD]">
      {/* 
        ====================================================================
        HERO BANNER (MATCHING IMAGE 5)
        ====================================================================
      */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        {/* Architectural Image Background Accent */}
        <div
          className="absolute inset-y-0 right-1/4 w-1/3 opacity-20 bg-cover bg-center rounded-3xl pointer-events-none hidden md:block"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80')"
          }}
        />

        <div className="max-w-xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF5E4] text-[#92580c] border border-[#E99A18]/30 text-xs font-bold uppercase tracking-wider font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E99A18]" />
            100% ENCRYPTED DATA-MASKING FRAMEWORK
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] font-display tracking-tight">
            Buyer Lead Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            Verified, high-intent buyers for residential, luxury and commercial projects.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Leads
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              Data Masked
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Spam Free
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Compass className="w-3.5 h-3.5 text-purple-600" />
              Real Intent
            </span>
          </div>
        </div>

        {/* Floating Credit Balance Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-lg space-y-3 relative z-10 shrink-0 w-full sm:w-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Your Credit Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="text-3xl font-black text-[#14213D] font-mono-numbers">
            ₹{currentUser.walletBalance.toLocaleString('en-IN')}
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="w-full py-2.5 px-4 bg-[#0B1530] hover:bg-[#101C38] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>Recharge Credits</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPostLeadModalOpen(true)}
              className="w-full py-2.5 px-4 bg-[#E99A18] hover:bg-[#d68a12] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Buyer Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        ====================================================================
        FILTER BAR (MATCHING IMAGE 5)
        ====================================================================
      */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filter Leads
          </span>

          <button
            type="button"
            onClick={() => setSelectedTier('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTier === 'ALL'
                ? 'bg-[#0B1530] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Leads
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('STANDARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTier === 'STANDARD'
                ? 'bg-[#0B1530] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Standard (₹{leadPrices.STANDARD})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('PREMIUM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTier === 'PREMIUM'
                ? 'bg-[#0B1530] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Premium (₹{leadPrices.PREMIUM})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier('HNI')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTier === 'HNI'
                ? 'bg-[#0B1530] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-600" />
            <span>HNI (₹{leadPrices.HNI})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Property Type</span>
            <PropertyCategorySelect
              ariaLabel="Property type"
              includeAll
              value={selectedPropertyType}
              storedValues={leads.map(lead => lead.propertyType)}
              onChange={setSelectedPropertyType}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Micro-Market</span>
            <select
              value={selectedMarket}
              onChange={e => setSelectedMarket(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Micro-Markets</option>
              <option value="Neopolis">Neopolis</option>
              <option value="Kokapet">Kokapet</option>
              <option value="Financial District">Financial District</option>
              <option value="Tellapur">Tellapur</option>
              <option value="Mokila">Mokila</option>
            </select>
          </div>
        </div>
      </div>

      {/* 
        ====================================================================
        4 METRIC CARDS WITH SPARKLINES (MATCHING IMAGE 5)
        ====================================================================
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Leads</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers pl-1">
              {filteredLeads.length}
            </div>
          </div>
          <svg className="w-20 h-8 text-amber-400 overflow-visible" viewBox="0 0 80 32" fill="none">
            <path d="M0 26 Q 20 25, 40 18 T 80 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500">High-Intent Leads</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers pl-1">
              {highIntentCount}
            </div>
          </div>
          <svg className="w-20 h-8 text-emerald-500 overflow-visible" viewBox="0 0 80 32" fill="none">
            <path d="M0 28 Q 25 24, 50 14 T 80 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Viewed / Unlocked</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers pl-1">
              {unlockedCount}
            </div>
          </div>
          <svg className="w-20 h-8 text-purple-400 overflow-visible" viewBox="0 0 80 32" fill="none">
            <path d="M0 25 Q 30 22, 55 12 T 80 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Conversion Rate</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers pl-1">
              —
            </div>
          </div>
          <svg className="w-20 h-8 text-blue-400 overflow-visible" viewBox="0 0 80 32" fill="none">
            <path d="M0 24 Q 25 20, 50 15 T 80 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* 
        ====================================================================
        LEADS CONTENT / EMPTY STATE (MATCHING IMAGE 5)
        ====================================================================
      */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
          {/* Isometric Building + Magnifier Illustration */}
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center border border-amber-200/80 shadow-xs">
            <div className="relative">
              <Building className="w-10 h-10 text-amber-500" />
              <Compass className="w-6 h-6 text-amber-700 absolute -bottom-1 -right-1" />
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-xl font-extrabold text-[#14213D] font-display">
              No Buyer Leads Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Start by posting a verified buyer requirement to attract relevant property matches.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsPostLeadModalOpen(true)}
              className="px-5 py-2.5 bg-[#E99A18] hover:bg-[#d68a12] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Buyer Lead</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('how-it-works');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-slate-600 fill-current" />
              <span>How It Works</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeads.map(lead => {
            const cost = leadPrices[lead.tier] || lead.priceCredits;
            const isUnlocked = lead.isUnlocked;

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  isUnlocked
                    ? 'border-emerald-300 ring-1 ring-emerald-400/30'
                    : lead.tier === 'HNI'
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                        lead.tier === 'HNI'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : lead.tier === 'PREMIUM'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {lead.tier}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {lead.timeframe}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isUnlocked ? lead.seekerName : 'Verified Buyer Seeker'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{lead.microMarket}</span>
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Budget:</span>
                      <span className="font-bold text-slate-900 font-mono-numbers">{lead.budget}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Asset:</span>
                      <span className="font-semibold text-slate-800">{displayPropertyType(lead.propertyType)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {lead.requirements}
                  </p>

                  {isUnlocked && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{lead.seekerPhone}</span>
                      </div>
                      {lead.seekerEmail && (
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono truncate">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>{lead.seekerEmail}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Cost</span>
                    <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                      {cost} Credits
                    </span>
                  </div>

                  {isUnlocked ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => unlockLead(lead.id)}
                      className="px-3.5 py-1.5 bg-[#0B1530] hover:bg-[#101C38] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Unlock (₹{cost})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 
        ====================================================================
        HOW IT WORKS 3-STEP TIMELINE BAR (MATCHING IMAGE 5)
        ====================================================================
      */}
      <div id="how-it-works" className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">How It Works</span>
        </div>

        <div className="w-px h-6 bg-slate-200 hidden md:block" />

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-xs">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <span className="font-bold text-slate-900 block leading-tight">Post Requirement</span>
              <span className="text-[11px] text-slate-500">Share buyer needs</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <span className="font-bold text-slate-900 block leading-tight">Get Verified Leads</span>
              <span className="text-[11px] text-slate-500">Access qualified, masked leads</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <span className="font-bold text-slate-900 block leading-tight">Connect & Convert</span>
              <span className="text-[11px] text-slate-500">Engage and close deals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Lead Modal (Preserved with all business logic) */}
      {isPostLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Post New Buyer Lead</h3>
                <p className="text-xs text-slate-500">Submit a qualified buyer enquiry</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPostLeadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostLead} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Seeker Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Anand Mahindra"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98490 12345"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seeker@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Budget Range</label>
                  <input
                    type="text"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Micro-Market</label>
                  <input
                    type="text"
                    value={microMarket}
                    onChange={e => setMicroMarket(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Requirements *</label>
                <textarea
                  required
                  rows={3}
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  placeholder="Specify configurations, square footage, amenities, timeline..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lead-consent"
                  checked={consentGranted}
                  onChange={e => setConsentGranted(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="lead-consent" className="text-[11px] text-slate-600 cursor-pointer">
                  I confirm the buyer has consented to be contacted by verified professionals.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPostLeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-sm"
                >
                  Post Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
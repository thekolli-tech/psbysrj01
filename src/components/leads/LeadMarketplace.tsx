import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LeadTier } from '../../types';
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
  RotateCcw
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
  const [isPostLeadModalOpen, setIsPostLeadModalOpen] = useState(false);

  // New Lead form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('₹4.50 Cr - ₹6.50 Cr');
  const [propertyType, setPropertyType] = useState('Luxury High-Rise');
  const [microMarket, setMicroMarket] = useState('Neopolis, Kokapet');
  const [tier, setTier] = useState<LeadTier>('PREMIUM');
  const [requirements, setRequirements] = useState('');

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
        throw new Error(data.error || 'Failed to send SMS OTP');
      }
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      showToast(`Property Studio SMS verification code sent to ${phone.trim()}`);
    } catch (err: any) {
      showToast(err.message || 'Error sending SMS OTP');
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
    return true;
  });

  const handlePostLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !requirements.trim()) {
      showToast('Please provide seeker name, phone, and requirements.');
      return;
    }

    const price = leadPrices[tier] || 750;

    createBuyerLead({
      seekerName: name.trim(),
      seekerPhone: phone.trim(),
      seekerEmail: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
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
    setPhoneVerified(false);
    setPhoneOtpSent(false);
    setPhoneOtpInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Marketplace Executive Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            100% Encrypted Data-Masking Framework
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Sanitized Buyer Lead Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Directly connect with qualified high-intent seekers looking for luxury apartments, sky villas, and commercial floors. PII is sanitized behind the paywall card with absolute immunity from spam calls.
          </p>
        </div>

        {/* Wallet Balance & Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={() => setIsPostLeadModalOpen(true)}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Buyer Lead</span>
          </button>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-start sm:items-end justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Your Credit Balance
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers my-0.5">
              ₹{currentUser.walletBalance.toLocaleString('en-IN')}
            </div>
            <button
              onClick={onOpenWalletModal}
              className="mt-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Wallet className="w-3 h-3 text-amber-400" />
              <span>Recharge Credits</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Tier:</span>
          </span>
          {(['ALL', 'STANDARD', 'PREMIUM', 'HNI'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTier === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All Leads' : `${t} (₹${leadPrices[t as LeadTier]})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Micro-Market:</span>
          <select
            value={selectedMarket}
            onChange={e => setSelectedMarket(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All Micro-Markets</option>
            <option value="Neopolis">Neopolis</option>
            <option value="Kokapet">Kokapet</option>
            <option value="Financial District">Financial District</option>
            <option value="Tellapur">Tellapur</option>
            <option value="Jubilee Hills">Jubilee Hills</option>
          </select>
        </div>
      </div>

      {/* Leads Grid or Empty State */}
      {filteredLeads.length > 0 ? (
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
                  {/* Header: Tier & Status */}
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
                      {lead.tier} LEADER
                    </span>

                    {isUnlocked ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                        <Unlock className="w-3.5 h-3.5" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Sanitized PII
                      </span>
                    )}
                  </div>

                  {/* Seeker Name & Budget */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {lead.seekerName}
                    </h3>
                    <div className="text-sm font-black text-emerald-700 font-mono-numbers mt-0.5">
                      Budget: {lead.budget}
                    </div>
                  </div>

                  {/* Micro-market & Property Type */}
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="text-slate-400">Micro-Market:</span>{' '}
                      <strong className="text-slate-800">{lead.microMarket}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Asset:</span>{' '}
                      <strong className="text-slate-800">{lead.propertyType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Timeline:</span>{' '}
                      <strong className="text-slate-800">{lead.timeframe}</strong>
                    </div>
                  </div>

                  {/* Specific Requirements excerpt */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed italic">
                    "{lead.requirements}"
                  </div>

                  {/* If Unlocked: Show Actual Contact Info */}
                  {isUnlocked && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                      <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Verified Dossier Coordinates:</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-mono font-semibold">{lead.seekerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-mono">{lead.seekerEmail}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {lead.createdAt}
                  </span>

                  <div className="flex items-center gap-2">
                    {currentUser.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => deleteBuyerLead(lead.id)}
                        className="p-1.5 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete lead record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {isUnlocked ? (
                      <button
                        onClick={() => {
                          sendMessage(`Hello, I am contacting you regarding your verified inquiry on Property Studio for ${lead.propertyType} in ${lead.microMarket}.`, 'user_seeker_ananya', lead.id);
                          setActiveView('CHAT');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Direct Chat</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => unlockLead(lead.id)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Unlock Lead (₹{cost})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              No Buyer Leads Uploaded Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All buyer leads are published dynamically with 100% encrypted data-masking. Click below to post a qualified buyer inquiry.
            </p>
          </div>
          <button
            onClick={() => setIsPostLeadModalOpen(true)}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Post New Buyer Lead</span>
          </button>
        </div>
      )}

      {/* Modal: Post New Buyer Lead */}
      {isPostLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display">
                  Post New Sanitized Buyer Lead
                </h3>
              </div>
              <button
                onClick={() => setIsPostLeadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostLead} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Buyer / Seeker Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Suresh Singhania"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  * Name will automatically be masked as "S*** S***" on the marketplace card.
                </span>
              </div>

              {/* Phone Verification Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">
                    Contact Mobile Number <span className="text-[11px] font-normal text-slate-500">(Optional verification)</span>
                  </label>
                  {phoneVerified && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mobile Verified
                    </span>
                  )}
                </div>

                {!phoneVerified ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={phone}
                        disabled={phoneOtpSent}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. +91 98490 12345"
                        className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                        required
                      />
                      {!phoneOtpSent ? (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={phoneLoading || phone.trim().length < 8}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer"
                        >
                          {phoneLoading ? 'Sending...' : 'Verify Mobile'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setPhoneOtpSent(false); setPhoneOtpInput(''); }}
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-[11px] transition-colors"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {phoneOtpSent && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-900">
                            Enter 6-Digit Property Studio SMS Code sent to {phone}
                          </span>
                          {phoneCountdown > 0 ? (
                            <span className="text-slate-500 font-mono">Resend: {phoneCountdown}s</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              className="text-amber-800 hover:underline font-bold flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Resend</span>
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg leading-relaxed">
                          Enter the 6-digit verification code sent strictly from <strong>Property Studio</strong> to your mobile phone to verify this lead.
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={phoneOtpInput}
                            onChange={e => setPhoneOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="• • • • • •"
                            className="flex-1 px-3 py-2 border border-amber-300 rounded-xl text-center font-mono font-bold tracking-widest text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyPhoneOtp}
                            disabled={phoneLoading || phoneOtpInput.length < 4}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition-colors"
                          >
                            {phoneLoading ? 'Checking...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-mono text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">{phone}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-sans font-bold">
                        OTP Verified
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPhoneVerified(false); setPhoneOtpSent(false); }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Change Phone
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="suresh@techfirm.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Budget</label>
                  <input
                    type="text"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="e.g. ₹5.00 Cr - ₹7.50 Cr"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lead Tier</label>
                  <select
                    value={tier}
                    onChange={e => setTier(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="STANDARD">Standard (₹300)</option>
                    <option value="PREMIUM">Premium (₹750)</option>
                    <option value="HNI">HNI (₹2,000)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Property Type</label>
                  <select
                    value={propertyType}
                    onChange={e => setPropertyType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Luxury High-Rise</option>
                    <option>Sky Villa</option>
                    <option>Penthouse</option>
                    <option>Gated Villa Community</option>
                    <option>Grade-A Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Micro-Market</label>
                  <select
                    value={microMarket}
                    onChange={e => setMicroMarket(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Neopolis, Kokapet</option>
                    <option>Kokapet</option>
                    <option>Financial District</option>
                    <option>Tellapur</option>
                    <option>Jubilee Hills</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specific Buyer Criteria & Notes</label>
                <textarea
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  rows={3}
                  placeholder="e.g. Looking for East-facing 4BHK with 3 covered car parks close to ORR..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostLeadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Publish Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

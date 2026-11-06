import React, { useState, useRef } from 'react';
import { BrandLogo } from './BrandLogo';
import { ANIME_AVATARS, getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { prepareAvatarUpload, validateAvatarFile } from '../../lib/avatarUpload';
import { readApiResponse } from '../../lib/apiResponse';
import {
  X,
  User,
  Mail,
  CheckCircle2,
  Lock,
  MapPin,
  Smartphone,
  Building2,
  Briefcase,
  UploadCloud,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export interface GoogleProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: string;
    name?: string;
    email: string;
    avatar?: string;
    role?: string;
    phone?: string;
    organization?: string;
    profession?: string;
    company?: string;
    interests?: string[];
  };
  googlePicture?: string;
  onCompleted: (updatedUser: any) => void;
}

const AVAILABLE_INTERESTS = [
  'Kokapet & Neopolis',
  'High-Rise Construction',
  'Legal Due Diligence & RERA',
  'Rental Yield & ROI',
  'Luxury Villas & Communities',
  'Architecture & Vaastu',
  'Interior Design & Renovation',
  'Land & Plotting Guidelines',
  'Price Trends & Market Updates',
  'Home Loans & Taxation'
] as const;

const ROLE_OPTIONS = [
  { value: 'PROPERTY_SEEKER', label: 'Property Seeker (HNI / Investor / Buyer)', desc: 'Explore premium developments, seek investment opportunities, and connect with verified professionals.' },
  { value: 'DEVELOPER', label: 'Developer', desc: 'Showcase statutory RERA-registered developments, receive matched buyer enquiries, and manage project compliance.' },
  { value: 'LANDOWNER', label: 'Landowner', desc: 'Monetise land parcels, explore joint development partnerships, and evaluate market feasibility.' },
  { value: 'CHANNEL_PARTNER', label: 'Channel Partner', desc: 'Promote verified luxury and commercial inventory to prospective buyers.' },
  { value: 'RESELLER', label: 'Reseller', desc: 'Connect buyers and sellers of premium resale properties in high-demand micro-markets.' },
  { value: 'RERA_AGENT', label: 'RERA Agent', desc: 'Provide authorized statutory real estate advisory and client representation.' },
  { value: 'REAL_ESTATE_MEDIA', label: 'Real Estate Media', desc: 'Publish architectural photography, videography, construction walkthroughs, and market reports.' }
] as const;

export const GoogleProfileCompletionModal: React.FC<GoogleProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  user,
  googlePicture,
  onCompleted
}) => {
  if (!isOpen) return null;

  // Initial values prefilled from Google authentication
  const initialGoogleAvatar = googlePicture || user.avatar || ANIME_AVATARS[0].url;

  const [name, setName] = useState(user.name || '');
  const [email] = useState(user.email || '');
  const [role, setRole] = useState<string>(
    user.role && user.role !== 'SUPER_ADMIN' ? user.role : 'PROPERTY_SEEKER'
  );
  const [phone, setPhone] = useState(user.phone || '');
  const [organization, setOrganization] = useState(user.organization || '');
  const [profession, setProfession] = useState(user.profession || '');
  const [company, setCompany] = useState(user.company || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    user.interests && user.interests.length > 0
      ? user.interests
      : ['Kokapet & Neopolis', 'Legal Due Diligence & RERA']
  );
  const [selectedAvatar, setSelectedAvatar] = useState<string>(initialGoogleAvatar);
  const [customAvatarUploaded, setCustomAvatarUploaded] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSeeker = role === 'PROPERTY_SEEKER';

  const toggleInterest = (topic: string) => {
    setSelectedInterests(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleCustomPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid image file.');
      return;
    }

    setErrorMsg(null);
    setAvatarUploading(true);
    try {
      const preparedDataUrl = await prepareAvatarUpload(file);
      setCustomAvatarUploaded(preparedDataUrl);
      setSelectedAvatar(preparedDataUrl);
    } catch {
      setErrorMsg('Failed to process image. Please try a different photo.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);

    // Validation
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!isSeeker && (!profession || !profession.trim())) {
      setErrorMsg(`Please enter your profession to register as a ${ROLE_OPTIONS.find(r => r.value === role)?.label || 'professional'}.`);
      return;
    }

    if (selectedInterests.length === 0) {
      setErrorMsg('Please select at least one interest or topic from the list below.');
      return;
    }

    if (!selectedAvatar || !selectedAvatar.trim()) {
      setErrorMsg('Please choose a profile avatar before continuing.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/google/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          name: cleanName,
          role,
          phone: phone.trim() || undefined,
          organization: organization.trim() || undefined,
          profession: profession.trim() || undefined,
          company: company.trim() || undefined,
          interests: selectedInterests,
          avatar: selectedAvatar,
          townCity: 'Hyderabad, Telangana, India'
        })
      });

      const result = await readApiResponse(response, 'Failed to complete profile.');
      if (!result.ok || !result.data?.user) {
        throw new Error(result.error || 'Failed to complete profile.');
      }

      onCompleted(result.data.user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save profile. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-profile-completion-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 border border-slate-200"
        style={{
          boxShadow: '0 25px 50px -12px rgba(24, 42, 62, 0.25)'
        }}
      >
        {/* Modal Top Header with Brand Identity */}
        <div
          className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #182A3E 0%, #203750 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
              <BrandLogo variant="compact" size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  Google Verified Identity
                </span>
              </div>
              <h1
                id="google-profile-completion-title"
                className="text-lg sm:text-xl font-bold font-display text-white tracking-tight leading-snug"
              >
                Complete Your Property Studio Profile
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Profile Completion"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress & Guidance Banner */}
        <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-100/60 flex items-center justify-between text-xs text-amber-900">
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Tell us a little about yourself to personalise your Property Studio experience.
          </p>
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
            Final Step
          </span>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold">Unable to proceed: </strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Section A: Basic Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Basic Information
              </h2>
              <span className="text-[11px] text-slate-400">Authenticated via Google</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Verified & Read-only)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    readOnly
                    className="w-full pl-9 pr-24 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed select-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Account Type */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Account Type / Role <span className="text-red-500">*</span>
            </h2>

            <div>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                {ROLE_OPTIONS.find(r => r.value === role)?.desc}
              </p>
            </div>
          </div>

          {/* Section C: Contact & Organization */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Contact & Organization Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Mobile <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +91 98490 12345"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. Swamy Reddy Infrastructure"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section D: Professional Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Professional Information
              </h2>
              {!isSeeker ? (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Required for {ROLE_OPTIONS.find(r => r.value === role)?.label?.split(' ')[0]}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-normal">Optional for Seekers</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profession {!isSeeker && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profession}
                    onChange={e => setProfession(e.target.value)}
                    required={!isSeeker}
                    placeholder={isSeeker ? 'e.g. IT Executive, Investor, Physician (Optional)' : 'e.g. Principal Architect, Managing Broker'}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Practice <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Apex Realty Ventures"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section E: Interests & Topics */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                5. Interests & Topics <span className="text-red-500">*</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                {selectedInterests.length} selected
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Select key real estate markets, architectural styles, and regulatory topics you follow:
            </p>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map(topic => {
                const isSelected = selectedInterests.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleInterest(topic)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'text-white border shadow-xs'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: '#182A3E',
                            borderColor: '#B49029',
                            boxShadow: '0 2px 4px rgba(24, 42, 62, 0.15)'
                          }
                        : {}
                    }
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    )}
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section F: Choose Profile Avatar — REQUIRED */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  6. Choose Your Profile Avatar <span className="text-red-500">*</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select your Google photo, choose a character avatar, or upload your own.
                </p>
              </div>
            </div>

            {/* Prominent Circular Preview Banner */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={getSafeAvatar(selectedAvatar)}
                    alt="Active Avatar Preview"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 shadow-sm bg-white"
                    style={{ borderColor: '#B49029' }}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Current Avatar Selection
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {selectedAvatar === googlePicture
                      ? 'Google Account Photo'
                      : customAvatarUploaded && selectedAvatar === customAvatarUploaded
                        ? 'Custom Uploaded Photo'
                        : 'Character Avatar Preset'}
                  </span>
                </div>
              </div>

              {googlePicture && selectedAvatar !== googlePicture && (
                <button
                  type="button"
                  onClick={() => setSelectedAvatar(googlePicture)}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Use Google Photo
                </button>
              )}
            </div>

            {/* Avatar Grid & Custom Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Available Avatars & Presets
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleCustomPhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  Upload Custom Photo
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 pt-1">
                {/* 1. Google Account Photo Option (if provided) */}
                {googlePicture && (
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(googlePicture)}
                    title="Google Profile Photo"
                    className={`relative p-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === googlePicture
                        ? 'ring-2 ring-amber-500 bg-amber-50/80 shadow-xs'
                        : 'hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <img
                      src={googlePicture}
                      alt="Google Photo"
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-white"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                    <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[50px]">
                      Google
                    </span>
                    {selectedAvatar === googlePicture && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                )}

                {/* 2. Custom Uploaded Photo Tile (if uploaded) */}
                {customAvatarUploaded && (
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(customAvatarUploaded)}
                    title="Custom Uploaded Photo"
                    className={`relative p-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === customAvatarUploaded
                        ? 'ring-2 ring-amber-500 bg-amber-50/80 shadow-xs'
                        : 'hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <img
                      src={customAvatarUploaded}
                      alt="Custom Photo"
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-white"
                    />
                    <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[50px]">
                      Custom
                    </span>
                    {selectedAvatar === customAvatarUploaded && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                )}

                {/* 3. Curated Presets from ANIME_AVATARS */}
                {ANIME_AVATARS.map(preset => {
                  const isSelected = selectedAvatar === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset.url)}
                      title={`${preset.name} - ${preset.roleHint}`}
                      className={`relative p-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-amber-500 bg-amber-50/80 shadow-xs'
                          : 'hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-white"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                      <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[50px]">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section G: Location (Fixed Territory) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                7. Operating Territory
              </h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Fixed Territory
              </span>
            </div>

            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value="Hyderabad, Telangana, India"
                disabled
                readOnly
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed select-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Property Studio operates exclusively across Greater Hyderabad and the Telangana prime corridor.
            </p>
          </div>
        </form>

        {/* Modal Sticky Footer CTA */}
        <div
          className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ backgroundColor: '#FAFCFD' }}
        >
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero passwords needed • Identity securely verified by Google</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#182A3E',
                borderColor: '#B49029',
                borderWidth: '1px'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete Profile & Continue</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

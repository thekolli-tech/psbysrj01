import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { isPropertySeeker } from '../../shared/policy';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  User,
  ShieldCheck,
  Building2,
  HardHat,
  Briefcase,
  Search,
  LayoutDashboard,
  MapPin,
  KeyRound,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Wallet,
  Phone,
  Mail,
  ShieldAlert,
  Camera,
  Trash2,
  Loader2
} from 'lucide-react';

interface ProfileControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileControlPanelModal: React.FC<ProfileControlPanelModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout, setActiveView, walletBalance, showToast, isLoggedIn, refreshSession } = useApp();
  const [townCity, setTownCity] = useState(currentUser.townCity || '');
  const [profession, setProfession] = useState(currentUser.profession || '');
  const [company, setCompany] = useState((currentUser as any).company || '');
  const [interests, setInterests] = useState<string[]>(
    Array.isArray((currentUser as any).interests) ? (currentUser as any).interests : []
  );
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTownCity(currentUser.townCity || '');
    setProfession(currentUser.profession || '');
    setCompany((currentUser as any).company || '');
    setInterests(Array.isArray((currentUser as any).interests) ? (currentUser as any).interests : []);
  }, [isOpen, currentUser.townCity, currentUser.profession, (currentUser as any).company, (currentUser as any).interests]);

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'CHANGE_PASSWORD'>('PROFILE');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [passwordStep, setPasswordStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [otpDestination, setOtpDestination] = useState<string | null>(null);
  const [requestingOtp, setRequestingOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  /**
   * Downscales and compresses user-selected images client-side before upload.
   * Keeps avatars sharp (up to 512x512) while reducing network payload and database storage.
   * Leaves animated GIFs intact to preserve multi-frame animation.
   */
  const prepareAvatarUpload = (file: File): Promise<string> => {
    if (file.type === 'image/gif') {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          try {
            const MAX_DIM = 512;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (!width || !height) {
              resolve(rawDataUrl);
              return;
            }

            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const compressed = canvas.toDataURL(outputType, 0.88);
            resolve(compressed);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setAvatarError(null);

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image file must be 2MB or smaller.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Only JPEG, PNG, WebP, and GIF formats are allowed. SVG is disallowed for security.');
      return;
    }

    setAvatarUploading(true);
    try {
      const dataUrl = await prepareAvatarUpload(file);

      const res = await fetch('/api/me/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: dataUrl })
      });

      let errorMsg = '';
      try {
        const data = await res.json();
        if (!res.ok) {
          errorMsg = data?.error || 'Failed to upload profile photo';
        }
      } catch {
        const text = await res.text().catch(() => '');
        errorMsg = text || 'Failed to upload profile photo';
      }

      if (!res.ok) {
        if (res.status === 413 || /entity too large/i.test(errorMsg)) {
          throw new Error('Image file must be 2MB or smaller.');
        }
        throw new Error(errorMsg || 'Failed to upload profile photo');
      }

      await refreshSession();
      showToast('Profile photo updated');
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const res = await fetch('/api/me/avatar', {
        method: 'DELETE'
      });
      let errorMsg = '';
      try {
        const data = await res.json();
        if (!res.ok) {
          errorMsg = data?.error || 'Failed to remove profile photo';
        }
      } catch {
        const text = await res.text().catch(() => '');
        errorMsg = text || 'Failed to remove profile photo';
      }
      if (!res.ok) throw new Error(errorMsg || 'Failed to remove profile photo');

      await refreshSession();
      showToast('Profile photo removed');
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to remove photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!isOpen) return null;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setProfileSaving(true);
    try {
      const response = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ townCity, profession, company, interests })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Profile was not saved.');
      await refreshSession();
      setSuccessMsg('Town/City and profession were saved.');
      showToast('Profile saved');
    } catch (err: any) {
      setErrorMsg(err.message || 'Profile was not saved.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Please enter your current password');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await fetch('/api/auth/request-password-change-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request verification code');
      }
      setOtpDestination(data.destination || 'your designated email address');
      setPasswordStep('OTP');
      showToast('Security verification code dispatched.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error requesting verification code');
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!passwordOtp || passwordOtp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          otp: passwordOtp.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccessMsg(`Password successfully updated! Confirmation email dispatched to ${otpDestination || 'your registered email'}.`);
      showToast('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOtp('');
      setPasswordStep('INPUT');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN': return <ShieldCheck className="w-5 h-5 text-amber-500" />;
      case 'PROPERTY_ADMIN': return <Building2 className="w-5 h-5 text-indigo-500" />;
      case 'DEVELOPER': return <HardHat className="w-5 h-5 text-blue-500" />;
      case 'AGENT': return <Briefcase className="w-5 h-5 text-emerald-500" />;
      case 'LAND_OWNER': return <MapPin className="w-5 h-5 text-rose-500" />;
      default: return <Search className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              {getRoleIcon()}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                <span>Profile Control Panel</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white truncate">{currentUser.name}</h2>
              <span className="text-xs text-slate-400 block truncate">{currentUser.email}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-3 gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('PROFILE'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'text-slate-900 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Account Overview
          </button>
          <button
            onClick={() => { setActiveTab('CHANGE_PASSWORD'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'CHANGE_PASSWORD'
                ? 'text-slate-900 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {activeTab === 'PROFILE' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Profile Card & Avatar Management */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative group flex-shrink-0">
                    <img
                      src={getSafeAvatar(currentUser.avatar)}
                      alt={currentUser.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-300 shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight">{currentUser.name}</span>
                      <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                        {currentUser.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{currentUser.email}</span>
                    </div>
                    {currentUser.phone && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{currentUser.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Actions */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{currentUser.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  {Boolean(currentUser.avatar) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto">JPG, PNG, WebP or GIF (Max 2MB)</span>
                </div>

                {avatarError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}
              </div>

              {isLoggedIn && (
                <form onSubmit={handleProfileSave} className="space-y-3">
                  <div>
                    <label htmlFor="profile-town-city" className="block text-xs font-bold text-slate-700 mb-1">Town/City</label>
                    <input
                      id="profile-town-city"
                      value={townCity}
                      onChange={e => setTownCity(e.target.value)}
                      maxLength={80}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-profession" className="block text-xs font-bold text-slate-700 mb-1">Profession</label>
                    <input
                      id="profile-profession"
                      value={profession}
                      onChange={e => setProfession(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Buyer, Investor, Architect, Consultant"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Profession is a description. It does not change your account role.</p>
                  </div>
                  <div>
                    <label htmlFor="profile-company" className="block text-xs font-bold text-slate-700 mb-1">Company / Organization</label>
                    <input
                      id="profile-company"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Kolli Ventures / Independent"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">My Topics & Interests (Quora Style)</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-xl max-h-32 overflow-y-auto">
                      {[
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
                      ].map(topic => {
                        const isSelected = interests.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setInterests(prev =>
                                isSelected ? prev.filter(t => t !== topic) : [...prev, topic]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>{topic}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {errorMsg && activeTab === 'PROFILE' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{errorMsg}</div>
                  )}
                  {successMsg && activeTab === 'PROFILE' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">{successMsg}</div>
                  )}
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-60"
                  >
                    {profileSaving ? 'Saving…' : 'Save profile'}
                  </button>
                </form>
              )}

              {/* Account Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Wallet Balance</span>
                  <div className="text-base font-black font-mono-numbers text-slate-900 mt-0.5">
                    ₹{walletBalance.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Security Status</span>
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Live Database Verified</span>
                  </div>
                </div>
              </div>

              {/* Super Admin Quick Link */}
              {currentUser.role === 'SUPER_ADMIN' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Super Admin Platform Governance</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    You hold master command authority over every registered account and every community post on the live server.
                  </p>
                  <button
                    onClick={() => {
                      setActiveView('ADMIN');
                      onClose();
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Launch Super Admin Command Center →</span>
                  </button>
                </div>
              )}

              {isPropertySeeker(currentUser.role) && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActiveView('DASHBOARD');
                      onClose();
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Member Dashboard →</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'CHANGE_PASSWORD' && (
            <div className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {passwordStep === 'INPUT' ? (
                <form onSubmit={handleRequestPasswordOtp} className="space-y-4">
                  <div className="text-xs text-slate-600">
                    Update your account password in the live server database. Your new credentials will take effect immediately upon security code verification.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Mandatory Security Policy: Changing your password requires verifying a single-use code sent to your designated email.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={requestingOtp}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>{requestingOtp ? 'Dispatching Verification Code...' : 'Request Security Code (OTP)'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordChange} className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Security Code Dispatched</span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      We sent a 6-digit verification code to <strong className="text-blue-950 font-mono">{otpDestination}</strong>. Enter it below to authorize this password change.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={passwordOtp}
                      onChange={e => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3.5 py-3 text-center text-lg font-mono font-bold tracking-widest border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordStep('INPUT')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || passwordOtp.length !== 6}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-slate-950" />
                      <span>{loading ? 'Verifying & Updating...' : 'Confirm & Update Password'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

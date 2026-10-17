import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { readApiResponse } from '../../lib/apiResponse';
import { Avatar, AvatarPicker } from './Avatar';
import {
  User,
  ShieldCheck,
  Building2,
  HardHat,
  Briefcase,
  Search,
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
  ShieldAlert
} from 'lucide-react';

interface ProfileControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileControlPanelModal: React.FC<ProfileControlPanelModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout, setActiveView, walletBalance, showToast, replaceSession } = useApp();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'CHANGE_PASSWORD'>('PROFILE');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [nextPhone, setNextPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);

  if (!isOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Please enter your current password');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccessMsg('Your password has been successfully updated in the live database!');
      showToast('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAvatar = async (avatarId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const response = await fetch('/api/me/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ avatarId })
      });
      const result = await readApiResponse(response);
      const user = result.data?.user as Parameters<typeof replaceSession>[0] | undefined;
      if (!result.ok || !user) throw new Error(result.error || 'The avatar could not be saved.');
      replaceSession(user);
      setSuccessMsg('Avatar updated. Your role and verification were not changed.');
    } catch (err: any) {
      setErrorMsg(err.message || 'The avatar could not be saved.');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneCode = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!nextPhone.trim().startsWith('+')) {
      setErrorMsg('Enter the new mobile number in international format, starting with + and the country code.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ phone: nextPhone.trim() })
      });
      const result = await readApiResponse(response);
      if (!result.ok || result.data?.success !== true) {
        throw new Error(result.error || 'WhatsApp verification is not available.');
      }
      setPhoneCodeSent(true);
      showToast('If this number can be verified, a WhatsApp code has been sent.');
    } catch (err: any) {
      setErrorMsg(err.message || 'WhatsApp verification is not available.');
    } finally {
      setLoading(false);
    }
  };

  const changePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ phone: nextPhone.trim(), otp: phoneCode.trim() })
      });
      const result = await readApiResponse(response);
      const user = result.data?.user as Parameters<typeof replaceSession>[0] | undefined;
      if (!result.ok || !user) throw new Error(result.error || 'The mobile number could not be changed.');
      replaceSession(user);
      setNextPhone('');
      setPhoneCode('');
      setPhoneCodeSent(false);
      setSuccessMsg('Mobile number updated. The previous number is no longer verified for this account.');
    } catch (err: any) {
      setErrorMsg(err.message || 'The mobile number could not be changed.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              {getRoleIcon()}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                <span>Profile Control Panel</span>
              </div>
              <h2 className="text-lg font-bold font-display text-white">{currentUser.name}</h2>
              <span className="text-xs text-slate-400 block">{currentUser.email}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => { setActiveTab('PROFILE'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'PROFILE'
                ? 'text-slate-900 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Account Overview
          </button>
          <button
            onClick={() => { setActiveTab('CHANGE_PASSWORD'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
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
        <div className="p-6">
          {activeTab === 'PROFILE' && (
            <div className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
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
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                <Avatar id={currentUser.avatar} label={currentUser.name} className="w-14 h-14 rounded-2xl border border-slate-300 shadow-sm" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{currentUser.name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUser.email}</span>
                  </div>
                  {currentUser.phone && (
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentUser.phone}</span>
                    </div>
                  )}
                </div>
              </div>

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

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Studio avatar</span>
                <AvatarPicker value={currentUser.avatar} onChange={saveAvatar} />
              </div>

              <form onSubmit={changePhone} className="space-y-2 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Change mobile number</span>
                <p className="text-[11px] text-slate-500">A new WhatsApp code replaces the previous verification. The number is saved only after the server accepts the code.</p>
                <input
                  type="tel"
                  value={nextPhone}
                  onChange={e => { setNextPhone(e.target.value); setPhoneCodeSent(false); }}
                  placeholder="+14155552671"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                {phoneCodeSent && (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={phoneCode}
                    onChange={e => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="WhatsApp code"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono tracking-widest"
                  />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={sendPhoneCode} disabled={loading} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
                    Send WhatsApp code
                  </button>
                  {phoneCodeSent && (
                    <button type="submit" disabled={loading || phoneCode.length < 4} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-50">
                      Save number
                    </button>
                  )}
                </div>
              </form>

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
            </div>
          )}

          {activeTab === 'CHANGE_PASSWORD' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="text-xs text-slate-600">
                Update your account password in the live server database. Your new credentials will take effect immediately.
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
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

              {/* Current Password */}
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

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
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

              {/* Confirm New Password */}
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
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>
            </form>
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

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { isPropertySeeker, postLoginDestination } from '../../shared/policy';
import { isPhoneOtpRequired } from '../../shared/authConfig';
import { readApiResponse } from '../../lib/apiResponse';
import { BrandLogo } from './BrandLogo';
import {
  LogIn,
  LogOut,
  X,
  ShieldCheck,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  CheckCircle2,
  RotateCcw,
  Smartphone,
  MapPin,
  Check,
  Lock
} from 'lucide-react';

const DEFAULT_SIGNUP_LOCATION = 'Hyderabad, Telangana, India';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    isLoggedIn,
    login,
    logout,
    setActiveView,
    showToast
  } = useApp();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<'PROPERTY_SEEKER' | 'LANDOWNER' | 'CHANNEL_PARTNER' | 'RESELLER' | 'RERA_AGENT' | 'REAL_ESTATE_MEDIA'>('PROPERTY_SEEKER');
  const [phoneInput, setPhoneInput] = useState('');
  const [organizationInput, setOrganizationInput] = useState('');
  const [locationInput, setLocationInput] = useState(DEFAULT_SIGNUP_LOCATION);
  const [professionInput, setProfessionInput] = useState('Buyer');
  const [companyInput, setCompanyInput] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Kokapet & Neopolis',
    'Legal Due Diligence & RERA'
  ]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email OTP verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Mobile Phone OTP verification state (configurable via REQUIRE_PHONE_OTP)
  const [phoneOtpRequired, setPhoneOtpRequired] = useState(isPhoneOtpRequired());
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (typeof data?.phoneOtpRequired === 'boolean') {
          setPhoneOtpRequired(data.phoneOtpRequired);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phoneCountdown > 0) {
      timer = setTimeout(() => setPhoneCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [phoneCountdown]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);
    submitting.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput
        })
      });

      const result = await readApiResponse(response, 'Invalid credentials. Please verify your email and password.');
      const user = result.data?.user as { name?: string; role?: string } | undefined;
      if (!result.ok || !user) {
        throw new Error(result.error || 'Authentication failed');
      }

      login(user as Parameters<typeof login>[0]);
      showToast(`Welcome back, ${user.name}!`);

      if (isPropertySeeker(user.role)) {
        setActiveView('DASHBOARD');
      } else {
        setActiveView(postLoginDestination(user.role));
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (submitting.current) return;
    if (!phoneInput.trim() || phoneInput.trim().length < 8) {
      setErrorMsg('Please enter a valid mobile number first.');
      return;
    }
    setErrorMsg(null);
    submitting.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ phone: phoneInput.trim() })
      });
      const result = await readApiResponse(res);
      if (!result.ok || result.data?.success !== true) {
        setPhoneOtpSent(false);
        throw new Error(result.error || 'WhatsApp verification was not sent.');
      }
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      showToast('WhatsApp verification code sent. Check WhatsApp on the mobile number you entered.');
    } catch (err: any) {
      setErrorMsg(err.message || 'WhatsApp verification was not sent.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);

    if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
      setErrorMsg('Please enter your full name, valid email, and password first.');
      return;
    }

    if (passwordInput.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    // Role-specific validation:
    // If phone OTP is required, Property Seeker requires phone number.
    if (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER') {
      if (!phoneInput.trim() || phoneInput.trim().length < 8) {
        setErrorMsg('Mobile phone number is required for Property Seeker registration.');
        return;
      }
    }

    submitting.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      });
      const result = await readApiResponse(res);
      if (!result.ok || result.data?.success !== true) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      setOtpSent(true);
      setCountdown(60);
      showToast('Property Studio verification code sent. Check the inbox for that address.');

      if (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER' && phoneInput.trim()) {
        const phoneRes = await fetch('/api/auth/send-phone-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ phone: phoneInput.trim() })
        });
        const phoneResult = await readApiResponse(phoneRes);
        if (!phoneResult.ok || phoneResult.data?.success !== true) {
          setPhoneOtpSent(false);
          setErrorMsg(phoneResult.error || 'WhatsApp verification was not sent. No account was created.');
        } else {
          setPhoneOtpSent(true);
          setPhoneCountdown(60);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);

    if (!otpInput.trim() || otpInput.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit email verification code received.');
      return;
    }

    // Property Seeker requires Phone OTP verification only when configured
    if (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER') {
      if (!phoneOtpInput.trim() || phoneOtpInput.trim().length < 4) {
        setErrorMsg('Please enter the 6-digit WhatsApp code received on your phone.');
        return;
      }
    }

    submitting.current = true;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
          role: roleInput,
          phone: phoneInput.trim(),
          organization: organizationInput.trim(),
          profession: professionInput.trim() || undefined,
          company: companyInput.trim() || undefined,
          interests: selectedInterests,
          townCity: DEFAULT_SIGNUP_LOCATION,
          location: DEFAULT_SIGNUP_LOCATION,
          otp: otpInput.trim(),
          phoneOtp: (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER') ? phoneOtpInput.trim() : undefined
        })
      });

      const result = await readApiResponse(response);
      const user = result.data?.user as Parameters<typeof login>[0] | undefined;
      if (!result.ok || !user) {
        throw new Error(result.error || 'Registration failed');
      }

      login(user);
      showToast(`Account successfully registered and verified! Welcome, ${user.name}`);
      onClose();
      setLocationInput(DEFAULT_SIGNUP_LOCATION);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the OTP code.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-12 h-9 sm:w-14 sm:h-10 rounded-lg sm:rounded-xl bg-white border border-white/20 flex items-center justify-center px-1 shrink-0">
              <BrandLogo variant="compact" size="sm" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-display">
                {isLoggedIn ? 'Account Session' : mode === 'LOGIN' ? 'Portal Sign In' : 'Create Account'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {isLoggedIn ? `Active as ${currentUser.name}` : 'Live server database authentication'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-3.5 text-xs overflow-y-auto overscroll-contain flex-1">
          {isLoggedIn ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
                  }}
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{currentUser.name}</h4>
                  <span className="text-[10px] font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-semibold inline-block mt-0.5">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">{currentUser.email}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                Wallet Balance: <strong className="font-mono text-slate-900">₹{currentUser.walletBalance.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {currentUser.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => {
                      setActiveView('ADMIN');
                      onClose();
                    }}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                  >
                    Admin Console
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Auth Form */
            <div className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setMode('LOGIN'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('REGISTER'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Register Account
                </button>
              </div>

              {mode === 'LOGIN' ? (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Email</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="e.g. admin@propertystudio.org"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
                  </button>
                </form>
              ) : !otpSent ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-2.5">
                  <div className="bg-amber-50/90 py-1.5 px-2.5 rounded-lg border border-amber-200/90 text-[11px] text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Email OTP verification is mandatory for verified account registration.</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">Full Name</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder="e.g. Suresh Chandra"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">Email Address</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="e.g. suresh@example.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">Role / Account Type</label>
                    <select
                      value={roleInput}
                      onChange={e => setRoleInput(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="PROPERTY_SEEKER">Property Seeker (HNI / Investor / Buyer)</option>
                      <option value="LANDOWNER">Landowner</option>
                      <option value="CHANNEL_PARTNER">Channel Partner</option>
                      <option value="RESELLER">Reseller</option>
                      <option value="RERA_AGENT">RERA Agent</option>
                      <option value="REAL_ESTATE_MEDIA">Real Estate Media</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">
                        Contact Mobile {phoneOtpRequired && roleInput === 'PROPERTY_SEEKER' ? (
                          <span className="text-red-500 font-bold text-[10px]">* Required</span>
                        ) : (
                          <span className="font-normal text-[10px] text-slate-400">(Optional)</span>
                        )}
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={e => setPhoneInput(e.target.value)}
                        placeholder="e.g. +91 98490 12345"
                        required={phoneOtpRequired && roleInput === 'PROPERTY_SEEKER'}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">
                        {roleInput === 'LANDOWNER' ? 'Land Parcel' : roleInput === 'RERA_AGENT' || roleInput === 'CHANNEL_PARTNER' ? 'Agency / RERA' : 'Organization'} <span className="font-normal text-[10px] text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={organizationInput}
                        onChange={e => setOrganizationInput(e.target.value)}
                        placeholder={roleInput === 'LANDOWNER' ? 'Land description' : roleInput === 'RERA_AGENT' ? 'RERA registration number' : 'Firm or organization'}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="signup-profession" className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">
                        Profession
                      </label>
                      <select
                        id="signup-profession"
                        value={professionInput}
                        onChange={e => setProfessionInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      >
                        <option value="Buyer">Buyer</option>
                        <option value="Seller">Seller</option>
                        <option value="Real Estate Agent">Real Estate Agent</option>
                        <option value="Builder / Developer">Builder / Developer</option>
                        <option value="Investor">Investor</option>
                        <option value="Architect">Architect</option>
                        <option value="Interior Designer">Interior Designer</option>
                        <option value="Property Consultant">Property Consultant</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="signup-company" className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">
                        Company / Practice <span className="font-normal text-[10px] text-slate-400">(Optional)</span>
                      </label>
                      <input
                        id="signup-company"
                        type="text"
                        value={companyInput}
                        onChange={e => setCompanyInput(e.target.value)}
                        placeholder="e.g. Studio Arc / Firm"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 text-[11px] sm:text-xs">
                        Interests & Topics
                      </label>
                      <span className="text-[10px] text-slate-400">Personalizes your Community Q&A</span>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-50 border border-slate-200/80 rounded-lg max-h-24 sm:max-h-28 overflow-y-auto">
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
                        const isSelected = selectedInterests.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setSelectedInterests(prev =>
                                isSelected ? prev.filter(t => t !== topic) : [...prev, topic]
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="signup-location" className="block font-bold text-slate-700 text-[11px] sm:text-xs">
                        Location (City & State)
                      </label>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200/60 inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                        Fixed Territory
                      </span>
                    </div>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-location"
                        name="location"
                        type="text"
                        value={DEFAULT_SIGNUP_LOCATION}
                        readOnly
                        aria-readonly="true"
                        tabIndex={-1}
                        className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg sm:rounded-xl bg-slate-100/90 text-slate-800 font-semibold cursor-not-allowed select-none focus:outline-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                      Platform location is fixed to Hyderabad, Telangana, India.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">Choose Password</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 text-center leading-tight">
                    By proceeding, you agree to our{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveView('TERMS');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-amber-700 hover:underline font-bold cursor-pointer"
                    >
                      Terms & Conditions
                    </button>{' '}
                    and acknowledge our{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveView('PRIVACY');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-amber-700 hover:underline font-bold cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    .
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span>{loading ? 'Sending Code...' : 'Send Email Verification Code'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-blue-600" />
                        Property Studio OTP Sent
                      </span>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setErrorMsg(null); }}
                        className="text-[11px] text-blue-700 hover:underline font-bold"
                      >
                        Change Email
                      </button>
                    </div>
                    <p className="text-blue-800 text-[11px] leading-relaxed">
                      A real-time 6-digit verification code has been dispatched from <strong>Property Studio</strong> to <strong className="font-mono text-blue-950">{emailInput}</strong>. Please check your inbox for the email from Property Studio and enter the code below to complete registration.
                    </p>
                    <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location:
                      </span>
                      <span className="font-semibold text-slate-800">{DEFAULT_SIGNUP_LOCATION} (Fixed Territory)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Enter 6-Digit Email Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center text-lg tracking-[0.3em] font-mono font-bold px-3.5 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                      autoFocus
                    />
                  </div>

                  {phoneOtpRequired && roleInput === 'PROPERTY_SEEKER' && (
                    <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-amber-600" />
                          Property Seeker WhatsApp Verification
                        </span>
                        {phoneCountdown > 0 ? (
                          <span className="text-[10px] text-amber-700 font-mono">Resend WhatsApp code in {phoneCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            className="text-[11px] text-amber-800 hover:underline font-bold"
                          >
                            {phoneOtpSent ? 'Resend WhatsApp code' : 'Send WhatsApp code'}
                          </button>
                        )}
                      </div>
                      <p className="text-amber-900 text-[11px] leading-relaxed">
                        {phoneOtpSent
                          ? 'WhatsApp code sent to the mobile number you entered. The account is created only after both codes are verified.'
                          : 'A WhatsApp verification code is required. It is sent only when WhatsApp accepts it.'}
                      </p>
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          Enter 6-Digit WhatsApp Code <span className="text-red-500">* Required</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={phoneOtpInput}
                          onChange={e => setPhoneOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="• • • • • •"
                          className="w-full text-center text-md tracking-[0.25em] font-mono font-bold px-3 py-2.5 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Didn't receive the email from Property Studio?</span>
                    {countdown > 0 ? (
                      <span className="font-mono text-slate-400">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        className="text-amber-700 hover:underline font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend Email OTP</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpInput.length < 4 || (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER' && phoneOtpInput.length < 4)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{loading ? 'Verifying...' : (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER') ? 'Verify Email & Mobile to Register' : 'Verify Email & Create Account'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Official Secretariat: info@propertystudio.org</span>
          <button
            onClick={onClose}
            className="font-bold text-slate-800 hover:text-slate-950"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

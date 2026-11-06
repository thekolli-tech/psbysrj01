import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { isPropertySeeker, postLoginDestination } from '../../shared/policy';
import { isPhoneOtpRequired } from '../../shared/authConfig';
import { readApiResponse } from '../../lib/apiResponse';
import { BrandLogo } from './BrandLogo';
import { ANIME_AVATARS, getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { prepareAvatarUpload, validateAvatarFile } from '../../lib/avatarUpload';
import {
  LogIn,
  LogOut,
  X,
  ShieldCheck,
  User,
  KeyRound,
  ArrowRight,
  ArrowLeft,
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
  Lock,
  MessageSquare,
  Sparkles,
  Camera,
  Trash2,
  UploadCloud,
  TrendingUp
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
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<'PROPERTY_SEEKER' | 'LANDOWNER' | 'CHANNEL_PARTNER' | 'RESELLER' | 'RERA_AGENT' | 'REAL_ESTATE_MEDIA'>('PROPERTY_SEEKER');
  const [phoneInput, setPhoneInput] = useState('');
  const [organizationInput, setOrganizationInput] = useState('');
  const [locationInput, setLocationInput] = useState(DEFAULT_SIGNUP_LOCATION);
  const [professionInput, setProfessionInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Kokapet & Neopolis',
    'Legal Due Diligence & RERA'
  ]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Google OAuth 2.0 & GIS Authentication State
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');

  // Email OTP verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Mobile Phone OTP verification state (configurable via REQUIRE_PHONE_OTP)
  const [phoneOtpRequired, setPhoneOtpRequired] = useState(isPhoneOtpRequired());
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  // Registration Avatar Selection state (step 3 after OTP verification)
  const [avatarStep, setAvatarStep] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(ANIME_AVATARS[0].url);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Forgot Password State
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (typeof data?.phoneOtpRequired === 'boolean') {
          setPhoneOtpRequired(data.phoneOtpRequired);
        }
        if (data?.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(() => {});

    // Check URL for OAuth redirect errors
    try {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get('auth_error');
      if (authErr) {
        setErrorMsg(decodeURIComponent(authErr));
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('auth_error');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const gAccounts = (window as any).google?.accounts;
    if (gAccounts?.id) {
      try {
        gAccounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (response.credential) {
              await completeGoogleAuth({ credential: response.credential });
            }
          },
          cancel_on_tap_outside: true
        });
      } catch (e) {
        console.warn('[Google Auth] GIS ID initialize warning:', e);
      }
    }
  }, [googleClientId]);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetCountdown > 0) {
      timer = setTimeout(() => setResetCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetCountdown]);

  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);
    setResetSuccessMsg(null);
    const targetEmail = (resetEmail || emailInput).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch password reset code.');
      setResetOtpSent(true);
      setResetCountdown(60);
      setResetEmail(targetEmail);
      showToast('Password reset code sent! Check your inbox.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password reset code.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);
    setResetSuccessMsg(null);
    const targetEmail = resetEmail.trim();
    const otp = resetOtpInput.trim();
    if (!targetEmail || !otp || !newPasswordInput) {
      setErrorMsg('Please fill in all fields (Email, Verification Code, New Password).');
      return;
    }
    if (newPasswordInput.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setErrorMsg('Passwords do not match. Please verify your new password.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          otp,
          newPassword: newPasswordInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setResetSuccessMsg('Password reset successfully! You can now sign in with your new password.');
      showToast('Password reset successfully! Please sign in.');
      setEmailInput(targetEmail);
      setPasswordInput('');
      setResetOtpSent(false);
      setResetOtpInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setTimeout(() => {
        setForgotPasswordMode(false);
        setResetSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

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

  const completeGoogleAuth = async (payload: { credential?: string; code?: string; redirectUri?: string }) => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await readApiResponse(response, 'Google authentication failed.');
      const user = result.data?.user as { name?: string; role?: string } | undefined;
      if (!result.ok || !user) {
        throw new Error(result.error || 'Google authentication failed.');
      }

      login(user as Parameters<typeof login>[0]);
      showToast(result.data?.isNewUser ? `Welcome to Property Studio, ${user.name || 'User'}!` : `Welcome back, ${user.name || 'User'}!`);

      if (isPropertySeeker(user.role)) {
        setActiveView('DASHBOARD');
      } else {
        setActiveView(postLoginDestination(user.role));
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setErrorMsg(null);
    setGoogleLoading(true);

    const gAccounts = (window as any).google?.accounts;

    // Fast path: Google Identity Services Code Client popup
    if (gAccounts?.oauth2 && googleClientId) {
      try {
        const client = gAccounts.oauth2.initCodeClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: async (resp: any) => {
            if (resp.error) {
              setGoogleLoading(false);
              if (resp.error === 'access_denied') {
                setErrorMsg('Google sign-in was cancelled.');
              } else {
                setErrorMsg(`Google sign-in error: ${resp.error}`);
              }
              return;
            }
            if (resp.code) {
              await completeGoogleAuth({ code: resp.code, redirectUri: 'postmessage' });
            } else {
              setGoogleLoading(false);
            }
          },
          error_callback: (err: any) => {
            setGoogleLoading(false);
            if (err?.type !== 'popup_closed') {
              setErrorMsg('Google sign-in was interrupted. Please try again.');
            }
          }
        });
        client.requestCode();
        return;
      } catch (err) {
        console.warn('GIS Code Client failed, falling back to popup flow:', err);
      }
    }

    // Direct popup flow fallback to server-side OAuth 2.0 authorize
    try {
      const width = 500;
      const height = 620;
      const left = Math.max(0, Math.round((window.innerWidth - width) / 2 + window.screenX));
      const top = Math.max(0, Math.round((window.innerHeight - height) / 2 + window.screenY));

      const popup = window.open(
        '/api/auth/google/authorize?mode=redirect',
        'property_studio_google_auth',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no,resizable=yes`
      );

      if (!popup) {
        // Fallback to top-level redirect if popup was blocked
        window.location.href = '/api/auth/google/authorize?mode=redirect';
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          clearInterval(pollTimer);
          const user = event.data.user;
          const isNewUser = event.data.isNewUser;
          login(user as Parameters<typeof login>[0]);
          showToast(isNewUser ? `Welcome to Property Studio, ${user.name || 'User'}!` : `Welcome back, ${user.name || 'User'}!`);
          if (isPropertySeeker(user.role)) {
            setActiveView('DASHBOARD');
          } else {
            setActiveView(postLoginDestination(user.role));
          }
          setGoogleLoading(false);
          onClose();
        } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          clearInterval(pollTimer);
          setGoogleLoading(false);
          setErrorMsg(event.data.error || 'Google authentication failed.');
        }
      };

      window.addEventListener('message', handleMessage);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          setGoogleLoading(false);
        }
      }, 500);
    } catch (err: any) {
      setGoogleLoading(false);
      setErrorMsg(err?.message || 'Could not initiate Google sign-in.');
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

    if (!professionInput.trim()) {
      setErrorMsg('Please enter your profession.');
      return;
    }

    if (passwordInput.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg('Passwords do not match. Please ensure both passwords match.');
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

  const handleVerifyOtpAndProceedToAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);

    if (!professionInput.trim()) {
      setErrorMsg('Please enter your profession.');
      return;
    }

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
      const emailRes = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), otp: otpInput.trim() })
      });
      const emailResult = await readApiResponse(emailRes);
      if (!emailResult.ok || emailResult.data?.verified !== true) {
        throw new Error(emailResult.error || 'Invalid or expired email verification code');
      }

      if (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER') {
        const phoneRes = await fetch('/api/auth/verify-phone-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ phone: phoneInput.trim(), otp: phoneOtpInput.trim() })
        });
        const phoneResult = await readApiResponse(phoneRes);
        if (!phoneResult.ok || phoneResult.data?.verified !== true) {
          throw new Error(phoneResult.error || 'Invalid or expired WhatsApp verification code');
        }
      }

      setAvatarStep(true);
      showToast('Email verified! Choose your profile avatar.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the OTP code.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleCustomAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setErrorMsg(null);

    const check = validateAvatarFile(file);
    if (!check.valid) {
      setErrorMsg(check.error || 'Invalid image file');
      return;
    }

    setAvatarUploading(true);
    try {
      const dataUrl = await prepareAvatarUpload(file);
      setCustomAvatar(dataUrl);
      setSelectedAvatar(dataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process selected image');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCompleteRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);

    if (!professionInput.trim()) {
      setErrorMsg('Please enter your profession.');
      return;
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
          profession: professionInput.trim(),
          company: companyInput.trim() || undefined,
          interests: selectedInterests,
          townCity: DEFAULT_SIGNUP_LOCATION,
          location: DEFAULT_SIGNUP_LOCATION,
          otp: otpInput.trim(),
          phoneOtp: (phoneOtpRequired && roleInput === 'PROPERTY_SEEKER') ? phoneOtpInput.trim() : undefined,
          avatar: selectedAvatar
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
      setAvatarStep(false);
      setCustomAvatar(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E8E4D8] w-full max-w-md md:max-w-3xl lg:max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col md:flex-row overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Left Side: Desktop Premium Brand & Architecture Showcase (Matching Image 3) */}
        <div className="hidden md:flex md:w-5/12 lg:w-5/12 flex-col justify-between p-6 lg:p-8 bg-gradient-to-br from-[#182A3E] via-[#182A3E] to-[#030508] text-white relative overflow-hidden shrink-0 border-r border-[#E8E4D8]/20">
          {/* Architectural Skyline Image Overlay */}
          <div
            className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80')"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030508] via-[#182A3E]/80 to-transparent pointer-events-none" />

          {/* Top Branding */}
          <div className="space-y-4 relative z-10">
            <div className="w-16 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-lg">
              <BrandLogo variant="compact" size="sm" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black font-display text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
                Access your Property Studio account and continue your real estate journey.
              </p>
            </div>
          </div>

          {/* 3 Gold Feature Badges (Matching Image 3) */}
          <div className="space-y-3 my-6 relative z-10">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-[#B49029]/20 text-[#B49029] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Verified Projects</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-[#B49029]/20 text-[#B49029] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Market Insights</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-[#B49029]/20 text-[#B49029] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Community & Q&A</span>
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-400 font-mono tracking-wider relative z-10">
            Official Secretariat: info@propertystudio.org
          </div>
        </div>

        {/* Right Side: Authentication Controls & Active Form */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#E8E4D8] flex items-center justify-between bg-[#182A3E] text-white shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="md:hidden w-12 h-9 rounded-lg bg-white border border-white/20 flex items-center justify-center px-1 shrink-0">
                <BrandLogo variant="compact" size="sm" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white font-display">
                  {isLoggedIn ? 'Account Session' : forgotPasswordMode ? 'Reset Password' : mode === 'LOGIN' ? 'Portal Sign In' : avatarStep ? 'Choose Profile Avatar' : 'Create Account'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {isLoggedIn ? `Active as ${currentUser.name}` : forgotPasswordMode ? 'Verify email OTP to set new password' : avatarStep ? 'Select 2D character avatar or upload your photo' : 'Live server database authentication'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
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
              {!avatarStep && !forgotPasswordMode && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setMode('LOGIN'); setErrorMsg(null); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('REGISTER'); setErrorMsg(null); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Register Account
                  </button>
                </div>
              )}

              {forgotPasswordMode ? (
                /* Forgot Password Form */
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{resetOtpSent ? 'Verify Code & Set Password' : 'Password Recovery'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordMode(false);
                        setErrorMsg(null);
                        setResetSuccessMsg(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>

                  {resetSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{resetSuccessMsg}</span>
                    </div>
                  )}

                  {!resetOtpSent ? (
                    <form onSubmit={handleSendResetOtp} className="space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Enter your registered email address. We will send a secure 6-digit verification code to reset your password.
                      </p>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Registered Account Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            placeholder="e.g. user@example.com"
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                            required
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !resetEmail.trim()}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{loading ? 'Sending Code...' : 'Send Reset Code'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-3">
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                        <span className="truncate">Sent to: <strong>{resetEmail}</strong></span>
                        <button
                          type="button"
                          onClick={() => setResetOtpSent(false)}
                          className="text-[11px] font-bold text-amber-800 hover:underline shrink-0 ml-2 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-slate-700">6-Digit Verification Code</label>
                          <button
                            type="button"
                            disabled={resetCountdown > 0 || loading}
                            onClick={() => handleSendResetOtp()}
                            className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {resetCountdown > 0 ? `Resend code in ${resetCountdown}s` : 'Resend Code'}
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={resetOtpInput}
                          onChange={e => setResetOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full px-3.5 py-2.5 text-sm tracking-widest font-mono text-center border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">New Password (min 8 chars)</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPasswordInput}
                            onChange={e => setNewPasswordInput(e.target.value)}
                            placeholder="At least 8 characters"
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmNewPassword ? 'text' : 'password'}
                            value={confirmNewPasswordInput}
                            onChange={e => setConfirmNewPasswordInput(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || resetOtpInput.length < 6 || newPasswordInput.length < 8}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{loading ? 'Resetting Password...' : 'Verify Code & Reset Password'}</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : mode === 'LOGIN' ? (
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(true);
                          setResetEmail(emailInput.trim());
                          setErrorMsg(null);
                          setResetSuccessMsg(null);
                        }}
                        className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
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

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="keep-signed-in"
                      defaultChecked
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="keep-signed-in" className="text-xs text-slate-600 cursor-pointer">
                      Keep me signed in
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Social Logins Divider (Matching Image 3) */}
                  <div className="relative my-4 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative px-3 bg-white text-[11px] text-slate-400 font-medium">
                      or continue with
                    </span>
                  </div>

                  {/* Single Google Social Button (LinkedIn & Microsoft Removed) */}
                  <div className="w-full">
                    <button
                      type="button"
                      disabled={loading || googleLoading}
                      onClick={handleGoogleSignIn}
                      className="w-full py-2.5 px-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-2.5 transition-colors cursor-pointer text-xs font-semibold text-slate-700 shadow-2xs disabled:opacity-60 disabled:cursor-wait"
                      title="Sign in with Google"
                      aria-label="Sign in with Google"
                    >
                      {googleLoading ? (
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                          <span>Connecting to Google...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  </div>
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
                        Profession *
                      </label>
                      <input
                        id="signup-profession"
                        name="profession"
                        type="text"
                        required
                        value={professionInput}
                        onChange={e => setProfessionInput(e.target.value)}
                        placeholder="Enter your profession"
                        autoComplete="off"
                        maxLength={80}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">
                        Choose Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={e => setPasswordInput(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-9"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] sm:text-xs mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPasswordInput}
                          onChange={e => setConfirmPasswordInput(e.target.value)}
                          placeholder="Re-enter your password"
                          className={`w-full px-3 py-2 text-xs border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 pr-9 ${
                            confirmPasswordInput && confirmPasswordInput !== passwordInput
                              ? 'border-red-400 focus:ring-red-400 bg-red-50/40 text-red-900'
                              : 'border-slate-300 focus:ring-amber-500'
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {confirmPasswordInput && confirmPasswordInput !== passwordInput && (
                        <span className="text-[10px] text-red-500 mt-0.5 block font-medium">Passwords do not match</span>
                      )}
                    </div>
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
                    className="w-full py-2.5 sm:py-3 bg-[#B49029] hover:bg-[#A99137] text-white rounded-lg sm:rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                  >
                    <span>{loading ? 'Sending Code...' : 'Create Verified Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : !avatarStep ? (
                <form onSubmit={handleVerifyOtpAndProceedToAvatar} className="space-y-4">
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
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{loading ? 'Verifying OTP...' : 'Verify Code & Choose Avatar'}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </form>
              ) : (
                /* Step 3: Avatar Selection Screen */
                <div className="space-y-4">
                  {/* Verified Banner */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-emerald-950 leading-tight">Email Verified</p>
                        <p className="text-[11px] text-emerald-700 truncate">{emailInput}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAvatarStep(false); setErrorMsg(null); }}
                      className="text-[11px] text-emerald-800 hover:underline font-bold flex items-center gap-1 shrink-0 ml-2"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back to OTP
                    </button>
                  </div>

                  {/* Profile Preview Card */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={getSafeAvatar(selectedAvatar)}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 bg-white shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-md shadow-xs">
                        PREVIEW
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{nameInput || 'Your Name'}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                          {roleInput.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate font-medium">
                          {professionInput || 'Professional'}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-800 font-semibold mt-1 flex items-center gap-1 truncate">
                        {customAvatar && selectedAvatar === customAvatar ? (
                          <>
                            <Camera className="w-3 h-3 text-emerald-700" />
                            Custom photo selected
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            {ANIME_AVATARS.find(a => a.url === selectedAvatar)?.name || 'Anime'} avatar selected
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 2D Anime Character Collection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Choose a 2D Character Avatar
                      </label>
                      <span className="text-[10px] text-slate-400">12 stylized profiles</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {ANIME_AVATARS.map((option) => {
                        const isSelected = selectedAvatar === option.url;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedAvatar(option.url);
                              setErrorMsg(null);
                            }}
                            title={`${option.name} (${option.roleHint})`}
                            className={`relative group p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={option.url}
                              alt={option.name}
                              className="w-full aspect-square rounded-lg object-cover"
                              loading="lazy"
                            />
                            <div className="mt-1 text-center">
                              <span className="text-[10px] font-bold text-slate-800 block truncate leading-tight">
                                {option.name}
                              </span>
                              <span className="text-[8px] text-slate-400 block truncate leading-none mt-0.5">
                                {option.roleHint}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-black shadow-xs">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Upload Your Photo Option */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        Or Upload Your Photo
                      </label>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WebP (Max 2MB)</span>
                    </div>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleCustomAvatarSelect}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading || loading}
                        className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <UploadCloud className="w-4 h-4 text-slate-600" />
                        <span>{avatarUploading ? 'Processing Image...' : customAvatar ? 'Choose Different Photo' : 'Upload Your Photo'}</span>
                      </button>

                      {customAvatar && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomAvatar(null);
                            setSelectedAvatar(ANIME_AVATARS[0].url);
                          }}
                          className="px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                          title="Revert to 2D anime character avatar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarStep(false)}
                      disabled={loading}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteRegistration}
                      disabled={loading || !selectedAvatar}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{loading ? 'Finalizing Account...' : 'Confirm & Complete Registration'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-[#E8E4D8] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Official Secretariat: info@propertystudio.org</span>
          <button
            onClick={onClose}
            className="font-bold text-[#030508] hover:text-[#B49029] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

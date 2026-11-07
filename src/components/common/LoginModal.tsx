import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { isPropertySeeker, postLoginDestination } from '../../shared/policy';
import { isPhoneOtpRequired } from '../../shared/authConfig';
import { readApiResponse } from '../../lib/apiResponse';
import { BrandLogo } from './BrandLogo';
import { ANIME_AVATARS, getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { GoogleProfileCompletionModal } from './GoogleProfileCompletionModal';
import {
  LogIn,
  LogOut,
  X,
  ShieldCheck,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  RotateCcw,
  MapPin,
  Lock,
  MessageSquare,
  Sparkles,
  Loader2
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
  const [showGoogleProfileCompletion, setShowGoogleProfileCompletion] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ user: any; googlePicture?: string } | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string>(
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) || ''
  );

  // WhatsApp OTP registration flow state: 'FORM' | 'OTP'
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpDeliveryStatus, setOtpDeliveryStatus] = useState<'SENDING' | 'SUBMITTED' | 'SENT' | 'DELIVERED' | 'FAILED'>('SUBMITTED');
  const [otpMessageId, setOtpMessageId] = useState<string | null>(null);
  const [deliveryFailureReason, setDeliveryFailureReason] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Default avatar selection for registration
  const [selectedAvatar, setSelectedAvatar] = useState<string>(DEFAULT_AVATAR);

  const stopDeliveryPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopDeliveryPolling();
  }, []);

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

  // Listen for Google OAuth popup callback messages
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const user = event.data.user;
        const isNewUser = Boolean(event.data.isNewUser);
        const isProfileComplete = Boolean(event.data.isProfileComplete);

        if (isNewUser || !isProfileComplete) {
          setPendingGoogleUser({
            user,
            googlePicture: event.data?.googlePicture || user?.avatar
          });
          setShowGoogleProfileCompletion(true);
          setGoogleLoading(false);
          return;
        }

        login(user as Parameters<typeof login>[0]);
        showToast(`Welcome back, ${user.name || 'User'}!`);
        if (isPropertySeeker(user.role)) {
          setActiveView('DASHBOARD');
        } else {
          setActiveView(postLoginDestination(user.role));
        }
        setGoogleLoading(false);
        onClose();
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setGoogleLoading(false);
        setErrorMsg(event.data.error || 'Google authentication failed.');
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [isOpen]);

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

  if (showGoogleProfileCompletion && pendingGoogleUser) {
    return (
      <GoogleProfileCompletionModal
        isOpen={true}
        onClose={() => {
          setShowGoogleProfileCompletion(false);
          setPendingGoogleUser(null);
          onClose();
        }}
        user={pendingGoogleUser.user}
        googlePicture={pendingGoogleUser.googlePicture}
        onCompleted={(updatedUser) => {
          login(updatedUser as Parameters<typeof login>[0]);
          showToast(`Welcome to Property Studio, ${updatedUser.name || 'User'}!`);
          if (isPropertySeeker(updatedUser.role)) {
            setActiveView('DASHBOARD');
          } else {
            setActiveView(postLoginDestination(updatedUser.role));
          }
          setShowGoogleProfileCompletion(false);
          setPendingGoogleUser(null);
          onClose();
        }}
      />
    );
  }

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

      const isNewUser = Boolean(result.data?.isNewUser);
      const isProfileComplete = Boolean(result.data?.isProfileComplete);

      if (isNewUser || !isProfileComplete) {
        setPendingGoogleUser({
          user,
          googlePicture: result.data?.googlePicture || (user as any).avatar
        });
        setShowGoogleProfileCompletion(true);
        setGoogleLoading(false);
        return;
      }

      login(user as Parameters<typeof login>[0]);
      showToast(`Welcome back, ${user.name || 'User'}!`);

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

    const effectiveClientId = (
      googleClientId ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
      ''
    ).trim();

    if (!effectiveClientId) {
      setErrorMsg(
        'Google Sign-In is not configured yet (missing Google OAuth Client ID). Please configure GOOGLE_CLIENT_ID in your environment variables, or sign in using your account email and password.'
      );
      return;
    }

    setGoogleLoading(true);

    const gAccounts = (window as any).google?.accounts;

    if (gAccounts?.oauth2) {
      try {
        const client = gAccounts.oauth2.initCodeClient({
          client_id: effectiveClientId,
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
          const isProfileComplete = Boolean(event.data?.isProfileComplete);

          if (isNewUser || !isProfileComplete) {
            setPendingGoogleUser({
              user,
              googlePicture: event.data?.googlePicture || user?.avatar
            });
            setShowGoogleProfileCompletion(true);
            setGoogleLoading(false);
            return;
          }

          login(user as Parameters<typeof login>[0]);
          showToast(`Welcome back, ${user.name || 'User'}!`);
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

  const handleOtpDigitChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    const char = clean.slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);
    setErrorMsg(null);

    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);
    setErrorMsg(null);
    const nextIdx = Math.min(pasted.length, 5);
    otpRefs.current[nextIdx]?.focus();
  };

  // WhatsApp OTP dispatch handler triggered on "Create Verified Account"
  const handleSendWhatsAppOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting.current) return;
    setErrorMsg(null);

    if (!nameInput.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanDigits = phoneInput.replace(/[^0-9]/g, '');
    let tenDigits = cleanDigits;
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      tenDigits = cleanDigits.slice(2);
    } else if (cleanDigits.length > 10) {
      tenDigits = cleanDigits.slice(-10);
    }

    if (tenDigits.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number for WhatsApp verification.');
      return;
    }

    if (!professionInput.trim()) {
      setErrorMsg('Please enter your profession.');
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setOtpDeliveryStatus('SENDING');
    try {
      const fullPhone = '+91' + tenDigits;
      const res = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ phone: fullPhone, intent: 'register' })
      });
      const result = await readApiResponse(res);
      if (!result.ok || result.data?.success !== true) {
        if (result.status === 409 || result.data?.code === 'PHONE_ALREADY_REGISTERED') {
          throw new Error('An account with this mobile number already exists. Please sign in instead.');
        }
        throw new Error(result.error || 'WhatsApp verification code was not accepted by provider.');
      }
      setVerifiedPhone(fullPhone);
      setRegStep('OTP');
      setOtpDigits(['', '', '', '', '', '']);
      setPhoneCountdown(60);
      setOtpDeliveryStatus('SUBMITTED');
      setDeliveryFailureReason(null);
      const msgId = (result.data?.messageId as string) || null;
      setOtpMessageId(msgId);
      showToast('OTP request accepted. Waiting for WhatsApp delivery...');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);

      // Active status polling: queries /api/auth/phone-otp-status every 2.5 seconds
      stopDeliveryPolling();
      let pollCount = 0;
      pollingRef.current = setInterval(async () => {
        pollCount++;
        if (pollCount > 24) {
          stopDeliveryPolling();
          return;
        }
        try {
          const params = new URLSearchParams({ phone: fullPhone });
          if (msgId) params.set('messageId', msgId);
          const stRes = await fetch(`/api/auth/phone-otp-status?${params.toString()}`);
          if (stRes.ok) {
            const stData = await stRes.json();
            if (stData.status === 'DELIVERED') {
              setOtpDeliveryStatus('DELIVERED');
              stopDeliveryPolling();
            } else if (stData.status === 'SENT') {
              setOtpDeliveryStatus('SENT');
            } else if (stData.status === 'FAILED') {
              setOtpDeliveryStatus('FAILED');
              setDeliveryFailureReason(stData.failureReason || 'Provider reported delivery failure.');
              stopDeliveryPolling();
            }
          }
        } catch {
          // ignore transient poll errors
        }
      }, 2500);
    } catch (err: any) {
      setOtpDeliveryStatus('FAILED');
      setDeliveryFailureReason(err.message || 'WhatsApp verification was not sent.');
      setErrorMsg(err.message || 'WhatsApp verification was not sent.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  // WhatsApp OTP verification & direct registration completion
  const handleVerifyWhatsAppOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting.current) return;
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit WhatsApp verification code.');
      return;
    }
    stopDeliveryPolling();
    setErrorMsg(null);
    submitting.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone, otp: enteredOtp })
      });
      const result = await readApiResponse(res);
      if (!result.ok || result.data?.verified !== true) {
        throw new Error(result.error || 'Invalid or expired WhatsApp verification code. Please check and try again.');
      }

      // Code is verified! Directly complete registration with the pre-collected details
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim().toLowerCase(),
          password: passwordInput,
          role: roleInput,
          phone: verifiedPhone,
          phoneOtp: enteredOtp,
          organization: organizationInput.trim(),
          profession: professionInput.trim(),
          company: companyInput.trim() || undefined,
          interests: selectedInterests,
          townCity: DEFAULT_SIGNUP_LOCATION,
          location: DEFAULT_SIGNUP_LOCATION,
          avatar: selectedAvatar || DEFAULT_AVATAR
        })
      });

      const regResult = await readApiResponse(response);
      const user = regResult.data?.user as Parameters<typeof login>[0] | undefined;
      if (!regResult.ok || !user) {
        throw new Error(regResult.error || 'Registration failed');
      }

      login(user);
      showToast(`Welcome to Property Studio, ${user.name}!`);
      if (isPropertySeeker(user.role)) {
        setActiveView('DASHBOARD');
      } else {
        setActiveView(postLoginDestination(user.role));
      }
      onClose();

      // Reset state
      setRegStep('FORM');
      setPhoneInput('');
      setOtpDigits(['', '', '', '', '', '']);
      setVerifiedPhone('');
      setNameInput('');
      setEmailInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setProfessionInput('');
      setOrganizationInput('');
      setCompanyInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E8E4D8] w-full max-w-lg md:max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Modal Header Matching Reference Image */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#E8E4D8] flex items-center justify-between bg-[#182A3E] text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                {isLoggedIn
                  ? 'Account Session'
                  : forgotPasswordMode
                  ? 'Reset Password'
                  : mode === 'REGISTER'
                  ? regStep === 'OTP'
                    ? 'WhatsApp Verification'
                    : 'Create Account'
                  : 'Portal Sign In'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {isLoggedIn
                  ? `Active as ${currentUser.name}`
                  : forgotPasswordMode
                  ? 'Verify email OTP to set new password'
                  : mode === 'REGISTER' && regStep === 'OTP'
                  ? 'Enter the 6-digit code received on WhatsApp'
                  : 'Live server database authentication'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
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
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer"
                  >
                    Admin Console
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Segmented Toggle Pills Matching Screenshot */}
              <div className="bg-slate-100/90 p-1 rounded-xl flex gap-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setForgotPasswordMode(false);
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                    mode === 'LOGIN' && !forgotPasswordMode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    setForgotPasswordMode(false);
                    setRegStep('FORM');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                    mode === 'REGISTER' && !forgotPasswordMode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Account
                </button>
              </div>

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
                        setMode('LOGIN');
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
                /* Sign In Form */
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

                  {/* Social Logins Divider */}
                  <div className="relative my-4 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative px-3 bg-white text-[11px] text-slate-400 font-medium">
                      or continue with
                    </span>
                  </div>

                  {/* Single Google Social Button */}
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
              ) : regStep === 'FORM' ? (
                /* Registration Form Exactly Matching Reference Image media_1794043027829_f2c0a4c9.jpg */
                <form onSubmit={handleSendWhatsAppOtp} className="space-y-3">
                  {/* Alert Banner: WhatsApp OTP verification is mandatory */}
                  <div className="bg-[#FEFBF2] py-2 px-3 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>WhatsApp OTP verification is mandatory for verified account registration.</span>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder="e.g. Suresh Chandra"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                      required
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="admin@propertystudio.org"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                      required
                    />
                  </div>

                  {/* Role / Account Type */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Role / Account Type
                    </label>
                    <select
                      value={roleInput}
                      onChange={e => setRoleInput(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="PROPERTY_SEEKER">Property Seeker (HNI / Investor / Buyer)</option>
                      <option value="LANDOWNER">Landowner / Asset Holder</option>
                      <option value="CHANNEL_PARTNER">Channel Partner / Agent</option>
                      <option value="RESELLER">Reseller</option>
                      <option value="RERA_AGENT">RERA Registered Agent</option>
                      <option value="REAL_ESTATE_MEDIA">Real Estate Media Professional</option>
                    </select>
                  </div>

                  {/* Two-Column Row: Contact Mobile * (Mandatory) & Organization (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Contact Mobile <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phoneInput}
                        onChange={e => setPhoneInput(e.target.value)}
                        placeholder="e.g. +91 98490 12345"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Organization <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={organizationInput}
                        onChange={e => setOrganizationInput(e.target.value)}
                        placeholder="Firm or organization"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* Two-Column Row: Profession * & Company / Practice (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="signup-profession" className="block font-bold text-slate-700 text-xs mb-1">
                        Profession *
                      </label>
                      <input
                        id="signup-profession"
                        name="profession"
                        type="text"
                        autoComplete="off"
                        value={professionInput}
                        onChange={e => setProfessionInput(e.target.value)}
                        placeholder="Enter your profession"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Company / Practice <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={companyInput}
                        onChange={e => setCompanyInput(e.target.value)}
                        placeholder="e.g. Studio Arc / Firm"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* Interests & Topics Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 text-xs">
                        Interests & Topics
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Personalizes your Community Q&A
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-xl bg-slate-50/50">
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
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#B49029] text-white border-[#B49029] font-bold shadow-xs'
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

                  {/* Location (City & State) Fixed Territory */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="signup-location" className="block font-bold text-slate-700 text-xs">
                        Location (City & State)
                      </label>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200/60 inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                        Fixed Territory
                      </span>
                    </div>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-location"
                        name="location"
                        type="text"
                        value={DEFAULT_SIGNUP_LOCATION}
                        readOnly
                        aria-readonly="true"
                        tabIndex={-1}
                        className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100/90 text-slate-800 font-semibold cursor-not-allowed select-none focus:outline-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                      Platform location is fixed to Hyderabad, Telangana, India.
                    </span>
                  </div>

                  {/* Choose Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Choose Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={e => setPasswordInput(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-9 text-slate-900 font-medium"
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
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPasswordInput}
                          onChange={e => setConfirmPasswordInput(e.target.value)}
                          placeholder="Re-enter your password"
                          className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 pr-9 text-slate-900 font-medium ${
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
                    </div>
                  </div>

                  {/* Terms & Privacy Policy */}
                  <p className="text-[11px] text-slate-500 text-center leading-tight pt-1">
                    By proceeding, you agree to our{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveView('TERMS');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-amber-800 hover:underline font-bold cursor-pointer"
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
                      className="text-amber-800 hover:underline font-bold cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    .
                  </p>

                  {/* Primary Action Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 sm:py-3 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                        <span>Sending your WhatsApp verification code...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Verified Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: 6-Digit WhatsApp OTP Verification */
                <form onSubmit={handleVerifyWhatsAppOtp} className="space-y-4">
                  <div className={`rounded-2xl p-3 text-center space-y-1 border transition-all ${
                    otpDeliveryStatus === 'DELIVERED'
                      ? 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950'
                      : otpDeliveryStatus === 'FAILED'
                      ? 'bg-red-50/90 border-red-200/90 text-red-950'
                      : 'bg-amber-50/90 border-amber-200/90 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-xs text-left">
                        {otpDeliveryStatus === 'DELIVERED' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>WhatsApp message delivered. Enter your code.</span>
                          </>
                        ) : otpDeliveryStatus === 'FAILED' ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>Unable to send OTP. Please try again.</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                            <span>OTP request accepted. Dispatched to WhatsApp...</span>
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => { stopDeliveryPolling(); setRegStep('FORM'); setErrorMsg(null); }}
                        className="text-[11px] text-amber-700 hover:underline font-bold cursor-pointer shrink-0 ml-2"
                      >
                        Change Number
                      </button>
                    </div>

                    <div className="text-[11px] leading-relaxed text-left pt-1">
                      {otpDeliveryStatus === 'DELIVERED' ? (
                        <p className="text-emerald-800">
                          Official code delivered via WhatsApp to <strong className="font-mono text-emerald-950">{verifiedPhone}</strong>. Enter the 6 digits below:
                        </p>
                      ) : otpDeliveryStatus === 'FAILED' ? (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-red-700 text-[11px]">{deliveryFailureReason || 'Unable to deliver message to this mobile number.'}</span>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppOtp()}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[10px] cursor-pointer shrink-0 shadow-xs"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : (
                        <p className="text-amber-800">
                          Dispatched to WhatsApp network for <strong className="font-mono text-amber-950">{verifiedPhone}</strong>. Waiting for carrier delivery confirmation...
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" /> Location:
                      </span>
                      <span className="font-semibold text-slate-800">{DEFAULT_SIGNUP_LOCATION} (Fixed Territory)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-center mb-2 text-xs">
                      Enter 6-Digit WhatsApp Verification Code
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-2.5">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { otpRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={e => handleOtpDigitKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-10 h-12 sm:w-11 sm:h-12 text-center text-lg sm:text-xl font-mono font-bold border-2 rounded-xl border-slate-300 focus:border-[#B49029] focus:ring-2 focus:ring-[#B49029]/20 focus:outline-none transition-all bg-white"
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Didn't receive the WhatsApp code?</span>
                    {phoneCountdown > 0 ? (
                      <span className="font-mono text-slate-400">Resend in {phoneCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppOtp()}
                        className="text-amber-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend WhatsApp OTP</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopDeliveryPolling();
                        setRegStep('FORM');
                        setErrorMsg(null);
                      }}
                      className="px-3.5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otpDigits.join('').length !== 6}
                      className="flex-1 py-3 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{loading ? 'Verifying Code...' : 'Verify Code & Launch Platform'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-[#E8E4D8] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Official Secretariat: info@propertystudio.org</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#030508] hover:text-[#B49029] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

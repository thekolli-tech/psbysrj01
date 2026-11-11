import { normalizeIndianMobile, indianNationalDigits } from '../shared/indianMobile.ts';
import { recordOtpQueued, recordOtpSubmitted, recordOtpFailed, recordOtpDelivered } from './otpDeliveryTracker.ts';

export interface TwoFactorSettings {
  apiKey: string;
  templateName?: string;
  voiceEnabled: boolean;
}

export interface TwoFactorSendResult {
  success: boolean;
  provider: '2factor';
  channel: 'sms' | 'voice';
  sessionId?: string;
  error?: string;
  statusCode?: number;
}

export interface TwoFactorVerifyResult {
  success: boolean;
  status: 'MATCHED' | 'MISMATCH' | 'EXPIRED' | 'ERROR';
  details?: string;
  error?: string;
}

const BASE_URL = 'https://2factor.in/API/V1';

function envValue(name: string): string {
  const value = process.env[name]?.trim() || '';
  if (!value || /[\r\n]/.test(value)) return '';
  return value;
}

/**
 * Returns 2Factor configuration if the required API key is present in environment variables.
 */
export function twoFactorSettings(): TwoFactorSettings | null {
  const apiKey = envValue('TWOFACTOR_API_KEY') || envValue('TWO_FACTOR_API_KEY');
  if (!apiKey) return null;

  const templateName = envValue('TWOFACTOR_OTP_TEMPLATE') || envValue('TWO_FACTOR_OTP_TEMPLATE') || undefined;
  const voiceEnabled = envValue('TWOFACTOR_VOICE_ENABLED') !== 'false';

  return {
    apiKey,
    templateName,
    voiceEnabled
  };
}

/**
 * Checks whether 2Factor is configured as an active SMS/Voice OTP provider.
 */
export function isTwoFactorConfigured(): boolean {
  return twoFactorSettings() !== null;
}

/**
 * Formats canonical Indian mobile number for 2Factor API:
 * 2Factor expects 10 digits prefixed by 91 (e.g. 919876543210).
 */
export function formatPhoneFor2Factor(phone: string): string | null {
  const normalized = normalizeIndianMobile(phone);
  if (!normalized) return null;
  const national = indianNationalDigits(normalized);
  if (!national || national.length !== 10) return null;
  return `91${national}`;
}

/**
 * Sends OTP via 2Factor.in SMS (primary) or Voice Outbound Dialing (fallback).
 * Strictly validates phone number format and returns the provider's Session ID.
 */
export async function sendTwoFactorOtp(
  toPhone: string,
  channel: 'sms' | 'voice' = 'sms',
  customOtp?: string,
  fetchImpl: typeof fetch = fetch
): Promise<TwoFactorSendResult> {
  const settings = twoFactorSettings();
  if (!settings) {
    return {
      success: false,
      provider: '2factor',
      channel,
      error: '2Factor provider is not configured. TWOFACTOR_API_KEY is missing.'
    };
  }

  const normalized = normalizeIndianMobile(toPhone);
  const phoneDigits = formatPhoneFor2Factor(toPhone);
  if (!normalized || !phoneDigits) {
    return {
      success: false,
      provider: '2factor',
      channel,
      error: 'A valid Indian mobile number is required.'
    };
  }

  if (channel === 'voice' && !settings.voiceEnabled) {
    return {
      success: false,
      provider: '2factor',
      channel,
      error: 'Voice OTP is currently disabled in system settings.'
    };
  }

  // Record queued state locally
  recordOtpQueued(normalized, `2factor-${channel}`);

  // Build target 2Factor URL
  let endpointUrl: string;
  if (channel === 'voice') {
    if (customOtp && /^\d{4,6}$/.test(customOtp.trim())) {
      endpointUrl = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/VOICE/${phoneDigits}/${encodeURIComponent(customOtp.trim())}`;
    } else {
      endpointUrl = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/VOICE/${phoneDigits}/AUTOGEN`;
    }
  } else {
    // Primary: SMS OTP
    if (settings.templateName && customOtp && /^\d{4,6}$/.test(customOtp.trim())) {
      endpointUrl = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/SMS/${phoneDigits}/${encodeURIComponent(customOtp.trim())}/${encodeURIComponent(settings.templateName)}`;
    } else if (settings.templateName) {
      endpointUrl = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/SMS/${phoneDigits}/AUTOGEN/${encodeURIComponent(settings.templateName)}`;
    } else {
      endpointUrl = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/SMS/${phoneDigits}/AUTOGEN`;
    }
  }

  try {
    const response = await fetchImpl(endpointUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10_000)
    });

    const data = await response.json().catch(() => null) as {
      Status?: string;
      Details?: string;
    } | null;

    if (!response.ok || !data || data.Status !== 'Success') {
      const errorMsg = data?.Details || `2Factor returned HTTP ${response.status}`;
      recordOtpFailed(normalized, errorMsg);
      console.warn(`[Property Studio] 2Factor ${channel.toUpperCase()} dispatch rejected: ${errorMsg}`);
      return {
        success: false,
        provider: '2factor',
        channel,
        error: errorMsg,
        statusCode: response.status
      };
    }

    const sessionId = String(data.Details || '').trim();
    if (!sessionId) {
      recordOtpFailed(normalized, 'No Session ID received from 2Factor');
      return {
        success: false,
        provider: '2factor',
        channel,
        error: '2Factor response did not contain a valid session ID.'
      };
    }

    // Record submission with Session ID
    recordOtpSubmitted(normalized, sessionId, `2factor-${channel}`);
    console.log(`[Property Studio] 2Factor ${channel.toUpperCase()} OTP accepted. Session ID: ${sessionId}`);

    return {
      success: true,
      provider: '2factor',
      channel,
      sessionId
    };
  } catch (err: any) {
    const message = err?.message || 'Network request failed';
    recordOtpFailed(normalized, message);
    console.warn(`[Property Studio] 2Factor ${channel.toUpperCase()} request failed:`, message);
    return {
      success: false,
      provider: '2factor',
      channel,
      error: '2Factor service request timed out or failed to connect.'
    };
  }
}

/**
 * Verifies user-entered OTP against 2Factor.in provider session.
 * Endpoint: GET https://2factor.in/API/V1/{apiKey}/SMS/VERIFY/{sessionId}/{enteredOtp}
 */
export async function verifyTwoFactorOtp(
  sessionId: string,
  enteredOtp: string,
  fetchImpl: typeof fetch = fetch
): Promise<TwoFactorVerifyResult> {
  const settings = twoFactorSettings();
  if (!settings) {
    return {
      success: false,
      status: 'ERROR',
      error: '2Factor provider is not configured.'
    };
  }

  const cleanSession = sessionId.trim();
  const cleanCode = enteredOtp.trim();

  if (!cleanSession || !cleanCode) {
    return {
      success: false,
      status: 'MISMATCH',
      error: 'Session ID and verification code are required.'
    };
  }

  const verifyUrl = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/SMS/VERIFY/${encodeURIComponent(cleanSession)}/${encodeURIComponent(cleanCode)}`;

  try {
    const response = await fetchImpl(verifyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8_000)
    });

    const data = await response.json().catch(() => null) as {
      Status?: string;
      Details?: string;
    } | null;

    if (data?.Status === 'Success' && data.Details === 'OTP Matched') {
      recordOtpDelivered(cleanSession);
      return {
        success: true,
        status: 'MATCHED',
        details: data.Details
      };
    }

    const detailsStr = String(data?.Details || '');
    if (detailsStr.toLowerCase().includes('mismatch')) {
      return {
        success: false,
        status: 'MISMATCH',
        error: 'Invalid verification code. Please check and retry.'
      };
    }

    if (detailsStr.toLowerCase().includes('expired')) {
      return {
        success: false,
        status: 'EXPIRED',
        error: 'Verification code has expired. Please request a new code.'
      };
    }

    return {
      success: false,
      status: 'ERROR',
      error: detailsStr || `2Factor verification returned status ${response.status}`
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'ERROR',
      error: err?.message || 'Unable to connect to verification gateway.'
    };
  }
}

/**
 * Checks 2Factor account transactional SMS credit balance.
 * Endpoint: GET https://2factor.in/API/V1/{apiKey}/ADDON_SERVICES/BAL/TRANSACTIONAL_SMS
 */
export async function checkTwoFactorBalance(
  fetchImpl: typeof fetch = fetch
): Promise<{ success: boolean; balance?: number | string; error?: string }> {
  const settings = twoFactorSettings();
  if (!settings) {
    return { success: false, error: 'TWOFACTOR_API_KEY is not configured.' };
  }

  const url = `${BASE_URL}/${encodeURIComponent(settings.apiKey)}/ADDON_SERVICES/BAL/TRANSACTIONAL_SMS`;

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6_000)
    });

    const data = await response.json().catch(() => null) as {
      Status?: string;
      Details?: string | number;
    } | null;

    if (data?.Status === 'Success') {
      return { success: true, balance: data.Details };
    }

    return { success: false, error: String(data?.Details || 'Failed to retrieve balance') };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Balance check failed' };
  }
}

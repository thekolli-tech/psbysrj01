import { normalizeIndianMobile } from '../shared/indianMobile.ts';

export interface SmsDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export const FAST2SMS_OTP_URL = 'https://www.fast2sms.com/dev/otp/send';

function envValue(name: string): string {
  const value = process.env[name]?.trim() || '';
  if (!value || /[\r\n]/.test(value)) return '';
  return value;
}

/**
 * Fast2SMS is ready only when the API key and the account's OTP template id are both set.
 * The sender ID is not sent here. It has to be DLT-approved and linked to that template
 * in the Fast2SMS panel before the provider will accept a message.
 */
export function fast2SmsSettings(): { apiKey: string; otpId: string; variables: string } | null {
  const apiKey = envValue('FAST2SMS_API_KEY');
  const otpId = envValue('FAST2SMS_OTP_ID');
  if (!apiKey || !otpId) return null;
  return { apiKey, otpId, variables: envValue('FAST2SMS_OTP_VARIABLES') };
}

export function configuredSmsProviders(): string[] {
  return fast2SmsSettings() ? ['Fast2SMS'] : [];
}

function providerAccepted(response: Response, data: { return?: unknown; status_code?: unknown } | null): boolean {
  if (!response.ok || !data || data.return !== true) return false;
  if (data.status_code === undefined || data.status_code === null || data.status_code === '') return true;
  return Number(data.status_code) === 200;
}

/**
 * Sends the already generated code through Fast2SMS POST /dev/otp/send.
 * The caller must invoke this only after the user asks for an OTP.
 * A missing template, a provider error, or return:false is a failure.
 */
export async function sendFast2SmsOtp(
  toPhone: string,
  otp: string,
  fetchImpl: typeof fetch = fetch
): Promise<SmsDispatchResult> {
  const settings = fast2SmsSettings();
  if (!settings) {
    return { success: false, provider: 'unconfigured', error: 'SMS provider is not configured.' };
  }
  const mobile = normalizeIndianMobile(toPhone);
  if (!mobile) {
    return { success: false, provider: 'fast2sms', error: 'A valid Indian mobile number is required.' };
  }

  const payload: Record<string, string | number> = {
    mobile: mobile.slice(3),
    otp_id: settings.otpId,
    otp,
    otp_expiry: 10,
    otp_length: 6
  };
  if (settings.variables) payload.variables_values = settings.variables;

  try {
    const response = await fetchImpl(FAST2SMS_OTP_URL, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Authorization: settings.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000)
    });
    if (response.status >= 300 && response.status < 400) {
      console.warn('[Property Studio] Fast2SMS redirected the verification request. The message was not accepted.');
      return { success: false, provider: 'fast2sms', error: 'SMS provider did not accept the verification message.' };
    }
    const data = await response.json().catch(() => null) as { return?: unknown; status_code?: unknown; request_id?: unknown } | null;
    if (!providerAccepted(response, data)) {
      console.warn(`[Property Studio] Fast2SMS rejected the verification message with status ${response.status}.`);
      return { success: false, provider: 'fast2sms', error: 'SMS provider did not accept the verification message.' };
    }
    console.log('[Property Studio] Fast2SMS accepted the verification message.');
    const requestId = data && (typeof data.request_id === 'string' || typeof data.request_id === 'number')
      ? String(data.request_id)
      : undefined;
    return { success: true, provider: 'fast2sms', messageId: requestId };
  } catch {
    console.warn('[Property Studio] Fast2SMS request failed before a response was received.');
    return { success: false, provider: 'fast2sms', error: 'SMS provider request failed.' };
  }
}

export async function sendRealSmsOtp(
  toPhone: string,
  otp: string,
  fetchImpl: typeof fetch = fetch
): Promise<SmsDispatchResult> {
  return sendFast2SmsOtp(toPhone, otp, fetchImpl);
}

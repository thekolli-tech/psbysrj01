import { normalizeE164, whatsAppRecipient } from '../shared/phone.ts';

export interface WhatsAppDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

const GRAPH_HOST = 'https://graph.facebook.com';

function envValue(name: string): string {
  const value = process.env[name]?.trim() || '';
  if (!value || /[\r\n]/.test(value)) return '';
  return value;
}

export interface WhatsAppSettings {
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  graphApiVersion: string;
  templateLanguage: string;
}

/**
 * Ready only when every Cloud API send value is present.
 * The approved authentication template is addressed by name and locale.
 * Graph version is supplied by the operator; the payload matches Meta's
 * copy-code authentication template (body text plus URL button index 0).
 */
export function whatsAppSettings(): WhatsAppSettings | null {
  const accessToken = envValue('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = envValue('WHATSAPP_PHONE_NUMBER_ID');
  const templateName = envValue('WHATSAPP_OTP_TEMPLATE_NAME');
  const graphApiVersion = envValue('WHATSAPP_GRAPH_API_VERSION');
  const templateLanguage = envValue('WHATSAPP_OTP_TEMPLATE_LANGUAGE');
  if (!accessToken || !phoneNumberId || !templateName || !graphApiVersion || !templateLanguage) return null;
  if (!/^\d+$/.test(phoneNumberId)) return null;
  if (!/^v\d+\.\d+$/.test(graphApiVersion)) return null;
  if (!/^[a-z0-9_]{1,512}$/.test(templateName)) return null;
  if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(templateLanguage)) return null;
  return { accessToken, phoneNumberId, templateName, graphApiVersion, templateLanguage };
}

export function configuredWhatsAppProviders(): string[] {
  return whatsAppSettings() ? ['WhatsApp'] : [];
}

export function whatsAppMessagesUrl(settings: WhatsAppSettings): string {
  return `${GRAPH_HOST}/${settings.graphApiVersion}/${settings.phoneNumberId}/messages`;
}

function acceptedMessageId(data: { error?: unknown; messages?: Array<{ id?: unknown }> } | null): string | null {
  if (!data || data.error) return null;
  const id = data.messages?.[0]?.id;
  if (typeof id !== 'string' || id.trim().length === 0) return null;
  return id;
}

/**
 * Sends a copy-code authentication template.
 * Meta requires the same code in the body parameter and the URL button parameter.
 */
export async function sendWhatsAppOtp(
  toPhone: string,
  otp: string,
  fetchImpl: typeof fetch = fetch
): Promise<WhatsAppDispatchResult> {
  const settings = whatsAppSettings();
  if (!settings) {
    return { success: false, provider: 'unconfigured', error: 'WhatsApp provider is not configured.' };
  }
  const mobile = normalizeE164(toPhone);
  if (!mobile) {
    return { success: false, provider: 'whatsapp', error: 'A valid international mobile number in E.164 format is required.' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: whatsAppRecipient(mobile),
    type: 'template',
    template: {
      name: settings.templateName,
      language: { code: settings.templateLanguage },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: otp }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] }
      ]
    }
  };

  try {
    const response = await fetchImpl(whatsAppMessagesUrl(settings), {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000)
    });
    if (response.status >= 300 && response.status < 400) {
      console.warn('[Property Studio] WhatsApp redirected the verification request. The message was not accepted.');
      return { success: false, provider: 'whatsapp', error: 'WhatsApp did not accept the verification message.' };
    }
    const data = await response.json().catch(() => null) as { error?: unknown; messages?: Array<{ id?: unknown }> } | null;
    const messageId = response.ok ? acceptedMessageId(data) : null;
    if (!messageId) {
      console.warn(`[Property Studio] WhatsApp delivery failed (WHATSAPP_DELIVERY_FAILED, http ${response.status}).`);
      return { success: false, provider: 'whatsapp', error: 'WhatsApp did not accept the verification message.' };
    }
    console.log('[Property Studio] WhatsApp accepted the verification message.');
    return { success: true, provider: 'whatsapp', messageId };
  } catch {
    console.warn('[Property Studio] WhatsApp request failed before a response was received.');
    return { success: false, provider: 'whatsapp', error: 'WhatsApp request failed.' };
  }
}

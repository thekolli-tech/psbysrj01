import { normalizeIndianMobile } from '../shared/indianMobile.ts';

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
 * Ready only when every value required by the Cloud API send call is present and safe to place
 * in the URL or JSON. The language code is required because the approved template is addressed
 * by both name and locale. An invalid value is treated as not configured.
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
 * Sends the already generated code with a copy-code authentication template.
 * Meta requires the same code in the body parameter and the URL button parameter.
 * The caller must invoke this only after the user asks for an OTP.
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
  const mobile = normalizeIndianMobile(toPhone);
  if (!mobile) {
    return { success: false, provider: 'whatsapp', error: 'A valid Indian mobile number is required.' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: mobile.slice(1),
    type: 'template',
    template: {
      name: settings.templateName,
      language: { code: settings.templateLanguage },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otp }]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }]
        }
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
      console.warn(`[Property Studio] WhatsApp rejected the verification message with status ${response.status}.`);
      return { success: false, provider: 'whatsapp', error: 'WhatsApp did not accept the verification message.' };
    }
    console.log('[Property Studio] WhatsApp accepted the verification message.');
    return { success: true, provider: 'whatsapp', messageId };
  } catch {
    console.warn('[Property Studio] WhatsApp request failed before a response was received.');
    return { success: false, provider: 'whatsapp', error: 'WhatsApp request failed.' };
  }
}


export interface ModerationAlertData {
  submissionType: 'COMMUNITY_POST' | 'COMMUNITY_REQUEST' | 'LISTING' | 'PROFILE';
  title: string;
  submitterName: string;
  submitterRole: string;
  communityName?: string;
  submissionTime?: string;
  pendingStatus?: string;
  moderationUrl?: string;
}

export interface WhatsAppAlertResult {
  success: boolean;
  provider: string;
  status: 'DELIVERED' | 'ACCEPTED' | 'REJECTED' | 'UNCONFIGURED' | 'FAILED';
  messageId?: string;
  error?: string;
}

/**
 * Dispatches an automated approval/moderation alert to Super Admin at +91 90300 57488
 * via Meta WhatsApp Cloud API whenever an item requires review.
 * Never throws; records delivery status and fails open so in-app notifications are never blocked.
 */
export async function sendWhatsAppModerationAlert(
  data: ModerationAlertData,
  fetchImpl: typeof fetch = fetch
): Promise<WhatsAppAlertResult> {
  const targetPhone = process.env.SUPER_ADMIN_ALERT_PHONE || '+91 90300 57488';
  const mobile = normalizeIndianMobile(targetPhone);
  if (!mobile) {
    return {
      success: false,
      provider: 'whatsapp',
      status: 'FAILED',
      error: 'Invalid target phone number for Super Admin alert.'
    };
  }

  const settings = whatsAppSettings();
  const alertTemplate = process.env.WHATSAPP_MODERATION_TEMPLATE_NAME || process.env.WHATSAPP_ALERT_TEMPLATE_NAME;

  const typeLabel = data.submissionType === 'COMMUNITY_POST'
    ? 'Community Question / Post'
    : data.submissionType === 'COMMUNITY_REQUEST'
    ? 'Community Creation Request'
    : 'Platform Item';

  const submissionTime = data.submissionTime || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const moderationUrl = data.moderationUrl || 'https://psbysrj01.vercel.app/admin?tab=MODERATION';
  const communityDisplay = data.communityName || 'Western Corridor General';

  const alertBody = `🔔 *Property Studio — Super Admin Moderation Alert*

A new submission requires your review and approval:

📌 *Type:* ${typeLabel}
📝 *Title:* ${data.title}
👤 *Submitter:* ${data.submitterName} (${data.submitterRole})
🏘️ *Community:* ${communityDisplay}
⏰ *Submitted At:* ${submissionTime}
📊 *Status:* ${data.pendingStatus || 'PENDING_APPROVAL'}

🔗 *Review & Moderate:*
${moderationUrl}

*Instructions:*
Sign in to the Super Admin Console to review, approve, or reject this submission. Content remains private and hidden from the public feed until approved.`;

  const accessToken = settings?.accessToken || envValue('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = settings?.phoneNumberId || envValue('WHATSAPP_PHONE_NUMBER_ID');
  const graphApiVersion = settings?.graphApiVersion || envValue('WHATSAPP_GRAPH_API_VERSION') || 'v21.0';

  if (!accessToken || !phoneNumberId) {
    console.warn('[Property Studio] WhatsApp alert skipped: WhatsApp provider is not configured (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID required). Recipient:', targetPhone);
    return {
      success: false,
      provider: 'unconfigured',
      status: 'UNCONFIGURED',
      error: 'WhatsApp Cloud API is not configured in environment variables (requires WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID).'
    };
  }

  let payload: any;
  if (alertTemplate) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mobile.slice(1),
      type: 'template',
      template: {
        name: alertTemplate,
        language: { code: settings?.templateLanguage || 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: typeLabel },
              { type: 'text', text: data.title },
              { type: 'text', text: `${data.submitterName} (${data.submitterRole})` },
              { type: 'text', text: moderationUrl }
            ]
          }
        ]
      }
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mobile.slice(1),
      type: 'text',
      text: {
        preview_url: true,
        body: alertBody
      }
    };
  }

  const url = `${GRAPH_HOST}/${graphApiVersion}/${phoneNumberId}/messages`;
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = JSON.stringify(errJson);
      } catch {
        errDetail = await response.text().catch(() => '');
      }
      console.warn(`[Property Studio] WhatsApp alert rejected by Meta with status ${response.status}:`, errDetail);
      return {
        success: false,
        provider: 'whatsapp',
        status: 'REJECTED',
        error: `Meta WhatsApp API returned HTTP ${response.status}: ${errDetail.slice(0, 200)}`
      };
    }

    const resJson = await response.json().catch(() => ({})) as any;
    const msgId = resJson?.messages?.[0]?.id;
    console.log('[Property Studio] WhatsApp moderation alert accepted by Meta. Message ID:', msgId);
    return {
      success: true,
      provider: 'whatsapp',
      status: 'DELIVERED',
      messageId: msgId
    };
  } catch (err: any) {
    console.warn('[Property Studio] WhatsApp alert dispatch error:', err?.message || err);
    return {
      success: false,
      provider: 'whatsapp',
      status: 'FAILED',
      error: err?.message || 'Network request failed'
    };
  }
}

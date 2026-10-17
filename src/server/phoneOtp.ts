import { discardUnconsumedOtp, generateOtp } from './db.ts';
import { sendWhatsAppOtp } from './whatsappOtp.ts';

export type PhoneOtpFailureCode = 'WHATSAPP_NOT_CONFIGURED' | 'WHATSAPP_DELIVERY_FAILED' | 'PHONE_INVALID';

export async function issuePhoneOtp(
  e164: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ sent: true; expiresAt: number; provider: string } | { sent: false; code: PhoneOtpFailureCode; error: string }> {
  const { otp, expiresAt } = await generateOtp(e164, 'PHONE_VERIFICATION');
  const delivery = await sendWhatsAppOtp(e164, otp, fetchImpl);
  if (!delivery.success) {
    await discardUnconsumedOtp(e164, 'PHONE_VERIFICATION');
    if (delivery.provider === 'unconfigured') {
      return { sent: false, code: 'WHATSAPP_NOT_CONFIGURED', error: 'WhatsApp verification is not configured.' };
    }
    return { sent: false, code: 'WHATSAPP_DELIVERY_FAILED', error: 'WhatsApp did not accept the verification message.' };
  }
  return { sent: true, expiresAt, provider: delivery.provider };
}

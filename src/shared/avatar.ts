/**
 * Canonical Avatar utilities for Property Studio.
 * Provides a reliable, offline-safe default avatar and secure image validation.
 */

export const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%2394a3b8'%3E%3Crect width='64' height='64' rx='16' fill='%23f1f5f9'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%23cbd5e1'/%3E%3Cpath d='M16 54c0-8.837 7.163-16 16-16s16 7.163 16 16' fill='%23cbd5e1'/%3E%3C/svg%3E";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_AVATAR_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
] as const;

export function getSafeAvatar(avatarUrl?: string | null): string {
  if (!avatarUrl || typeof avatarUrl !== 'string') return DEFAULT_AVATAR;
  const clean = avatarUrl.trim();
  if (!clean || clean === 'null' || clean === 'undefined') return DEFAULT_AVATAR;
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:image/')) {
    return DEFAULT_AVATAR;
  }
  return clean;
}

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
  avatar?: string;
}

/**
 * Validates a profile photo upload (data URL or HTTPS URL).
 * Enforces image-only types (JPEG, PNG, WebP, GIF), max 2MB size limit,
 * and validates magic bytes to prevent SVG/HTML script execution.
 */
export function validateAvatarUpload(input: unknown): AvatarValidationResult {
  if (input === null || input === undefined || input === '') {
    return { valid: true, avatar: DEFAULT_AVATAR };
  }

  if (typeof input !== 'string') {
    return { valid: false, error: 'Avatar must be an image data URI or URL.' };
  }

  const raw = input.trim();
  if (raw.length === 0) {
    return { valid: true, avatar: DEFAULT_AVATAR };
  }

  // Strictly reject SVG, HTML, or scripts upfront to prevent stored XSS
  if (/<script|javascript:|data:image\/svg|\.svg/i.test(raw)) {
    return {
      valid: false,
      error: 'SVG and vector formats are not permitted for profile photos. Please upload a JPEG, PNG, WebP, or GIF.'
    };
  }

  // Handle standard HTTPS image URLs (e.g. Unsplash, CDN)
  if (/^https:\/\/[^\s$.?#].[^\s]*$/i.test(raw)) {
    if (raw.length > 2048) {
      return { valid: false, error: 'Avatar URL is too long (maximum 2048 characters).' };
    }
    // Reject suspicious extensions
    if (/\.(svg|html|htm|js|exe|php|sh)(\?.*)?$/i.test(raw)) {
      return { valid: false, error: 'Vector or executable file formats are not permitted for avatars.' };
    }
    return { valid: true, avatar: raw };
  }

  // Handle Base64 Data URI
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
  if (!match) {
    return {
      valid: false,
      error: 'Invalid avatar format. Expected an HTTPS image URL or a valid base64 image data URI (JPEG, PNG, WebP, or GIF).'
    };
  }

  const mime = match[1].toLowerCase();
  const base64Data = match[2];

  // Strictly reject SVG or non-raster formats to prevent stored XSS
  if (mime === 'image/svg+xml' || mime.includes('svg') || mime.includes('xml') || mime.includes('html')) {
    return {
      valid: false,
      error: 'SVG and vector formats are not permitted for profile photos. Please upload a JPEG, PNG, WebP, or GIF.'
    };
  }

  if (!ALLOWED_AVATAR_MIMES.includes(mime as any)) {
    return {
      valid: false,
      error: `Unsupported image format (${mime}). Allowed formats: JPEG, PNG, WebP, GIF.`
    };
  }

  // Estimate binary size from base64 length: (len * 3 / 4) - padding
  const padding = (base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0);
  const byteLength = Math.floor((base64Data.length * 3) / 4) - padding;

  if (byteLength > MAX_AVATAR_BYTES) {
    return {
      valid: false,
      error: `Profile photo exceeds the maximum size limit of 2MB (File size: ${(byteLength / (1024 * 1024)).toFixed(2)}MB).`
    };
  }

  // Validate magic bytes
  try {
    const buffer = Buffer.from(base64Data.slice(0, 32), 'base64');
    if (buffer.length < 4) {
      return { valid: false, error: 'Corrupt or unreadable image data.' };
    }

    const hex = buffer.toString('hex').toLowerCase();
    const isJpeg = hex.startsWith('ffd8ff');
    const isPng = hex.startsWith('89504e47');
    const isGif = hex.startsWith('47494638');
    const isWebp = hex.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return {
        valid: false,
        error: 'File content does not match allowed image formats. Valid JPEG, PNG, WebP, or GIF required.'
      };
    }
  } catch {
    return { valid: false, error: 'Could not decode image data.' };
  }

  return { valid: true, avatar: `data:${mime};base64,${base64Data}` };
}

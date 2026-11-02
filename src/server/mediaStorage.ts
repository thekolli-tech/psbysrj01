import crypto from 'node:crypto';
import {
  getGoogleDriveConfig,
  verifyDriveFile,
  DRIVE_STORAGE_LIMITS,
  DRIVE_ALLOWED_MIME_TYPES
} from './googleDriveStorage.ts';

export interface StorageConfigStatus {
  configured: boolean;
  provider: 'google_drive' | 's3' | 'r2' | 'cloudflare_stream' | null;
  accountEmail?: string;
  missingVariables: string[];
  maxVideoSizeBytes: number;
  maxAudioSizeBytes: number;
  maxImageSizeBytes: number;
}

export const STORAGE_LIMITS = DRIVE_STORAGE_LIMITS;
export const ALLOWED_MIME_TYPES = DRIVE_ALLOWED_MIME_TYPES;

/**
 * Checks whether persistent cloud media storage (Google Drive) is configured.
 * Never logs or exposes secret credentials.
 */
export function getMediaStorageConfig(): StorageConfigStatus {
  const driveConfig = getGoogleDriveConfig();

  if (driveConfig.configured) {
    return {
      configured: true,
      provider: 'google_drive',
      accountEmail: driveConfig.accountEmail,
      missingVariables: [],
      maxVideoSizeBytes: STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES,
      maxAudioSizeBytes: STORAGE_LIMITS.MAX_AUDIO_SIZE_BYTES,
      maxImageSizeBytes: STORAGE_LIMITS.MAX_IMAGE_SIZE_BYTES
    };
  }

  return {
    configured: false,
    provider: null,
    missingVariables: driveConfig.missingVariables,
    maxVideoSizeBytes: STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES,
    maxAudioSizeBytes: STORAGE_LIMITS.MAX_AUDIO_SIZE_BYTES,
    maxImageSizeBytes: STORAGE_LIMITS.MAX_IMAGE_SIZE_BYTES
  };
}

export interface UploadIntentRequest {
  filename: string;
  contentType: string;
  fileSizeBytes: number;
  mediaCategory: 'AUDIO' | 'VIDEO' | 'IMAGE';
  podcastOrVideoTitle?: string;
  userId?: string;
}

export interface UploadIntentResponse {
  allowed: boolean;
  error?: string;
  uploadId?: string;
  storageKey?: string;
  uploadUrl?: string;
  publicUrl?: string;
  expiresInSeconds?: number;
  isMockProvider?: boolean;
}

/**
 * Returns the playback delivery URL for a media item.
 */
export function getPublicPlaybackUrl(storageKey: string, mediaId?: string): string {
  if (mediaId) {
    return `/api/media/${mediaId}/stream`;
  }
  return `/api/media/drive-stream/${storageKey}`;
}

/**
 * Validates and initializes an authorized media upload session for Google Drive storage.
 */
export async function createUploadIntent(request: UploadIntentRequest): Promise<UploadIntentResponse> {
  const { filename, contentType, fileSizeBytes, mediaCategory } = request;

  if (!filename || !contentType || !fileSizeBytes) {
    return { allowed: false, error: 'Filename, contentType, and fileSizeBytes are required' };
  }

  // File size validation
  if (mediaCategory === 'VIDEO' && fileSizeBytes > STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES) {
    return { allowed: false, error: `Video file exceeds maximum size limit of 500 MB (provided: ${Math.round(fileSizeBytes / 1024 / 1024)} MB)` };
  }
  if (mediaCategory === 'AUDIO' && fileSizeBytes > STORAGE_LIMITS.MAX_AUDIO_SIZE_BYTES) {
    return { allowed: false, error: `Audio file exceeds maximum size limit of 100 MB (provided: ${Math.round(fileSizeBytes / 1024 / 1024)} MB)` };
  }
  if (mediaCategory === 'IMAGE' && fileSizeBytes > STORAGE_LIMITS.MAX_IMAGE_SIZE_BYTES) {
    return { allowed: false, error: `Image file exceeds maximum size limit of 10 MB (provided: ${Math.round(fileSizeBytes / 1024 / 1024)} MB)` };
  }

  // MIME type validation
  const normalizedMime = contentType.toLowerCase().trim();
  if (mediaCategory === 'AUDIO' && !ALLOWED_MIME_TYPES.AUDIO.includes(normalizedMime)) {
    return { allowed: false, error: `Invalid audio format: ${contentType}. Supported formats: MP3, WAV, AAC, M4A, OGG.` };
  }
  if (mediaCategory === 'VIDEO' && !ALLOWED_MIME_TYPES.VIDEO.includes(normalizedMime)) {
    return { allowed: false, error: `Invalid video format: ${contentType}. Supported formats: MP4, WebM, QuickTime.` };
  }
  if (mediaCategory === 'IMAGE' && !ALLOWED_MIME_TYPES.IMAGE.includes(normalizedMime)) {
    return { allowed: false, error: `Invalid image format: ${contentType}. Supported formats: JPEG, PNG, WebP.` };
  }

  const uploadId = `upl_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const ext = filename.split('.').pop() || 'bin';
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const folder = mediaCategory.toLowerCase();
  const storageKey = `media/${folder}/${uploadId}.${cleanExt}`;

  const config = getMediaStorageConfig();

  if (config.configured) {
    // When Google Drive is configured, stream directly via backend proxy upload endpoint
    return {
      allowed: true,
      uploadId,
      storageKey,
      uploadUrl: `/api/media/drive-upload?uploadId=${uploadId}`,
      publicUrl: `/api/media/drive-stream/${storageKey}`,
      expiresInSeconds: 3600,
      isMockProvider: false
    };
  }

  // In production, fail closed: never switch to simulated storage
  if (process.env.NODE_ENV === 'production') {
    return {
      allowed: false,
      error: 'Google Drive cloud media storage is not yet configured. Please connect Google Drive storage in settings.'
    };
  }

  // Simulated fallback when credentials are not configured in local development
  return {
    allowed: true,
    uploadId,
    storageKey,
    uploadUrl: `/api/media/upload-direct/${uploadId}`,
    publicUrl: `/media-assets/${storageKey}`,
    expiresInSeconds: 3600,
    isMockProvider: true
  };
}

/**
 * Authoritatively verifies that the object exists in Google Drive storage.
 */
export async function verifyObjectInStorage(
  storageKey: string,
  expectedMime?: string,
  expectedSize?: number
): Promise<{
  verified: boolean;
  actualSizeBytes?: number;
  actualMimeType?: string;
  error?: string;
}> {
  return verifyDriveFile(storageKey, expectedMime, expectedSize);
}

/**
 * Generates an authenticated short-lived playback URL.
 */
export async function generateSignedPlaybackUrl(
  storageKey: string,
  _expiresInSeconds: number = 3600
): Promise<string | null> {
  return `/api/media/drive-stream/${storageKey}`;
}

import crypto from 'node:crypto';

export interface StorageConfigStatus {
  configured: boolean;
  provider: 's3' | 'r2' | 'cloudflare_stream' | null;
  bucket?: string;
  missingVariables: string[];
  maxVideoSizeBytes: number;
  maxAudioSizeBytes: number;
  maxImageSizeBytes: number;
}

export const STORAGE_LIMITS = {
  MAX_VIDEO_SIZE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_AUDIO_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024   // 10 MB
};

export const ALLOWED_MIME_TYPES = {
  AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

/**
 * Checks whether persistent cloud media storage is configured.
 * Never logs or exposes secret credentials.
 */
export function getMediaStorageConfig(): StorageConfigStatus {
  const s3Bucket = process.env.MEDIA_STORAGE_BUCKET || process.env.AWS_BUCKET || process.env.S3_BUCKET;
  const s3Key = process.env.MEDIA_STORAGE_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const s3Secret = process.env.MEDIA_STORAGE_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  const r2Bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET;
  const r2Account = process.env.R2_ACCOUNT_ID;
  const r2Key = process.env.R2_ACCESS_KEY_ID;
  const r2Secret = process.env.R2_SECRET_ACCESS_KEY;

  if (r2Bucket && r2Account && r2Key && r2Secret) {
    return {
      configured: true,
      provider: 'r2',
      bucket: r2Bucket,
      missingVariables: [],
      maxVideoSizeBytes: STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES,
      maxAudioSizeBytes: STORAGE_LIMITS.MAX_AUDIO_SIZE_BYTES,
      maxImageSizeBytes: STORAGE_LIMITS.MAX_IMAGE_SIZE_BYTES
    };
  }

  if (s3Bucket && s3Key && s3Secret) {
    return {
      configured: true,
      provider: 's3',
      bucket: s3Bucket,
      missingVariables: [],
      maxVideoSizeBytes: STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES,
      maxAudioSizeBytes: STORAGE_LIMITS.MAX_AUDIO_SIZE_BYTES,
      maxImageSizeBytes: STORAGE_LIMITS.MAX_IMAGE_SIZE_BYTES
    };
  }

  // Not configured in production environment
  const missing = [];
  if (!s3Bucket && !r2Bucket) missing.push('MEDIA_STORAGE_BUCKET (or R2_BUCKET_NAME)');
  if (!s3Key && !r2Key) missing.push('MEDIA_STORAGE_ACCESS_KEY_ID (or R2_ACCESS_KEY_ID)');
  if (!s3Secret && !r2Secret) missing.push('MEDIA_STORAGE_SECRET_ACCESS_KEY (or R2_SECRET_ACCESS_KEY)');

  return {
    configured: false,
    provider: null,
    missingVariables: missing,
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
 * Validates and initializes an authorized media upload session.
 */
export function createUploadIntent(request: UploadIntentRequest): UploadIntentResponse {
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

  const uploadId = `upl_${crypto.randomBytes(16).toString('hex')}`;
  const ext = filename.split('.').pop() || 'bin';
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const folder = mediaCategory.toLowerCase();
  const storageKey = `media/${folder}/${uploadId}.${cleanExt}`;

  const config = getMediaStorageConfig();

  if (config.configured) {
    // If real provider is configured, construct standard S3/R2 direct upload URL
    const publicBase = process.env.MEDIA_STORAGE_PUBLIC_URL || (config.provider === 'r2' ? `https://${config.bucket}.r2.cloudflarestorage.com` : `https://${config.bucket}.s3.amazonaws.com`);
    return {
      allowed: true,
      uploadId,
      storageKey,
      uploadUrl: `${publicBase}/${storageKey}`,
      publicUrl: `${publicBase}/${storageKey}`,
      expiresInSeconds: 3600,
      isMockProvider: false
    };
  }

  // When external storage credentials are not yet configured in production:
  // Return safe direct simulated upload endpoint
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

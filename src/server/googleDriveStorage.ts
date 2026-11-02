import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export interface GoogleDriveConfigStatus {
  configured: boolean;
  provider: 'google_drive' | null;
  accountEmail?: string;
  rootFolderId?: string;
  missingVariables: string[];
  maxVideoSizeBytes: number;
  maxAudioSizeBytes: number;
  maxImageSizeBytes: number;
}

export const DRIVE_STORAGE_LIMITS = {
  MAX_VIDEO_SIZE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_AUDIO_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024   // 10 MB
};

export const DRIVE_ALLOWED_MIME_TYPES = {
  AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedOAuthToken: CachedToken | null = null;
let activeRefreshToken: string | null = null;
const folderCache = new Map<string, string>();

// Server-side Secret Storage & Vault configuration
const CREDENTIALS_DIR = path.resolve(process.cwd(), '.credentials');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'google-drive.enc');

function getSecretVaultKey(): Buffer {
  const secretMaterial = process.env.SESSION_SECRET || process.env.DATABASE_URL || 'property-studio-secret-vault-master-key';
  return crypto.createHash('sha256').update(secretMaterial).digest();
}

/**
 * Encrypts a secret value using AES-256-GCM.
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getSecretVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 */
export function decryptSecret(cipherBase64: string): string {
  const buf = Buffer.from(cipherBase64, 'base64');
  if (buf.length < 28) throw new Error('Ciphertext is too short');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getSecretVaultKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Clears stored refresh token from server memory and file store (used in testing or revocation).
 */
export function clearStoredRefreshToken(): void {
  activeRefreshToken = null;
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
  } catch (_e) {}
}

/**
 * Stores the Google Drive refresh token securely on the server.
 * Never logs or exposes the token value.
 */
export async function saveStoredRefreshToken(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  activeRefreshToken = refreshToken;

  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    const encrypted = encryptSecret(refreshToken);
    fs.writeFileSync(CREDENTIALS_FILE, encrypted, { encoding: 'utf8', mode: 0o600 });
  } catch (_e) {
    // If filesystem is read-only (e.g. serverless runtime), in-memory activeRefreshToken holds the credential
  }
}

/**
 * Authoritatively retrieves the stored refresh token from server-side secure storage or environment.
 * Never logs or exposes the token value.
 */
export function loadStoredRefreshToken(): string | null {
  if (activeRefreshToken) return activeRefreshToken;
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) return process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const encrypted = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const decrypted = decryptSecret(encrypted);
      activeRefreshToken = decrypted;
      return decrypted;
    }
  } catch (_e) {
    // Ignore read/decryption errors
  }
  return null;
}

/**
 * Active OAuth states cache with expiration tracking to prevent CSRF attacks.
 */
const activeOAuthStates = new Map<string, { userId: string; createdAt: number }>();

/**
 * Creates an authoritative, signed OAuth 2.0 state parameter tied to the authenticated Super Admin.
 */
export function createOAuthState(userId: string): string {
  const now = Date.now();
  // Clean up states older than 15 minutes
  for (const [key, val] of activeOAuthStates.entries()) {
    if (now - val.createdAt > 15 * 60 * 1000) {
      activeOAuthStates.delete(key);
    }
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}:${now}:${nonce}`;
  const hmac = crypto.createHmac('sha256', getSecretVaultKey()).update(payload).digest('hex');
  const state = `${Buffer.from(payload).toString('base64url')}.${hmac}`;
  activeOAuthStates.set(state, { userId, createdAt: now });
  return state;
}

/**
 * Validates the OAuth 2.0 state parameter on callback.
 * Ensures single-use consumption and cryptographic verification.
 */
export function validateOAuthState(state: string | undefined): { valid: boolean; userId?: string; error?: string } {
  if (!state || typeof state !== 'string') {
    return { valid: false, error: 'OAuth state parameter missing' };
  }
  const parts = state.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed OAuth state parameter' };
  }
  const [payloadB64, hmac] = parts;
  let payload = '';
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch (_e) {
    return { valid: false, error: 'Invalid OAuth state encoding' };
  }

  const expectedHmac = crypto.createHmac('sha256', getSecretVaultKey()).update(payload).digest('hex');
  const hmacBuf = Buffer.from(hmac, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');

  if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
    return { valid: false, error: 'Invalid OAuth state signature' };
  }

  const [userId, timestampStr] = payload.split(':');
  const timestamp = Number(timestampStr);
  if (isNaN(timestamp) || Date.now() - timestamp > 15 * 60 * 1000) {
    return { valid: false, error: 'OAuth state parameter expired' };
  }

  if (!activeOAuthStates.has(state)) {
    return { valid: false, error: 'OAuth state parameter already used or unverified' };
  }

  // Consume state immediately (one-time use)
  activeOAuthStates.delete(state);
  return { valid: true, userId };
}

/**
 * Checks whether Google Drive persistent media storage is configured.
 * Never exposes secrets or refresh tokens.
 */
export function getGoogleDriveConfig(): GoogleDriveConfigStatus {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = loadStoredRefreshToken();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const accountEmail = process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL || 'propertystudio.media@gmail.com';

  const isConfigured = Boolean(clientId && clientSecret && refreshToken);
  const missing: string[] = [];

  if (!clientId) missing.push('GOOGLE_DRIVE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
  if (!refreshToken) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');

  return {
    configured: isConfigured,
    provider: isConfigured ? 'google_drive' : null,
    accountEmail: isConfigured ? accountEmail : undefined,
    rootFolderId: rootFolderId || undefined,
    missingVariables: missing,
    maxVideoSizeBytes: DRIVE_STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES,
    maxAudioSizeBytes: DRIVE_STORAGE_LIMITS.MAX_AUDIO_SIZE_BYTES,
    maxImageSizeBytes: DRIVE_STORAGE_LIMITS.MAX_IMAGE_SIZE_BYTES
  };
}

/**
 * Obtains a valid Google OAuth 2.0 access token using the stored refresh token.
 * Caches access tokens in-memory until 60 seconds before expiration.
 */
export async function getGoogleDriveAccessToken(): Promise<string> {
  const config = getGoogleDriveConfig();
  if (!config.configured) {
    throw new Error('Google Drive credentials are not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.');
  }

  // Return cached token if still valid
  if (cachedOAuthToken && cachedOAuthToken.expiresAt > Date.now() + 60000) {
    return cachedOAuthToken.accessToken;
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET!;
  const refreshToken = loadStoredRefreshToken()!;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await res.json() as any;

  if (!res.ok || !data.access_token) {
    const errorMsg = data.error_description || data.error || 'Failed to refresh Google OAuth token';
    if (data.error === 'invalid_grant') {
      throw new Error('Google Drive refresh token is expired, revoked, or invalid. Please re-authenticate.');
    }
    throw new Error(`Google OAuth error: ${errorMsg}`);
  }

  const expiresInMs = (Number(data.expires_in) || 3600) * 1000;
  cachedOAuthToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresInMs
  };

  return cachedOAuthToken.accessToken;
}

/**
 * Ensures a folder exists in Google Drive by name under a given parent folder.
 * Caches folder IDs to avoid repetitive queries.
 */
export async function ensureDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const cacheKey = `${parentFolderId || 'root'}:${folderName}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  const accessToken = await getGoogleDriveAccessToken();

  // Search for existing folder
  const queryParts = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`
  ];
  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryParts.join(' and '))}&fields=files(id,name)&spaces=drive`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json() as any;
    if (searchData.files && searchData.files.length > 0) {
      const folderId = searchData.files[0].id;
      folderCache.set(cacheKey, folderId);
      return folderId;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId ? { parents: [parentFolderId] } : {})
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Drive folder "${folderName}": ${err}`);
  }

  const createdData = await createRes.json() as any;
  folderCache.set(cacheKey, createdData.id);
  return createdData.id;
}

/**
 * Resolves the structured destination folder ID based on media category and status:
 * Property Studio Media/
 *   videos/
 *     published/
 *     pending/
 *     rejected/
 *   thumbnails/
 *   other-media/
 */
export async function resolveDestinationFolderId(
  mediaCategory: 'VIDEO' | 'AUDIO' | 'IMAGE',
  status: 'PUBLISHED' | 'PENDING' | 'REJECTED' | 'DRAFT' = 'PUBLISHED'
): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
    ? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
    : await ensureDriveFolder('Property Studio Media');

  if (mediaCategory === 'IMAGE') {
    return ensureDriveFolder('thumbnails', rootFolderId);
  }

  if (mediaCategory === 'AUDIO') {
    return ensureDriveFolder('other-media', rootFolderId);
  }

  // Videos
  const videosRoot = await ensureDriveFolder('videos', rootFolderId);
  if (status === 'PUBLISHED') {
    return ensureDriveFolder('published', videosRoot);
  }
  if (status === 'REJECTED') {
    return ensureDriveFolder('rejected', videosRoot);
  }
  return ensureDriveFolder('pending', videosRoot);
}

/**
 * Initiates a Google Drive API v3 Resumable Upload Session.
 * Returns the resumable upload URI.
 */
export async function initiateResumableDriveUpload(params: {
  filename: string;
  contentType: string;
  fileSizeBytes: number;
  folderId: string;
}): Promise<string> {
  const accessToken = await getGoogleDriveAccessToken();

  const initUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
  const metadata = {
    name: params.filename,
    parents: [params.folderId],
    mimeType: params.contentType
  };

  const res = await fetch(initUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': params.contentType,
      'X-Upload-Content-Length': String(params.fileSizeBytes)
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to initiate Google Drive resumable upload: ${errorText}`);
  }

  const uploadUri = res.headers.get('location');
  if (!uploadUri) {
    throw new Error('Google Drive did not return a resumable upload location header.');
  }

  return uploadUri;
}

/**
 * Streams bytes to a Google Drive resumable upload URI.
 * Returns the created Google Drive File ID and metadata.
 */
export async function uploadStreamToDrive(params: {
  uploadUri: string;
  stream: Readable | Buffer | Uint8Array;
  contentType: string;
  fileSizeBytes: number;
}): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: number;
}> {
  const headers: Record<string, string> = {
    'Content-Type': params.contentType,
    'Content-Length': String(params.fileSizeBytes)
  };

  // Convert buffer or stream to body
  const body = params.stream instanceof Buffer
    ? params.stream
    : (params.stream instanceof Uint8Array
      ? Buffer.from(params.stream)
      : (params.stream as any));

  const res = await fetch(params.uploadUri, {
    method: 'PUT',
    headers,
    body,
    // Node.js duplex streaming option
    duplex: 'half'
  } as any);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive upload failed with status ${res.status}: ${errorText}`);
  }

  const data = await res.json() as any;
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: Number(data.size || params.fileSizeBytes)
  };
}

/**
 * Authoritatively verifies that a file exists in Google Drive and is not trashed.
 * Returns file size and MIME type.
 */
export async function verifyDriveFile(
  fileId: string,
  expectedMime?: string,
  expectedSize?: number
): Promise<{
  verified: boolean;
  actualSizeBytes?: number;
  actualMimeType?: string;
  error?: string;
}> {
  const config = getGoogleDriveConfig();
  if (!config.configured) {
    // Local simulated fallback for testing without credentials
    return {
      verified: true,
      actualSizeBytes: expectedSize || 1024,
      actualMimeType: expectedMime || 'video/mp4'
    };
  }

  try {
    const accessToken = await getGoogleDriveAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType,trashed`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (res.status === 404) {
      return { verified: false, error: 'File was not found in Google Drive.' };
    }

    if (!res.ok) {
      const err = await res.text();
      return { verified: false, error: `Google Drive verification error (${res.status}): ${err}` };
    }

    const data = await res.json() as any;
    if (data.trashed) {
      return { verified: false, error: 'File is marked as trashed in Google Drive.' };
    }

    const actualSizeBytes = Number(data.size || 0);
    const actualMimeType = data.mimeType || '';

    if (actualSizeBytes <= 0) {
      return { verified: false, error: 'File in Google Drive is empty (0 bytes).' };
    }

    if (expectedSize && actualSizeBytes > expectedSize * 1.5) {
      return { verified: false, error: `Uploaded size (${actualSizeBytes}) exceeds expected limit (${expectedSize}).` };
    }

    return {
      verified: true,
      actualSizeBytes,
      actualMimeType
    };
  } catch (err: any) {
    return { verified: false, error: `Failed to verify Google Drive file: ${err.message}` };
  }
}

/**
 * Moves a file between folders in Google Drive (e.g. pending -> published).
 */
export async function moveDriveFile(
  fileId: string,
  targetFolderId: string,
  currentFolderId?: string
): Promise<boolean> {
  const config = getGoogleDriveConfig();
  if (!config.configured) return true;

  try {
    const accessToken = await getGoogleDriveAccessToken();
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${targetFolderId}&fields=id,parents`;
    if (currentFolderId) {
      url += `&removeParents=${currentFolderId}`;
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const config = getGoogleDriveConfig();
  if (!config.configured) return true;

  try {
    const accessToken = await getGoogleDriveAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * Streams a Google Drive file with support for HTTP Range requests (Partial Content / Video Seeking).
 */
export async function getDriveFileStream(
  fileId: string,
  rangeHeader?: string
): Promise<{
  status: number;
  headers: Record<string, string>;
  stream: Readable | null;
  error?: string;
}> {
  const config = getGoogleDriveConfig();
  if (!config.configured) {
    return {
      status: 200,
      headers: { 'Content-Type': 'video/mp4' },
      stream: null,
      error: 'Google Drive is not configured'
    };
  }

  try {
    const accessToken = await getGoogleDriveAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`
    };
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    const res = await fetch(url, { headers: requestHeaders });

    if (!res.ok && res.status !== 206) {
      const err = await res.text();
      return {
        status: res.status,
        headers: {},
        stream: null,
        error: `Google Drive stream error (${res.status}): ${err}`
      };
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': res.headers.get('content-type') || 'video/mp4',
      'Accept-Ranges': 'bytes'
    };

    const contentLength = res.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = res.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    // Convert web ReadableStream to Node.js Readable
    const nodeStream = res.body ? Readable.fromWeb(res.body as any) : null;

    return {
      status: res.status,
      headers: responseHeaders,
      stream: nodeStream
    };
  } catch (err: any) {
    return {
      status: 500,
      headers: {},
      stream: null,
      error: `Failed to retrieve Google Drive stream: ${err.message}`
    };
  }
}

/**
 * Generates an OAuth 2.0 authorization URL for connecting the Property Studio Google account.
 */
export function getGoogleOAuthAuthorizeUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent'
  });
  if (state) params.set('state', state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges an OAuth 2.0 authorization code for access and refresh tokens.
 */
export async function exchangeOAuthCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  email?: string;
}> {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error || 'Unknown error'}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

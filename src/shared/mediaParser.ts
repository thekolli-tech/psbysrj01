/**
 * Property Studio - Multimedia Parser & Streaming URL Security Validator
 *
 * Supports YouTube (Standard, Shorts, Live, Embed), HLS (.m3u8), DASH (.mpd),
 * Audio Podcasts (MP3, WAV, AAC), Google Drive Object Storage, and External Providers.
 */

export type MediaContentType = 'VIDEO' | 'PODCAST' | 'LIVE_VIDEO' | 'LIVE_AUDIO';
export type MediaProvider =
  | 'YOUTUBE'
  | 'GOOGLE_DRIVE'
  | 'EXTERNAL_HLS'
  | 'EXTERNAL_DASH'
  | 'EXTERNAL_AUDIO'
  | 'EXTERNAL_VIDEO'
  | 'RTMP_INGEST_UNSUPPORTED'
  | 'UNSUPPORTED';

export type BroadcastStatus = 'LIVE' | 'UPCOMING' | 'ENDED' | null;

export interface YouTubeParseResult {
  isValid: boolean;
  videoId?: string;
  embedUrl?: string;
  watchUrl?: string;
  thumbnailUrl?: string;
  maxResThumbnailUrl?: string;
  isShorts?: boolean;
  isLive?: boolean;
  error?: string;
}

export interface MediaDetectionResult {
  isValid: boolean;
  provider: MediaProvider;
  contentType: MediaContentType;
  playbackUrl: string;
  thumbnailUrl?: string;
  providerVideoId?: string;
  isLive: boolean;
  isShorts?: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validates and extracts video ID, embed URL, and high-resolution thumbnail from YouTube URLs.
 * Handles:
 * - youtube.com/watch?v=...
 * - youtu.be/...
 * - youtube.com/shorts/...
 * - youtube.com/embed/...
 * - youtube.com/live/...
 */
export function parseYouTubeUrl(rawUrl: string): YouTubeParseResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmed = rawUrl.trim();

  // Basic protocol check
  if (!/^https?:\/\//i.test(trimmed)) {
    return { isValid: false, error: 'Invalid URL format. Must start with http:// or https://' };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    const isYouTubeHost =
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtu.be';

    if (!isYouTubeHost) {
      return { isValid: false, error: 'Not a recognized YouTube domain' };
    }

    let videoId: string | null = null;
    let isShorts = false;
    let isLive = false;

    if (host === 'youtu.be') {
      // e.g. https://youtu.be/dQw4w9WgXcQ
      const segment = pathname.slice(1).split('/')[0];
      if (segment && /^[a-zA-Z0-9_-]{11}$/.test(segment)) {
        videoId = segment;
      }
    } else {
      // youtube.com variants
      if (pathname === '/watch') {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
          videoId = v;
        }
      } else if (pathname.startsWith('/shorts/')) {
        const segment = pathname.replace('/shorts/', '').split('/')[0];
        if (segment && /^[a-zA-Z0-9_-]{11}$/.test(segment)) {
          videoId = segment;
          isShorts = true;
        }
      } else if (pathname.startsWith('/embed/')) {
        const segment = pathname.replace('/embed/', '').split('/')[0];
        if (segment && /^[a-zA-Z0-9_-]{11}$/.test(segment)) {
          videoId = segment;
        }
      } else if (pathname.startsWith('/live/')) {
        const segment = pathname.replace('/live/', '').split('/')[0];
        if (segment && /^[a-zA-Z0-9_-]{11}$/.test(segment)) {
          videoId = segment;
          isLive = true;
        }
      }
    }

    if (!videoId) {
      return { isValid: false, error: 'Could not extract valid 11-character YouTube video ID' };
    }

    return {
      isValid: true,
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`,
      watchUrl: isShorts
        ? `https://www.youtube.com/shorts/${videoId}`
        : isLive
        ? `https://www.youtube.com/live/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      maxResThumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      isShorts,
      isLive
    };
  } catch {
    return { isValid: false, error: 'Malformed URL' };
  }
}

/**
 * Validates streaming and media URLs for web player compatibility and security.
 * Rejects RTMP/RTMPS protocols with clear explanation since web browsers cannot play raw RTMP.
 */
export function validateMediaUrl(rawUrl: string): { isValid: boolean; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Media URL is empty or invalid.' };
  }

  const trimmed = rawUrl.trim();

  // Reject RTMP/RTMPS ingest protocols explicitly
  if (/^rtmps?:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      error:
        'RTMP is an ingest-only protocol for broadcast encoder software (e.g. OBS Studio) and cannot be played directly in web browsers. Please provide an HLS (.m3u8) playback URL or YouTube Live URL.'
    };
  }

  // Reject unsafe schemes
  if (/^(javascript|data|file|vbscript|about):/i.test(trimmed)) {
    return {
      isValid: false,
      error: 'Unsafe URL scheme detected. Only http://, https:// or internal storage paths are permitted.'
    };
  }

  // Allow internal stream routes: /api/media/...
  if (trimmed.startsWith('/api/media/')) {
    return { isValid: true };
  }

  // Require https or http
  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL must start with https:// or http://'
    };
  }

  try {
    new URL(trimmed);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Malformed URL syntax.' };
  }
}

/**
 * Classifies media URL and returns detected provider, content type, playback configuration,
 * and thumbnail.
 */
export function detectMediaConfig(
  rawUrl: string,
  options?: {
    explicitContentType?: MediaContentType;
    isLiveBroadcast?: boolean;
    customThumbnail?: string;
  }
): MediaDetectionResult {
  const validation = validateMediaUrl(rawUrl);
  if (!validation.isValid) {
    const isRtmp = /^rtmps?:\/\//i.test(rawUrl.trim());
    return {
      isValid: false,
      provider: isRtmp ? 'RTMP_INGEST_UNSUPPORTED' : 'UNSUPPORTED',
      contentType: options?.explicitContentType || 'VIDEO',
      playbackUrl: rawUrl,
      isLive: Boolean(options?.isLiveBroadcast),
      error: validation.error
    };
  }

  const trimmed = rawUrl.trim();

  // 1. Check for Google Drive streaming endpoint
  if (trimmed.startsWith('/api/media/') && trimmed.includes('/stream')) {
    const isPodcast = options?.explicitContentType === 'PODCAST';
    return {
      isValid: true,
      provider: 'GOOGLE_DRIVE',
      contentType: isPodcast ? 'PODCAST' : 'VIDEO',
      playbackUrl: trimmed,
      thumbnailUrl: options?.customThumbnail,
      isLive: false
    };
  }

  // 2. Check for YouTube
  const yt = parseYouTubeUrl(trimmed);
  if (yt.isValid && yt.videoId) {
    const isLive = yt.isLive || Boolean(options?.isLiveBroadcast);
    const contentType: MediaContentType = isLive ? 'LIVE_VIDEO' : 'VIDEO';
    return {
      isValid: true,
      provider: 'YOUTUBE',
      contentType,
      playbackUrl: yt.embedUrl!,
      thumbnailUrl: options?.customThumbnail || yt.thumbnailUrl,
      providerVideoId: yt.videoId,
      isLive,
      isShorts: yt.isShorts
    };
  }

  // 3. Check for HLS (.m3u8)
  if (/\.m3u8(\?.*)?$/i.test(trimmed) || trimmed.includes('/hls/')) {
    const isAudio =
      options?.explicitContentType === 'LIVE_AUDIO' ||
      options?.explicitContentType === 'PODCAST' ||
      /\/(audio|podcast)\.m3u8/i.test(trimmed);

    const contentType: MediaContentType = isAudio
      ? (options?.isLiveBroadcast ? 'LIVE_AUDIO' : 'PODCAST')
      : (options?.isLiveBroadcast !== false ? 'LIVE_VIDEO' : 'VIDEO');

    return {
      isValid: true,
      provider: 'EXTERNAL_HLS',
      contentType,
      playbackUrl: trimmed,
      thumbnailUrl: options?.customThumbnail,
      isLive: options?.isLiveBroadcast ?? true
    };
  }

  // 4. Check for DASH (.mpd)
  if (/\.mpd(\?.*)?$/i.test(trimmed)) {
    return {
      isValid: true,
      provider: 'EXTERNAL_DASH',
      contentType: options?.isLiveBroadcast ? 'LIVE_VIDEO' : 'VIDEO',
      playbackUrl: trimmed,
      thumbnailUrl: options?.customThumbnail,
      isLive: Boolean(options?.isLiveBroadcast)
    };
  }

  // 5. Check for Audio formats (MP3, WAV, AAC, M4A, OGG)
  if (/\.(mp3|wav|aac|m4a|ogg|opus)(\?.*)?$/i.test(trimmed)) {
    const isLive = Boolean(options?.isLiveBroadcast);
    return {
      isValid: true,
      provider: 'EXTERNAL_AUDIO',
      contentType: isLive ? 'LIVE_AUDIO' : 'PODCAST',
      playbackUrl: trimmed,
      thumbnailUrl: options?.customThumbnail,
      isLive
    };
  }

  // 6. Check for Video formats (MP4, WebM, MOV)
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return {
      isValid: true,
      provider: 'EXTERNAL_VIDEO',
      contentType: options?.isLiveBroadcast ? 'LIVE_VIDEO' : 'VIDEO',
      playbackUrl: trimmed,
      thumbnailUrl: options?.customThumbnail,
      isLive: Boolean(options?.isLiveBroadcast)
    };
  }

  // 7. General external web URL fallback
  return {
    isValid: true,
    provider: 'EXTERNAL_VIDEO',
    contentType: options?.explicitContentType || (options?.isLiveBroadcast ? 'LIVE_VIDEO' : 'VIDEO'),
    playbackUrl: trimmed,
    thumbnailUrl: options?.customThumbnail,
    isLive: Boolean(options?.isLiveBroadcast),
    warning: 'External provider URL will be rendered via responsive web player fallback.'
  };
}

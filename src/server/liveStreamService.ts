import crypto from 'node:crypto';

export interface LiveStreamingConfigStatus {
  configured: boolean;
  provider: 'cloudflare_stream' | 'mux' | 'aws_ivs' | null;
  missingVariables: string[];
  supportedProtocols: string[];
}

export function getLiveStreamingConfig(): LiveStreamingConfigStatus {
  const cfToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const cfAccount = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID;

  const muxKey = process.env.MUX_TOKEN_ID;
  const muxSecret = process.env.MUX_TOKEN_SECRET;

  if (cfToken && cfAccount) {
    return {
      configured: true,
      provider: 'cloudflare_stream',
      missingVariables: [],
      supportedProtocols: ['RTMPS', 'WHIP', 'HLS']
    };
  }

  if (muxKey && muxSecret) {
    return {
      configured: true,
      provider: 'mux',
      missingVariables: [],
      supportedProtocols: ['RTMP', 'HLS']
    };
  }

  const missing = [];
  if (!cfToken && !muxKey) missing.push('CLOUDFLARE_STREAM_API_TOKEN (or MUX_TOKEN_ID)');
  if (!cfAccount && !muxSecret) missing.push('CLOUDFLARE_STREAM_ACCOUNT_ID (or MUX_TOKEN_SECRET)');

  return {
    configured: false,
    provider: null,
    missingVariables: missing,
    supportedProtocols: ['RTMPS', 'HLS (Simulation)']
  };
}

export interface BroadcastCredentials {
  streamId: string;
  playbackUrl: string; // Public HLS stream (.m3u8)
  ingestUrl: string;   // Private RTMP/RTMPS ingest URL
  streamKey: string;   // Private stream key
  isLiveConfigured: boolean;
}

/**
 * Initializes ingest instructions and playback endpoints for a broadcast.
 * If credentials are not configured, provides a deterministic simulation with private keys
 * and explicitly marks isLiveConfigured: false.
 */
export async function initializeBroadcastStream(broadcastId: string, title: string): Promise<BroadcastCredentials> {
  const config = getLiveStreamingConfig();

  if (config.configured && config.provider === 'cloudflare_stream') {
    // If real Cloudflare Stream credentials exist, invoke Cloudflare Stream Live Inputs API:
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_STREAM_ACCOUNT_ID}/stream/live_inputs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meta: { name: `Property Studio: ${title.slice(0, 50)} (${broadcastId})` },
          recording: { mode: 'automatic', timeoutSeconds: 300 }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const result = data.result;
        return {
          streamId: result.uid,
          playbackUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_ACCOUNT_ID}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
          ingestUrl: result.rtmps?.url || 'rtmps://live.cloudflare.com:443/live/',
          streamKey: result.rtmps?.streamKey || '',
          isLiveConfigured: true
        };
      }
    } catch (err) {
      console.warn('[Live Streaming] Failed calling Cloudflare Stream API:', err);
    }
  }

  // Fallback / Structure Mode when provider credentials are not yet configured in production
  const safeId = broadcastId.replace(/[^a-zA-Z0-9_-]/g, '');
  const privateKey = `ps_live_${crypto.randomBytes(24).toString('hex')}`;
  return {
    streamId: `st_${safeId}`,
    playbackUrl: `https://live.propertystudio.org/hls/${safeId}.m3u8`,
    ingestUrl: 'rtmps://ingest.propertystudio.org:443/live',
    streamKey: privateKey,
    isLiveConfigured: false
  };
}

/**
 * Strips private ingest details before returning broadcast data to non-superadmin viewers.
 */
export function sanitizeBroadcastForViewer<T extends { stream_key?: string; ingest_url?: string }>(broadcast: T): Omit<T, 'stream_key' | 'ingest_url'> {
  const { stream_key, ingest_url, ...safeBroadcast } = broadcast;
  return safeBroadcast;
}

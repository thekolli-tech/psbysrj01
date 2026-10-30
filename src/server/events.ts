import type { Response } from 'express';

export interface SseClient {
  id: string;
  userId?: string;
  userRole?: string;
  res: Response;
}

const sseClients = new Set<SseClient>();

const activityTimestamps = {
  posts: Date.now(),
  communities: Date.now(),
  notifications: Date.now(),
  media: Date.now(),
  lastUpdated: Date.now()
};

export function recordActivity(domain: 'posts' | 'communities' | 'notifications' | 'media'): void {
  const now = Date.now();
  activityTimestamps[domain] = now;
  activityTimestamps.lastUpdated = now;
}

export function getActivityTimestamps() {
  return { ...activityTimestamps };
}

export function addSseClient(client: SseClient): void {
  sseClients.add(client);
}

export function removeSseClient(client: SseClient): void {
  sseClients.delete(client);
}

export function getSseClientCount(): number {
  return sseClients.size;
}

export function broadcastSseEvent(eventType: string, data: any, targetUserId?: string): void {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (!targetUserId || client.userId === targetUserId) {
      try {
        client.res.write(payload);
      } catch (_e) {
        sseClients.delete(client);
      }
    }
  }
}

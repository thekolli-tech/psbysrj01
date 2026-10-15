const hits = new Map<string, number[]>();

/** Returns true when the caller is still inside the window. */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(stamp => now - stamp < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientKey(ip: string | undefined, action: string, identity = ''): string {
  return `${action}:${ip || 'unknown'}:${identity.toLowerCase()}`;
}

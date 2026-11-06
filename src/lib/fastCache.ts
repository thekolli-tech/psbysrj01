/**
 * Ultra-Fast Microsecond SWR In-Memory & Session Cache
 * Delivers sub-millisecond (0ms) synchronous UI updates with background revalidation.
 */

const memoryCache = new Map<string, { data: any; timestamp: number }>();

export function getInstantCached<T>(key: string): T | null {
  const mem = memoryCache.get(key);
  if (mem) return mem.data as T;

  if (typeof window !== 'undefined') {
    try {
      const sess = sessionStorage.getItem(`ps_fast_${key}`);
      if (sess) {
        const parsed = JSON.parse(sess);
        memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
        return parsed.data as T;
      }
    } catch {}
  }
  return null;
}

export function setInstantCache(key: string, data: any): void {
  const timestamp = Date.now();
  memoryCache.set(key, { data, timestamp });
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`ps_fast_${key}`, JSON.stringify({ data, timestamp }));
    } catch {}
  }
}

/**
 * Fast SWR Fetch: Returns immediately from cache if available (< 1ms),
 * and revalidates in the background without blocking UI thread.
 */
export async function fastSwrFetch<T>(
  url: string,
  onData: (data: T, isFromCache: boolean) => void,
  options?: RequestInit
): Promise<void> {
  const cached = getInstantCached<T>(url);
  if (cached !== null) {
    onData(cached, true);
  }

  try {
    const res = await fetch(url, options);
    if (!res.ok) return;
    const fresh = await res.json();
    setInstantCache(url, fresh);
    onData(fresh, false);
  } catch (err) {
    // Retain cached data silently on network jitter
  }
}

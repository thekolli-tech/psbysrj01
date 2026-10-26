/**
 * Community discussion engagement. Vote totals are calculated by the server.
 * These helpers only validate input and build public links.
 */

export const COMMUNITY_SEARCH_MAX = 80;

export function readCommunitySearch(input: unknown): { q: string } | { error: string } {
  if (input == null || input === '') return { q: '' };
  if (typeof input !== 'string') return { error: 'Search must be text.' };
  const q = input.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return { q: '' };
  if (/[<>]/.test(q)) return { error: 'Search cannot include HTML.' };
  if (q.length > COMMUNITY_SEARCH_MAX) {
    return { error: `Search must be ${COMMUNITY_SEARCH_MAX} characters or fewer.` };
  }
  return { q };
}

export function communitySearchLikePattern(q: string): string {
  return `%${q.toLowerCase().replace(/[\\%_]/g, match => `\\${match}`)}%`;
}

export function readCommunityVote(input: unknown): 1 | -1 | 0 | { error: string } {
  if (input === 1 || input === -1 || input === 0) return input;
  return { error: 'Vote must be agree (1), disagree (-1), or remove (0).' };
}

export function isCommunityPostId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

/** Public discussion link. The id is the only identifier. */
export function communityPostShareUrl(origin: string, postId: string): string {
  if (!isCommunityPostId(postId)) return '';
  const base = origin.replace(/\/$/, '');
  return `${base}/?view=community&post=${encodeURIComponent(postId)}`;
}

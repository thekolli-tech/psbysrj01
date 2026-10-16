/**
 * Vercel invokes one serverless function for every /api path.
 * Some hosts pass the path without the /api prefix. Express routes keep the prefix.
 */
export function expressPathForHostedRequest(url: string | undefined): string {
  const raw = url && url.length > 0 ? url : '/';
  const queryIndex = raw.indexOf('?');
  const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : raw.slice(queryIndex);
  if (path === '/api' || path.startsWith('/api/')) return raw;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `/api${suffix}${query}`;
}

export function registrationFailureMessage(status: number): string {
  if (status === 404) {
    return 'The registration service is not available on this site yet. No account was created.';
  }
  return 'The server could not complete that request. No account was created.';
}

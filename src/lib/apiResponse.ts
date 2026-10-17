import { registrationFailureMessage } from '../server/hostedApi.ts';

export interface ApiResponseBody {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  error: string;
}

function hostError(message: string): boolean {
  return /the page could not be found|<!doctype|<html|unexpected token/i.test(message);
}

function errorText(data: Record<string, unknown> | null): string {
  const raw = data?.error;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof (raw as { message?: unknown }).message === 'string') {
    return (raw as { message: string }).message;
  }
  return '';
}

/** Reads a fetch response without throwing on HTML or plain-text host errors. */
export async function readApiResponse(response: Response): Promise<ApiResponseBody> {
  const text = await response.text();
  const trimmed = text.trim();
  let data: Record<string, unknown> | null = null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      data = null;
    }
  }
  const message = errorText(data);
  const usable = message && !hostError(message) ? message : '';
  return {
    ok: response.ok,
    status: response.status,
    data,
    error: response.ok ? '' : (usable || registrationFailureMessage(response.status))
  };
}

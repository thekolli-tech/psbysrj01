import { SupportedLocale, TranslationDictionary } from '../types';
import { en } from './en';
import { te } from './te';
import { hi } from './hi';
import { kn } from './kn';
import { ta } from './ta';
import { ml } from './ml';
import { bn } from './bn';
import { mr } from './mr';
import { gu } from './gu';
import { pa } from './pa';
import { ur } from './ur';

export const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  en,
  te,
  hi,
  kn,
  ta,
  ml,
  bn,
  mr,
  gu,
  pa,
  ur
};

/**
 * Resolves a translation key in the given locale.
 * Fallback priority:
 * 1. Current locale dictionary
 * 2. English canonical dictionary
 * 3. The raw key itself (with dev warning)
 */
export function translate(
  locale: SupportedLocale,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = DICTIONARIES[locale] || en;
  let text = dict[key];

  if (text === undefined) {
    text = en[key];
    if (text === undefined) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing translation key: "${key}" for locale "${locale}"`);
      }
      return key;
    }
  }

  if (params && Object.keys(params).length > 0) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }

  return text;
}

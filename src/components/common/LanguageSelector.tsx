import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation, SupportedLocale, LanguageDefinition } from '../../i18n/useTranslation';
import { Globe, Check, Search, X } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'header' | 'mobile' | 'footer' | 'settings';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { locale, setLocale, currentLanguage, supportedLanguages, t, isRtl } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter languages by English name or native script name
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return supportedLanguages;
    return supportedLanguages.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery, supportedLanguages]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredLanguages.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredLanguages.length - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredLanguages.length) {
      e.preventDefault();
      const chosen = filteredLanguages[focusedIndex];
      handleSelect(chosen.code);
    }
  };

  const handleSelect = async (code: SupportedLocale) => {
    await setLocale(code);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('lang.selectLanguage')}: ${currentLanguage.nativeName} (${currentLanguage.name})`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span className="font-medium tracking-tight">
          <span className="font-semibold text-slate-900">{currentLanguage.nativeName}</span>
          {variant !== 'mobile' && (
            <span className="text-slate-400 text-[10px] ml-1 hidden sm:inline">
              ({currentLanguage.name})
            </span>
          )}
        </span>
      </button>

      {/* Popover / Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t('lang.selectLanguage')}
          className={`absolute ${
            isRtl ? 'left-0' : 'right-0'
          } mt-2 w-72 max-w-[90vw] rounded-xl bg-white shadow-xl border border-slate-200 z-50 overflow-hidden transform transition-all animate-in fade-in duration-150`}
        >
          {/* Header & Search Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between pb-1.5 px-1">
              <span className="text-[11px] font-bold tracking-wide uppercase text-slate-500">
                {t('lang.selectLanguage')}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-0.5 cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative flex items-center">
              <Search
                className={`w-3.5 h-3.5 text-slate-400 absolute ${
                  isRtl ? 'right-2.5' : 'left-2.5'
                } pointer-events-none`}
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('lang.searchPlaceholder')}
                className={`w-full ${
                  isRtl ? 'pr-8 pl-3' : 'pl-8 pr-3'
                } py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500`}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Languages List */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label={t('lang.selectLanguage')}
            className="max-h-64 overflow-y-auto p-1.5 space-y-0.5"
          >
            {filteredLanguages.length === 0 ? (
              <li className="py-4 text-center text-xs text-slate-500">
                {t('lang.noResults')}
              </li>
            ) : (
              filteredLanguages.map((lang, index) => {
                const isSelected = lang.code === locale;
                const isFocused = index === focusedIndex;
                return (
                  <li
                    key={lang.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(lang.code)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-950 font-semibold'
                        : isFocused
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-900">
                        {lang.nativeName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {lang.name}
                      </span>
                      {lang.direction === 'rtl' && (
                        <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-slate-200/80 text-slate-600 font-semibold">
                          RTL
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

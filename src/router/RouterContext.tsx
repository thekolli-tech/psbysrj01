import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { matchRoute, RouteMatch, urlForView } from './routes';
import type { ViewType, NavItemKey } from '../types';

interface RouterContextType {
  currentPath: string;
  route: RouteMatch;
  searchParams: URLSearchParams;
  hash: string;
  navigate: (to: string, options?: { replace?: boolean; skipScroll?: boolean }) => void;
  redirectToLogin: (intendedUrl?: string) => void;
  getRedirectUrl: () => string | null;
  clearRedirectUrl: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function getCurrentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function getSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function getHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash || '';
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(getCurrentPath);
  const [searchParams, setSearchParams] = useState<URLSearchParams>(getSearchParams);
  const [hash, setHash] = useState<string>(getHash);

  // Sync state with browser location
  const updateLocationState = useCallback(() => {
    const newPath = getCurrentPath();
    const newSearch = getSearchParams();
    const newHash = getHash();

    setCurrentPath(newPath);
    setSearchParams(newSearch);
    setHash(newHash);
  }, []);

  useEffect(() => {
    // Listen for browser Back/Forward (popstate)
    const handlePopState = () => {
      updateLocationState();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateLocationState]);

  // Navigate function that pushes or replaces history state
  const navigate = useCallback((to: string, options?: { replace?: boolean; skipScroll?: boolean }) => {
    if (typeof window === 'undefined') return;

    const targetUrl = new URL(to, window.location.origin);
    const targetPath = targetUrl.pathname;
    const targetSearch = targetUrl.search;
    const targetHash = targetUrl.hash;
    const fullTarget = targetPath + targetSearch + targetHash;

    const currentFull = window.location.pathname + window.location.search + window.location.hash;
    if (fullTarget === currentFull) return;

    if (options?.replace) {
      window.history.replaceState({ path: fullTarget }, '', fullTarget);
    } else {
      window.history.pushState({ path: fullTarget }, '', fullTarget);
    }

    setCurrentPath(targetPath);
    setSearchParams(new URLSearchParams(targetSearch));
    setHash(targetHash);

    if (!options?.skipScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Login redirect memory
  const redirectToLogin = useCallback((intendedUrl?: string) => {
    if (typeof window === 'undefined') return;
    const target = intendedUrl || (window.location.pathname + window.location.search);
    try {
      sessionStorage.setItem('ps_redirect_after_login', target);
    } catch {}
  }, []);

  const getRedirectUrl = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('ps_redirect_after_login');
    } catch {
      return null;
    }
  }, []);

  const clearRedirectUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem('ps_redirect_after_login');
    } catch {}
  }, []);

  // Compute active route matching
  const route = useMemo(() => {
    return matchRoute(currentPath);
  }, [currentPath]);

  const value = useMemo(() => ({
    currentPath,
    route,
    searchParams,
    hash,
    navigate,
    redirectToLogin,
    getRedirectUrl,
    clearRedirectUrl
  }), [currentPath, route, searchParams, hash, navigate, redirectToLogin, getRedirectUrl, clearRedirectUrl]);

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

/**
 * Clean Link component for SPA navigation with native URL behavior
 */
export const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean }> = ({
  to,
  replace,
  onClick,
  children,
  ...props
}) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let browser handle modifier clicks (Ctrl+Click, Cmd+Click, Shift+Click, middle click)
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.altKey ||
      e.ctrlKey ||
      e.shiftKey ||
      props.target === '_blank'
    ) {
      return;
    }

    e.preventDefault();
    onClick?.(e);
    navigate(to, { replace });
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

import { Capacitor } from '@capacitor/core';

const DEFAULT_PUBLIC_SITE_URL = 'https://khmerzoon.biz';

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

/**
 * Base URL used for sharing links and meta tags.
 * - Native apps: uses the production domain (or VITE_PUBLIC_SITE_URL).
 * - Web: uses VITE_PUBLIC_SITE_URL if set, otherwise current origin.
 */
export const getPublicSiteUrl = () => {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();

  if (fromEnv) return normalizeBaseUrl(fromEnv);

  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return normalizeBaseUrl(DEFAULT_PUBLIC_SITE_URL);
  }

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(window.location.origin);
  }

  return normalizeBaseUrl(DEFAULT_PUBLIC_SITE_URL);
};

export const getCanonicalUrl = () => {
  if (typeof window === 'undefined') return `${getPublicSiteUrl()}/`;
  return `${getPublicSiteUrl()}${window.location.pathname}${window.location.search}`;
};

export const toAbsoluteUrl = (url?: string) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getPublicSiteUrl();
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

const ensureTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);
const BASE_URL = ensureTrailingSlash(import.meta.env.BASE_URL || '/');

export function assetPath(relative = '') {
  if (!relative) return BASE_URL;
  const withoutDot = relative.startsWith('./') ? relative.slice(2) : relative;
  const normalized = withoutDot.startsWith('/') ? withoutDot.slice(1) : withoutDot;
  return `${BASE_URL}${normalized}`;
}

export function normalizeAssetUrl(url) {
  if (!url) return url;
  if (/^(?:https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith(BASE_URL)) return url;
  if (url.startsWith('/')) return assetPath(url.slice(1));
  return assetPath(url);
}

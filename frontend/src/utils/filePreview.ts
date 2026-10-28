/**
 * Resolves the backend origin without trailing slashes or /api/v1 suffix.
 * e.g., 'http://localhost:5000/api/v1' -> 'http://localhost:5000'
 *       'https://api.domain.com/api/v1' -> 'https://api.domain.com'
 */
export function getBackendOrigin(): string {
  const envApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envApi) {
    return envApi.replace(/\/$/, '').replace(/\/api(\/v1)?\/?$/, '');
  }

  // In a deployed browser, if NEXT_PUBLIC_API_URL was not baked into build,
  // fallback to relative path so requests don't hit the visitor's local machine port 5000
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return '';
  }

  return 'http://localhost:5000';
}

/**
 * Retrieves active JWT auth token from localStorage if available
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('turia_current_user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u.token) return u.token;
    }
  } catch {}
  return null;
}

/**
 * Attaches authentication query token to a backend drive endpoint URL
 */
export function attachAuthToken(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('/api/v1/drive/')) return url;
  const token = getAuthToken();
  if (!token) return url;
  if (url.includes('token=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Converts any file reference (Google Drive view URL, Google CDN thumbnail, Drive file ID,
 * local relative path, legacy localhost URL, or raw filename) into a high-performance,
 * directly renderable inline image/preview URL.
 */
export function getDirectFilePreviewUrl(urlOrPath?: string | null): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';

  let clean = urlOrPath.trim();
  if (!clean) return '';

  // 1. Data URLs and Blob URLs can be rendered directly by browser
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  const origin = getBackendOrigin();

  // 2. Intercept legacy or hardcoded localhost URLs saved in database
  // (e.g. "http://localhost:5000/api/v1/drive/..." in deployed environments)
  if (/^https?:\/\/(localhost|127\.0\.0\.1):5000/i.test(clean)) {
    clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000/i, origin);
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/')) {
      return attachAuthToken(clean);
    }
  }

  // 3. Intercept ANY Google Drive or Googleusercontent URL to avoid 403/429 hotlink blocks
  if (
    clean.includes('googleusercontent.com') ||
    clean.includes('drive.google.com') ||
    clean.includes('google.com/file')
  ) {
    const idMatch =
      clean.match(/\/d\/([a-zA-Z0-9_-]{20,})/i) ||
      clean.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/i) ||
      clean.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i) ||
      clean.match(/([a-zA-Z0-9_-]{25,})/);

    if (idMatch && idMatch[1]) {
      const url = origin ? `${origin}/api/v1/drive/${idMatch[1]}/preview` : `/api/v1/drive/${idMatch[1]}/preview`;
      return attachAuthToken(url);
    }
  }

  // 4. If it starts with relative /api/
  if (clean.startsWith('/api/')) {
    const url = origin ? `${origin}${clean}` : clean;
    return attachAuthToken(url);
  }

  // 5. If it's a bare Google Drive file ID (25+ alphanumeric characters, no slashes or colons)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
    const url = origin ? `${origin}/api/v1/drive/${clean}/preview` : `/api/v1/drive/${clean}/preview`;
    return attachAuthToken(url);
  }

  // 6. If it's an external HTTP/HTTPS URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // 7. If it's a local filename, route to backend preview endpoint
  const url = origin
    ? `${origin}/api/v1/drive/${encodeURIComponent(clean)}/preview`
    : `/api/v1/drive/${encodeURIComponent(clean)}/preview`;
  return attachAuthToken(url);
}

/**
 * Returns backend stream preview URL for any file ID
 */
export function getBackendDrivePreviewUrl(driveFileId: string): string {
  if (!driveFileId) return '';
  const origin = getBackendOrigin();
  const url = origin ? `${origin}/api/v1/drive/${driveFileId}/preview` : `/api/v1/drive/${driveFileId}/preview`;
  return attachAuthToken(url);
}

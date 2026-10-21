const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';

/**
 * Converts any file reference (Google Drive view URL, Google CDN thumbnail, Drive file ID,
 * local relative path, or raw filename) into a high-performance, directly renderable
 * inline image/preview URL served through our backend proxy to avoid Google cross-origin & 429/403 blocks.
 */
export function getDirectFilePreviewUrl(urlOrPath?: string | null): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';

  const clean = urlOrPath.trim();
  if (!clean) return '';

  // 1. Data URLs and Blob URLs can be rendered directly by browser
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // 2. Intercept ANY Google Drive or Googleusercontent URL to avoid 403/429 hotlink blocks
  // Matches:
  // - https://lh3.googleusercontent.com/d/FILE_ID...
  // - https://drive.google.com/file/d/FILE_ID/...
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://drive.google.com/thumbnail?id=FILE_ID
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
      return `${BACKEND_BASE}/api/v1/drive/${idMatch[1]}/preview`;
    }
  }

  // 3. If it starts with relative /api/
  if (clean.startsWith('/api/')) {
    return `${BACKEND_BASE}${clean}`;
  }

  // 4. If it's a bare Google Drive file ID (25+ alphanumeric characters, no slashes or colons)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
    return `${BACKEND_BASE}/api/v1/drive/${clean}/preview`;
  }

  // 5. If it's another external HTTP/HTTPS URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // 6. If it's a local filename, route to backend preview endpoint
  return `${BACKEND_BASE}/api/v1/drive/${encodeURIComponent(clean)}/preview`;
}

/**
 * Returns backend stream preview URL for any file ID
 */
export function getBackendDrivePreviewUrl(driveFileId: string): string {
  if (!driveFileId) return '';
  return `${BACKEND_BASE}/api/v1/drive/${driveFileId}/preview`;
}

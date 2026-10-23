/**
 * Client-side Device Credential Management
 * Stores cryptographically verified device tokens linked to server-side TrustedDeviceModel
 */

const DEVICE_ID_KEY = 'turia_device_id';
const CREDENTIALS_MAP_KEY = 'turia_device_credentials';

export interface StoredCredential {
  deviceId: string;
  deviceToken: string;
  email: string;
  name?: string;
  role?: string;
  firmName?: string;
  verifiedAt: string;
  lastUsedAt: string;
}

/**
 * Get or generate a persistent unique device identifier for this browser
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_side_device';
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'fallback_device_id';
  }
}

/**
 * Get all verified accounts on this browser
 */
export function getAllDeviceCredentials(): Record<string, StoredCredential> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Get the verified device credential for a specific email
 */
export function getDeviceCredential(email: string): StoredCredential | null {
  if (!email) return null;
  const map = getAllDeviceCredentials();
  return map[email.trim().toLowerCase()] || null;
}

/**
 * Save or update a verified device credential for an email
 */
export function saveDeviceCredential(
  email: string,
  credential: {
    deviceId: string;
    deviceToken: string;
    name?: string;
    role?: string;
    firmName?: string;
  }
): void {
  if (typeof window === 'undefined' || !email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const map = getAllDeviceCredentials();
    const existing = map[cleanEmail];

    map[cleanEmail] = {
      deviceId: credential.deviceId,
      deviceToken: credential.deviceToken,
      email: cleanEmail,
      name: credential.name || existing?.name,
      role: credential.role || existing?.role,
      firmName: credential.firmName || existing?.firmName,
      verifiedAt: existing?.verifiedAt || new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    localStorage.setItem(CREDENTIALS_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Remove device credential for an email
 */
export function removeDeviceCredential(email: string): void {
  if (typeof window === 'undefined' || !email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const map = getAllDeviceCredentials();
    delete map[cleanEmail];
    localStorage.setItem(CREDENTIALS_MAP_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * List verified accounts for quick switching / multi-account selection
 */
export function listVerifiedAccounts(): StoredCredential[] {
  const map = getAllDeviceCredentials();
  return Object.values(map).sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

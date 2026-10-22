import { Portal } from '../notice/notice.interface';

export interface PortalAuthCredentials {
  portal: Portal;
  identifier: string; // GSTIN, TAN, or PAN
  userId: string;
}

export interface SyncFetchResult<T = unknown> {
  ok: boolean;
  portal: Portal;
  identifier: string;
  items: T[];
  error?: string;
}

export interface PortalConnector {
  portal: Portal;
  testConnection(creds: PortalAuthCredentials): Promise<{ ok: boolean; message?: string }>;
  fetchNotices(creds: PortalAuthCredentials): Promise<SyncFetchResult>;
  fetchCompliance(creds: PortalAuthCredentials, period: string): Promise<SyncFetchResult>;
}

export class SimulatedConnector implements PortalConnector {
  constructor(public portal: Portal) {}

  async testConnection(creds: PortalAuthCredentials): Promise<{ ok: boolean; message?: string }> {
    if (!creds.userId) {
      return { ok: false, message: 'Missing user identification' };
    }
    return { ok: true, message: `Connected to simulated ${this.portal} portal` };
  }

  async fetchNotices(creds: PortalAuthCredentials): Promise<SyncFetchResult> {
    return {
      ok: true,
      portal: this.portal,
      identifier: creds.identifier,
      items: [],
    };
  }

  async fetchCompliance(creds: PortalAuthCredentials, _period: string): Promise<SyncFetchResult> {
    return {
      ok: true,
      portal: this.portal,
      identifier: creds.identifier,
      items: [],
    };
  }
}

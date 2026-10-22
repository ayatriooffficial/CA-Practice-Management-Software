import { Portal } from '../notice/notice.interface';
import { IStatutoryFile, IRecurringFile } from '../client/client.interface';
import { Frequency } from '../compliance/compliance.model';

export interface DerivedPortalIdentifiers {
  gstin?: string;
  tan?: string;
  pan?: string;
}

export interface DerivedComplianceItemDef {
  categoryId: string;
  formCode: string;
  label: string;
  kind?: 'payment' | 'return' | 'certificate';
  frequency: Frequency;
  isCustom: boolean;
}

/**
 * Maps a statutory type string to a Portal ('GST' | 'IT' | 'TDS') or null.
 * Normalizes input: "GSTIN", "gst", "GST Portal" -> "GST"; "tan" -> "TDS"; "PAN" -> "IT".
 * Empty or unmatched returns null.
 */
export function mapStatutoryTypeToPortal(rawType?: string | null): Portal | null {
  if (!rawType) return null;
  const clean = rawType.trim().toLowerCase();
  if (clean === 'gstin' || clean === 'gst' || clean === 'gst portal') {
    return 'GST';
  }
  if (clean === 'tan') {
    return 'TDS';
  }
  if (clean === 'pan') {
    return 'IT';
  }
  return null;
}

/**
 * Derives portals and identifiers from client statutory files (and root pan if available).
 */
export function derivePortalsAndIdentifiers(
  statutory: IStatutoryFile[] = [],
  rootPan?: string
): { portals: Portal[]; identifiers: DerivedPortalIdentifiers } {
  const portalsSet = new Set<Portal>();
  const identifiers: DerivedPortalIdentifiers = {};

  if (rootPan && rootPan.trim()) {
    identifiers.pan = rootPan.trim().toUpperCase();
  }

  for (const item of statutory) {
    const portal = mapStatutoryTypeToPortal(item.type);
    if (portal) {
      portalsSet.add(portal);
      const val = item.idNo?.trim();
      if (val) {
        if (portal === 'GST' && !identifiers.gstin) {
          identifiers.gstin = val.toUpperCase();
        } else if (portal === 'TDS' && !identifiers.tan) {
          identifiers.tan = val.toUpperCase();
        } else if (portal === 'IT' && !identifiers.pan) {
          identifiers.pan = val.toUpperCase();
        }
      }
    }
  }

  // If PAN exists either at root or statutory, IT portal is applicable
  if (identifiers.pan) {
    portalsSet.add('IT');
  }

  // Preserve canonical ordering [GST, IT, TDS]
  const orderedPortals: Portal[] = [];
  if (portalsSet.has('GST')) orderedPortals.push('GST');
  if (portalsSet.has('IT')) orderedPortals.push('IT');
  if (portalsSet.has('TDS')) orderedPortals.push('TDS');

  return {
    portals: orderedPortals,
    identifiers,
  };
}

/**
 * Checks whether credentials are saved for a portal.
 * Security rule: Checks userId only (non-empty string); never checks, requires or returns the password.
 */
export function hasSavedCredentials(
  statutory: IStatutoryFile[] = [],
  portal: Portal
): boolean {
  for (const item of statutory) {
    if (mapStatutoryTypeToPortal(item.type) === portal) {
      if (item.userId && item.userId.trim().length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Derives compliance items based on client type, recurring files, and services.
 * Specifically for Income Tax returns:
 * - private-limited / public-limited -> ITR-6
 * - partnership / llp -> ITR-5
 * - trust -> ITR-7
 * - individual / proprietorship -> ITR-1 / ITR-4
 */
export function deriveComplianceItems(params: {
  clientType?: string;
  recurring?: IRecurringFile[];
  services?: string[];
  portals?: Portal[];
}): DerivedComplianceItemDef[] {
  const items: DerivedComplianceItemDef[] = [];
  const typeClean = (params.clientType || '').toLowerCase().replace(/[^a-z]/g, '');

  // Check recurring files for Income Tax
  const hasItRecurring = (params.recurring || []).some(
    (r) =>
      r.category?.toLowerCase().includes('income tax') ||
      r.service?.toLowerCase().includes('itr')
  );

  if (hasItRecurring) {
    let formCode = 'ITR-6';
    if (typeClean.includes('privatelimited') || typeClean.includes('publiclimited') || typeClean === 'company') {
      formCode = 'ITR-6';
    } else if (typeClean.includes('partnership') || typeClean.includes('llp')) {
      formCode = 'ITR-5';
    } else if (typeClean.includes('trust') || typeClean.includes('society')) {
      formCode = 'ITR-7';
    } else if (typeClean.includes('individual') || typeClean.includes('proprietorship')) {
      formCode = 'ITR-1';
    }

    items.push({
      categoryId: 'cat-it',
      formCode,
      label: formCode,
      kind: 'return',
      frequency: 'yearly',
      isCustom: false,
    });
  }

  return items;
}

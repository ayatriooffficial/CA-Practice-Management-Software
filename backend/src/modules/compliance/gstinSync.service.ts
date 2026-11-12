import { Types } from 'mongoose';
import { Client } from '../client/client.model';
import { ComplianceItemModel, ComplianceEntryModel, Frequency } from './compliance.model';
import { PortalSyncStateModel } from '../sync/sync.model';
import { logger } from '../../config/logger';

export interface GstSyncResult {
  syncedClients: number;
  updatedEntries: number;
  failedClients: number;
  errors: Array<{ clientId: string; gstin?: string; error: string }>;
}

interface ExpectedPeriod {
  periodKey: string;
  retPd: string;
}

/**
 * Normalizes statutory filing dates into ISO YYYY-MM-DD format.
 * Handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or ISO date strings.
 */
export function normalizeDate(d?: string | null): string | null {
  if (!d) return null;
  const clean = d.trim();
  if (!clean) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return clean;
}

/**
 * Formats user/API FY string into standard internal FY format (e.g., 'FY 2026-2027').
 */
export function formatEntryFy(fy: string): string {
  const match = fy.match(/(\d{4})/);
  if (!match) return fy.startsWith('FY ') ? fy : `FY ${fy}`;
  const start = Number(match[1]);
  return `FY ${start}-${start + 1}`;
}

/**
 * Formats FY into 'YYYY-YY' expected by gstinapi.in (e.g. '2026-27').
 */
export function formatApiFy(fy: string): string {
  const match = fy.match(/(\d{4})/);
  if (!match) return '2026-27';
  const start = match[1];
  const nextTwoDigits = String(Number(start) + 1).slice(-2);
  return `${start}-${nextTwoDigits}`;
}

/**
 * Extracts the starting 4-digit calendar year of a financial year.
 */
function parseFyStartYear(fy: string): number {
  const match = fy.match(/(\d{4})/);
  if (match) return parseInt(match[1], 10);
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Normalizes form code string (e.g. 'GSTR-1' -> 'GSTR1', 'GSTR-3B' -> 'GSTR3B').
 */
export function normalizeFormCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Maps the API return period (e.g., '102026' or '2026-10') to internal matrix period keys.
 * Monthly: 'M01' through 'M12'
 * Quarterly: 'Q1' through 'Q4'
 * Yearly: 'ANNUAL'
 */
export function mapApiPeriodToPeriodKey(ret_pd: string, frequency: string = 'monthly'): string {
  if (!ret_pd) return 'M01';
  const clean = ret_pd.trim();

  // If already in internal format
  if (/^M\d{2}$/i.test(clean)) return clean.toUpperCase();
  if (/^Q[1-4]$/i.test(clean)) return clean.toUpperCase();
  if (clean.toUpperCase() === 'ANNUAL') return 'ANNUAL';

  let monthNum = 0;
  if (clean.includes('-')) {
    const parts = clean.split('-');
    monthNum = parseInt(parts[1], 10);
  } else if (clean.length === 6) {
    monthNum = parseInt(clean.slice(0, 2), 10);
  } else if (clean.length <= 2) {
    monthNum = parseInt(clean, 10);
  }

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return clean;
  }

  const freq = (frequency || 'monthly').toLowerCase();
  if (freq === 'quarterly') {
    if ([4, 5, 6].includes(monthNum)) return 'Q1';
    if ([7, 8, 9].includes(monthNum)) return 'Q2';
    if ([10, 11, 12].includes(monthNum)) return 'Q3';
    if ([1, 2, 3].includes(monthNum)) return 'Q4';
  }

  if (freq === 'yearly') {
    return 'ANNUAL';
  }

  return `M${String(monthNum).padStart(2, '0')}`;
}

/**
 * Calculates statutory GST due dates based on return type, filing period, and frequency.
 * Returns ISO YYYY-MM-DD date string.
 */
export function calculateDueDate(
  formCode: string,
  ret_pd: string,
  frequency: string = 'monthly'
): string {
  let month = 4;
  let year = new Date().getFullYear();

  if (ret_pd.includes('-')) {
    const parts = ret_pd.split('-');
    year = parseInt(parts[0], 10) || year;
    month = parseInt(parts[1], 10) || month;
  } else if (ret_pd.length === 6) {
    month = parseInt(ret_pd.slice(0, 2), 10) || month;
    year = parseInt(ret_pd.slice(2), 10) || year;
  }

  const code = normalizeFormCode(formCode);
  const isQuarterly = (frequency || 'monthly').toLowerCase() === 'quarterly';

  // Return period month M is filed in the succeeding month
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMonthStr = String(nextMonth).padStart(2, '0');

  // GSTR-1: 11th of succeeding month (Monthly) or 13th of month following quarter (QRMP)
  if (code === 'GSTR1') {
    const day = isQuarterly ? '13' : '11';
    return `${nextYear}-${nextMonthStr}-${day}`;
  }

  // GSTR-3B: 20th of succeeding month (Monthly) or 22nd of month following quarter (QRMP)
  if (code === 'GSTR3B') {
    const day = isQuarterly ? '22' : '20';
    return `${nextYear}-${nextMonthStr}-${day}`;
  }

  // CMP-08: 18th of month following quarter
  if (code === 'CMP08') {
    return `${nextYear}-${nextMonthStr}-18`;
  }

  // GSTR-9: 31st December following FY
  if (code === 'GSTR9') {
    return `${year + 1}-12-31`;
  }

  // Fallback: 20th of succeeding month
  return `${nextYear}-${nextMonthStr}-20`;
}

/**
 * Generates all expected filing periods for a financial year based on filing frequency.
 */
export function generateExpectedPeriods(fyStartYear: number, frequency: Frequency): ExpectedPeriod[] {
  if (frequency === 'quarterly') {
    return [
      { periodKey: 'Q1', retPd: `06${fyStartYear}` },
      { periodKey: 'Q2', retPd: `09${fyStartYear}` },
      { periodKey: 'Q3', retPd: `12${fyStartYear}` },
      { periodKey: 'Q4', retPd: `03${fyStartYear + 1}` },
    ];
  }

  const fiscalMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
  return fiscalMonths.map((m) => {
    const year = m >= 4 ? fyStartYear : fyStartYear + 1;
    const mm = String(m).padStart(2, '0');
    return {
      periodKey: `M${mm}`,
      retPd: `${mm}${year}`,
    };
  });
}

/**
 * Fetches GSTIN filing preference (Monthly vs Quarterly/QRMP) from gstinapi.in.
 * Falls back to 'monthly' if unavailable.
 */
async function fetchFilingPreference(
  gstin: string,
  apiFy: string,
  apiKey: string
): Promise<Frequency> {
  try {
    const prefUrl = `https://www.gstinapi.in/v1/gstin/${encodeURIComponent(gstin)}/filing-preference?fy=${encodeURIComponent(apiFy)}`;
    const response = await fetch(prefUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn(
        `GSTIN Sync: Filing preference API returned HTTP ${response.status} for ${gstin}; defaulting to monthly.`
      );
      return 'monthly';
    }

    const prefData = (await response.json()) as any;
    console.log(`[GSTIN API] Raw Preference Payload for ${gstin}:`, JSON.stringify(prefData, null, 2));
    const prefs: any[] =
      prefData.filing_preference ||
      prefData.data?.filing_preference ||
      prefData.data?.response ||
      prefData.response ||
      [];

    if (Array.isArray(prefs) && prefs.length > 0) {
      let quarterlyCount = 0;
      let monthlyCount = 0;
      for (const entry of prefs) {
        const val = String(entry.preference || entry.filing_preference || '').trim().toLowerCase();
        if (val === 'quarterly' || val === 'q' || val === 'qrmp') {
          quarterlyCount++;
        } else if (val === 'monthly' || val === 'm') {
          monthlyCount++;
        }
      }
      if (quarterlyCount > 0 && quarterlyCount >= monthlyCount) {
        return 'quarterly';
      }
    } else if (typeof prefData.preference === 'string') {
      const val = prefData.preference.trim().toLowerCase();
      if (val === 'quarterly' || val === 'q' || val === 'qrmp') {
        return 'quarterly';
      }
    }
  } catch (err: any) {
    logger.warn(`GSTIN Sync: Failed to fetch filing preference for ${gstin}: ${err.message}`);
  }

  return 'monthly';
}

const MOCK_GSTINS = new Set(['27AAKCA1234F1Z5', '00AAAAA0000A1ZT']);

/**
 * Generates realistic gstinapi.in-shaped mock data for local preview before live API key handoff.
 * Intentionally leaves specific past periods unfiled (missed) and future periods pending.
 */
function getMockGstinApiData(
  fyStartYear: number
): { frequency: Frequency; returns: any[] } {
  const y0 = fyStartYear;
  const yy0 = String(y0).slice(-2);

  return {
    frequency: 'monthly',
    returns: [
      // GSTR-1: Apr, May, Jun, Aug, Sep filed; Jul & Oct omitted (Missed as of Nov 2026); Nov-Mar upcoming (Pending)
      {
        return_type: 'GSTR1',
        return_period: `04${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-05-10`,
        arn: `AA2704${yy0}0018201`,
      },
      {
        return_type: 'GSTR1',
        return_period: `05${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-06-11`,
        arn: `AA2705${yy0}0024912`,
      },
      {
        return_type: 'GSTR1',
        return_period: `06${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-07-09`,
        arn: `AA2706${yy0}0031105`,
      },
      {
        return_type: 'GSTR1',
        return_period: `08${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-09-11`,
        arn: `AA2708${yy0}0049022`,
      },
      {
        return_type: 'GSTR1',
        return_period: `09${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-10-10`,
        arn: `AA2709${yy0}0058841`,
      },
      // GSTR-3B: Apr, May, Jul, Aug, Sep filed; Jun omitted (Missed); Oct due Nov 20 (Pending as of Nov 12, 2026)
      {
        return_type: 'GSTR3B',
        return_period: `04${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-05-19`,
        arn: `AA2704${yy0}0099110`,
      },
      {
        return_type: 'GSTR3B',
        return_period: `05${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-06-20`,
        arn: `AA2705${yy0}0104432`,
      },
      {
        return_type: 'GSTR3B',
        return_period: `07${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-08-18`,
        arn: `AA2707${yy0}0118904`,
      },
      {
        return_type: 'GSTR3B',
        return_period: `08${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-09-20`,
        arn: `AA2708${yy0}0129043`,
      },
      {
        return_type: 'GSTR3B',
        return_period: `09${y0}`,
        filing_status: 'Filed',
        filing_date: `${y0}-10-19`,
        arn: `AA2709${yy0}0137761`,
      },
    ],
  };
}

export class GstinSyncService {
  /**
   * Synchronizes GST filing history from gstinapi.in for explicitly selected (ticked) clients.
   * Queries filing preference (Monthly vs Quarterly/QRMP), detects unfiled/missed periods,
   * and upserts all expected periods using bulkWrite while preserving manual overrides and documents.
   */
  static async syncClientsGst(
    clientIds: string[] | undefined,
    fy: string = '2026-27',
    refreshPreference: boolean = false
  ): Promise<GstSyncResult> {
    const apiFy = formatApiFy(fy);
    const entryFy = formatEntryFy(fy);
    const fyStartYear = parseFyStartYear(apiFy);
    const apiKey = process.env.GSTIN_API_KEY || '';
    const isMockMode = process.env.GSTIN_MOCK_MODE === 'true';

    // Strict guard: never sync all clients if an empty clientIds array was passed
    if (Array.isArray(clientIds) && clientIds.length === 0) {
      return {
        syncedClients: 0,
        updatedEntries: 0,
        failedClients: 0,
        errors: [],
      };
    }

    // 1. Query candidate clients
    const clientFilter: Record<string, any> = {
      isDeleted: false,
    };

    if (clientIds && clientIds.length > 0) {
      const validIds = clientIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (validIds.length === 0) {
        return {
          syncedClients: 0,
          updatedEntries: 0,
          failedClients: 0,
          errors: [],
        };
      }
      clientFilter._id = { $in: validIds };
    }

    const clients = await Client.find(clientFilter).lean();

    // Filter to clients that have a registered GSTIN in customerFiles.statutory
    const eligibleClients = clients.filter((c: any) => {
      const statutory = c.customerFiles?.statutory || [];
      return statutory.some(
        (s: any) =>
          s.type &&
          /^gst(in)?$/i.test(s.type.trim()) &&
          s.idNo &&
          s.idNo.trim().length > 0
      );
    });

    let syncedClients = 0;
    let updatedEntries = 0;
    let failedClients = 0;
    const errors: Array<{ clientId: string; gstin?: string; error: string }> = [];

    // 2. Iterate through clients and sync
    for (const client of eligibleClients) {
      const clientIdStr = String(client._id);
      const statutory = (client as any).customerFiles?.statutory || [];
      const gstinEntry = statutory.find(
        (s: any) =>
          s.type &&
          /^gst(in)?$/i.test(s.type.trim()) &&
          s.idNo &&
          s.idNo.trim().length > 0
      );
      const gstin = gstinEntry?.idNo?.trim()?.toUpperCase();

      if (!gstin) continue;

      try {
        let clientFrequency: Frequency;
        let returns: any[];

        const useMockForClient =
          isMockMode || (!apiKey && (MOCK_GSTINS.has(gstin) || /sunrise/i.test(client.name || '')));

        if (useMockForClient) {
          logger.info(`GSTIN Sync: Using mock gstinapi.in payload for ${client.name} (${gstin}) FY ${apiFy}`);
          const mockData = getMockGstinApiData(fyStartYear);
          clientFrequency = mockData.frequency;
          returns = mockData.returns;
        } else {
          // 2a. Check if filing preference is already known for this client + FY to save API credits
          const existingGstItems = await ComplianceItemModel.find({
            clientId: client._id,
            categoryId: 'cat-gst',
            isDeleted: false,
          }).lean();

          let hasSyncedBeforeInFy = false;
          if (existingGstItems.length > 0 && !refreshPreference) {
            const existingItemIds = existingGstItems.map((it) => it._id);
            const existingPortalEntry = await ComplianceEntryModel.findOne({
              itemId: { $in: existingItemIds },
              fy: entryFy,
              source: 'portal',
              isDeleted: false,
            }).lean();
            if (existingPortalEntry) {
              hasSyncedBeforeInFy = true;
            }
          }

          if (hasSyncedBeforeInFy && !refreshPreference) {
            clientFrequency = existingGstItems[0].frequency || 'monthly';
            logger.info(
              `GSTIN Sync: Reusing cached '${clientFrequency}' filing preference for ${client.name} (${gstin}) FY ${apiFy}`
            );
          } else {
            clientFrequency = await fetchFilingPreference(gstin, apiFy, apiKey);
          }

          // 2b. Fetch filed returns history for this FY
          const returnsUrl = `https://www.gstinapi.in/v1/gstin/${encodeURIComponent(gstin)}/returns?fy=${encodeURIComponent(apiFy)}`;
          const response = await fetch(returnsUrl, {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errText = await response.text();
            logger.warn(
              `GSTIN Sync: API returned HTTP ${response.status} for client ${client.name} (GSTIN: ${gstin}): ${errText}`
            );
            failedClients++;
            errors.push({
              clientId: clientIdStr,
              gstin,
              error: `API returned HTTP ${response.status}: ${errText}`,
            });
            continue;
          }

          const resData = (await response.json()) as any;
          console.log(`[GSTIN API] Raw Returns Payload for ${gstin} (FY ${apiFy}):`, JSON.stringify(resData, null, 2));
          returns =
            resData.returns ||
            resData.data?.returns ||
            resData.data?.EFiledlist ||
            resData.EFiledlist ||
            [];
        }

        // Determine active form codes (supports GSTR1, GSTR3B, CMP08, GSTR5, GSTR9)
        const TRACKED_GST_FORMS = ['GSTR1', 'GSTR3B', 'CMP08', 'GSTR5', 'GSTR9'];
        const FORM_LABELS: Record<string, string> = {
          GSTR1: 'GSTR-1',
          GSTR3B: 'GSTR-3B',
          CMP08: 'CMP-08',
          GSTR5: 'GSTR-5',
          GSTR9: 'GSTR-9',
        };

        const returnedFormCodes = new Set<string>();
        if (Array.isArray(returns)) {
          for (const rec of returns) {
            const rawCode = rec.return_type || rec.rtntype || rec.form || '';
            const norm = normalizeFormCode(rawCode);
            if (norm) returnedFormCodes.add(norm);
          }
        }

        const isCompositionOnly =
          returnedFormCodes.has('CMP08') &&
          !returnedFormCodes.has('GSTR1') &&
          !returnedFormCodes.has('GSTR3B');
        const isGstr5Only =
          returnedFormCodes.has('GSTR5') &&
          !returnedFormCodes.has('GSTR1') &&
          !returnedFormCodes.has('GSTR3B');

        if (isCompositionOnly) {
          clientFrequency = 'quarterly';
        }

        const activeFormSet = new Set<string>(
          isCompositionOnly
            ? ['CMP08']
            : isGstr5Only
            ? ['GSTR5']
            : ['GSTR1', 'GSTR3B']
        );
        for (const code of returnedFormCodes) {
          if (TRACKED_GST_FORMS.includes(code)) {
            activeFormSet.add(code);
          }
        }
        const activeFormCodes = Array.from(activeFormSet);

        const getFormFrequency = (code: string): Frequency => {
          if (code === 'GSTR9') return 'yearly';
          if (code === 'CMP08') return 'quarterly';
          return clientFrequency;
        };

        // Build lookup map of filed returns keyed by `${formCode}__${periodKey}`
        const filedReturnsMap = new Map<string, any>();
        if (Array.isArray(returns)) {
          for (const record of returns) {
            const rawFormCode = record.return_type || record.rtntype || record.form || '';
            const normFormCode = normalizeFormCode(rawFormCode);
            if (!normFormCode) continue;

            const retPd = String(record.return_period || record.ret_pd || record.period || '');
            if (!retPd) continue;

            const periodKey = mapApiPeriodToPeriodKey(retPd, getFormFrequency(normFormCode));
            const filingStatus = String(record.filing_status || record.status || 'Filed').trim().toLowerCase();
            const isExplicitlyUnfiled = filingStatus === 'not filed' || filingStatus === 'pending';

            if (!isExplicitlyUnfiled) {
              filedReturnsMap.set(`${normFormCode}__${periodKey}`, record);
            }
          }
        }

        // 3. Generate ALL expected filing periods for the FY per form code
        const bulkOps: any[] = [];

        for (const formCode of activeFormCodes) {
          const formFreq = getFormFrequency(formCode);
          const expectedPeriods: ExpectedPeriod[] =
            formFreq === 'yearly'
              ? [{ periodKey: 'ANNUAL', retPd: `12${fyStartYear}` }]
              : generateExpectedPeriods(fyStartYear, formFreq);

          // Find or create ComplianceItem strictly matching normalized formCode
          let item = await ComplianceItemModel.findOne({
            clientId: client._id,
            categoryId: 'cat-gst',
            formCode,
            isDeleted: false,
          });

          const formLabel = FORM_LABELS[formCode] || formCode;

          if (!item) {
            item = await ComplianceItemModel.create({
              clientId: client._id,
              categoryId: 'cat-gst',
              formCode,
              label: formLabel,
              kind: 'return',
              frequency: formFreq,
              identifier: gstin,
              isCustom: false,
              isSeed: false,
            });
          } else if (item.frequency !== formFreq || item.identifier !== gstin || item.label !== formLabel) {
            item.frequency = formFreq;
            item.identifier = gstin;
            item.label = formLabel;
            await item.save();
          }

          // Iterate through ALL expected periods for this FY (both filed and unfiled)
          for (const expected of expectedPeriods) {
            const apiRecord = filedReturnsMap.get(`${formCode}__${expected.periodKey}`);
            const dueDate = calculateDueDate(formCode, expected.retPd, formFreq);

            let filedOn: string | null = null;
            let ackNumber: string | null = null;

            if (apiRecord) {
              filedOn = normalizeDate(apiRecord.filing_date || apiRecord.dof || null);
              ackNumber = apiRecord.arn || apiRecord.ackNumber || apiRecord.ack_number || null;
              // If marked Filed by API without a date string, fallback to dueDate so status resolves to 'filed'
              if (!filedOn) {
                filedOn = dueDate;
              }
            }

            // CRITICAL: Upsert ALL expected periods.
            // Use $set for portal attributes, $setOnInsert for user documents/statusOverride.
            // When filedOn is null, deriveEntryStatus() derives 'missed' (if dueDate < today) or 'pending' (if dueDate >= today).
            bulkOps.push({
              updateOne: {
                filter: {
                  itemId: item._id,
                  fy: entryFy,
                  periodKey: expected.periodKey,
                },
                update: {
                  $set: {
                    dueDate,
                    filedOn,
                    ackNumber,
                    source: 'portal',
                    syncedAt: new Date(),
                    isDeleted: false,
                  },
                  $setOnInsert: {
                    documents: [],
                    statusOverride: null,
                    isSeed: false,
                  },
                },
                upsert: true,
              },
            });
          }
        }

        // 4. Execute bulkWrite for all expected periods
        const syncTimestamp = new Date();
        if (bulkOps.length > 0) {
          const bulkResult = await ComplianceEntryModel.bulkWrite(bulkOps);
          const affectedCount =
            (bulkResult.upsertedCount || 0) +
            (bulkResult.modifiedCount || 0) +
            (bulkResult.matchedCount || 0);
          updatedEntries += affectedCount;
        }

        // 5. Persist lastSyncAt in PortalSyncStateModel for this client + GST portal
        await PortalSyncStateModel.findOneAndUpdate(
          { clientId: client._id, portal: 'GST' },
          {
            $set: {
              status: 'ready',
              lastSyncAt: syncTimestamp,
              errorMessage: '',
              isSeed: false,
              isDeleted: false,
            },
          },
          { upsert: true, new: true }
        );

        syncedClients++;
      } catch (err: any) {
        logger.error(`GSTIN Sync Error for client ${client.name} (${gstin}): ${err.message}`, {
          error: err,
        });
        failedClients++;
        errors.push({
          clientId: clientIdStr,
          gstin,
          error: err.message || 'Unknown sync error',
        });
      }
    }

    return {
      syncedClients,
      updatedEntries,
      failedClients,
      errors,
    };
  }
}

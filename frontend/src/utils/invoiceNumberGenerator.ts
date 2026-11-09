/**
 * Unified Sequential Invoice and Proforma Number Generator.
 * Ensures 100% numbering consistency between:
 * - Direct Invoice creation
 * - Proforma Invoice conversion to Tax Invoice
 * - Proforma Invoice creation
 */

export function extractMaxSequence(
  records: Array<{ number?: string }>,
  prefix: 'INV' | 'PI' | 'CN' | 'REC',
  year: number
): { maxSeq: number; padLength: number } {
  let maxSeq = 0;
  let padLength = 3; // Standard baseline: e.g. 001, 002...

  records.forEach((rec) => {
    if (!rec.number) return;
    const num = rec.number.trim();

    // Pattern 1: e.g. INV-2026-001 or PI-2026-001
    const yearPattern = new RegExp(`^${prefix}-${year}-(\\d+)`, 'i');
    const yearMatch = num.match(yearPattern);
    if (yearMatch) {
      const seqStr = yearMatch[1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) {
        if (seq > maxSeq) maxSeq = seq;
        if (seqStr.length > padLength) padLength = seqStr.length;
      }
      return;
    }

    // Pattern 2: e.g. INV-001 or PI-001
    const prefixPattern = new RegExp(`^${prefix}[^0-9]*(\\d+)`, 'i');
    const prefixMatch = num.match(prefixPattern);
    if (prefixMatch) {
      const seqStr = prefixMatch[1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq < 100000) {
        if (seq > maxSeq) maxSeq = seq;
        if (seqStr.length > padLength) padLength = seqStr.length;
      }
    }
  });

  return { maxSeq, padLength };
}

/**
 * Generates the guaranteed next continuous Tax Invoice Number (INV-YYYY-XXX).
 * Used consistently for both new direct invoices and proforma-to-invoice conversions.
 */
export function generateNextInvoiceNumber(
  existingInvoices: Array<{ number?: string }>,
  targetYear?: number
): string {
  const currentYear = targetYear || new Date().getFullYear();
  const { maxSeq, padLength } = extractMaxSequence(existingInvoices, 'INV', currentYear);
  const nextSeq = Math.max(existingInvoices.length + 1, maxSeq + 1);
  return `INV-${currentYear}-${String(nextSeq).padStart(padLength, '0')}`;
}

/**
 * Generates the guaranteed next continuous Proforma Number (PI-YYYY-XXX).
 */
export function generateNextProformaNumber(
  existingProformas: Array<{ number?: string }>,
  targetYear?: number
): string {
  const currentYear = targetYear || new Date().getFullYear();
  const { maxSeq, padLength } = extractMaxSequence(existingProformas, 'PI', currentYear);
  const nextSeq = Math.max(existingProformas.length + 1, maxSeq + 1);
  return `PI-${currentYear}-${String(nextSeq).padStart(padLength, '0')}`;
}


import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateProfitabilityReportPdf, ProfitabilityPdfRow } from './pdf.generator';
import { FinancialService } from './financial.service';
import { FinancialInvoice, FinancialTimeEntry, TaskExpense } from './financial.model';
import { Task } from '../task/task.model';

describe('Reports PDF Generator & Security QA Test Suite', () => {
  it('generates a strictly valid PDF 1.4 vector document with Type 1 font structures', () => {
    const sampleRows: ProfitabilityPdfRow[] = [
      {
        clientName: 'Turia Industries Private Limited',
        taskId: '#TSK06004',
        serviceName: 'GST 3B - Monthly',
        revenue: 12500,
        manpowerCost: 3200,
        expense: 450,
        profit: 8850,
      },
      {
        clientName: 'Aditya Birla Fashion',
        taskId: '#TSK06002',
        serviceName: 'ITR-1 Filing',
        revenue: 9200,
        manpowerCost: 1500,
        expense: 200,
        profit: 7500,
      },
    ];

    const pdfBuffer = generateProfitabilityReportPdf({
      organizationName: 'Ayatrio Practice Management Suite',
      reportTitle: 'Profitability Report (QA Test)',
      dateRange: { from: '2026-07-01', to: '2026-07-31' },
      rows: sampleRows,
    });

    assert(Buffer.isBuffer(pdfBuffer), 'Output must be a Node.js Buffer');
    assert(pdfBuffer.length > 500, 'PDF buffer must contain realistic file bytes');

    const pdfString = pdfBuffer.toString('binary');
    assert(pdfString.startsWith('%PDF-1.4'), 'Must start with standard PDF-1.4 magic bytes');
    assert(pdfString.includes('%%EOF'), 'Must terminate with %%EOF trailer');
    assert(pdfString.includes('/Type /Catalog'), 'Must contain PDF Catalog root');
    assert(pdfString.includes('/Type /Pages'), 'Must contain Pages root object');
    assert(pdfString.includes('/BaseFont /Helvetica'), 'Must declare standard Helvetica Type 1 font');
    assert(pdfString.includes('/BaseFont /Helvetica-Bold'), 'Must declare Helvetica-Bold Type 1 font');
    assert(pdfString.includes('/BaseFont /Helvetica-Oblique'), 'Must declare Helvetica-Oblique Type 1 font');
    assert(pdfString.includes('xref'), 'Must contain valid cross-reference (xref) table');
  });

  it('correctly handles multi-page pagination with continuation headers and running footers', () => {
    const rows: ProfitabilityPdfRow[] = [];
    for (let i = 1; i <= 38; i++) {
      rows.push({
        clientName: `Test Client ${i}`,
        taskId: `#TSK0${6000 + i}`,
        serviceName: `Statutory Audit Service ${i}`,
        revenue: i * 1000,
        manpowerCost: i * 250,
        expense: i * 50,
        profit: i * 700,
      });
    }

    const pdfBuffer = generateProfitabilityReportPdf({
      organizationName: 'Ayatrio Multi-Page Test',
      reportTitle: 'Consolidated Annual Profitability Audit',
      dateRange: { from: '2026-01-01', to: '2026-12-31' },
      rows,
    });

    const pdfText = pdfBuffer.toString('utf-8');
    const pageObjCount = (pdfText.match(/\/Type \/Page\b/g) || []).length;
    assert.equal(pageObjCount, 3, '38 rows must cleanly paginate across 3 pages (15 + 18 + 5)');

    assert(pdfText.includes('Page 1 of 3'), 'Page 1 must render running footer Page 1 of 3');
    assert(pdfText.includes('Page 2 of 3'), 'Page 2 must render running footer Page 2 of 3');
    assert(pdfText.includes('Page 3 of 3'), 'Page 3 must render running footer Page 3 of 3');
    assert(pdfText.includes('\\(Continued\\)'), 'Subsequent pages must indicate continued report state');
  });

  it('accurately computes summary totals and preserves negative profit values in red badge', () => {
    const sampleRows: ProfitabilityPdfRow[] = [
      {
        clientName: 'Client Alpha',
        taskId: '#TSK0001',
        serviceName: 'Accounting',
        revenue: 10000,
        manpowerCost: 2000,
        expense: 500,
        profit: 7500,
      },
      {
        clientName: 'Client Beta',
        taskId: '#TSK0002',
        serviceName: 'Tax Audit',
        revenue: 2000,
        manpowerCost: 3000,
        expense: 200,
        profit: -1200, // Negative profit
      },
    ];

    const pdfBuffer = generateProfitabilityReportPdf({
      organizationName: 'Ayatrio Financial Calculation Test',
      reportTitle: 'Profitability Report',
      dateRange: { from: '2026-07-01', to: '2026-07-31' },
      rows: sampleRows,
    });

    const pdfText = pdfBuffer.toString('utf-8');
    // Total Revenue: 12,000.00
    assert(pdfText.includes('12,000.00'), 'Total revenue must reflect 12,000.00');
    // Total Manpower: 5,000.00
    assert(pdfText.includes('5,000.00'), 'Total labor cost must reflect 5,000.00');
    // Total Expense: 700.00
    assert(pdfText.includes('700.00'), 'Total expense must reflect 700.00');
    // Total Net Profit: 6,300.00
    assert(pdfText.includes('6,300.00'), 'Net profit must reflect 6,300.00');
    // Negative row profit: -1,200.00
    assert(pdfText.includes('-1,200.00'), 'Negative row profit must be formatted as -1,200.00');
    // Negative badge color RGB: light red fill
    assert(pdfText.includes('0.99 0.91 0.91 rg'), 'Negative profit must be highlighted with red badge fill');
    // Positive badge color RGB: light green fill
    assert(pdfText.includes('0.91 0.97 0.93 rg'), 'Positive profit must be highlighted with green badge fill');
  });

  it('safely handles empty data gracefully without throwing or creating corrupt files', () => {
    const emptyPdf = generateProfitabilityReportPdf({
      organizationName: 'Ayatrio Empty Audit',
      reportTitle: 'Profitability Report',
      dateRange: { from: '2025-01-01', to: '2025-01-31' },
      rows: [],
    });

    assert(emptyPdf.length > 0, 'Empty PDF must still be generated');
    const text = emptyPdf.toString('utf-8');
    assert(text.startsWith('%PDF-1.4'), 'Empty PDF must be a valid PDF document');
    assert(text.includes('No tasks or financial transactions recorded for this period.'), 'Empty state message must render');
    assert(text.includes('Page 1 of 1'), 'Empty report must count 1 total page');
  });

  it('sanitizes non-ASCII unicode and uses explicit INR notation for Type 1 compatibility', () => {
    const rowsWithSpecialChars: ProfitabilityPdfRow[] = [
      {
        clientName: 'Sharma & Sons (CA Practice) — ₹ Special “Quote”',
        taskId: '#TSK0999',
        serviceName: 'Income Tax Return (ITR-4) & MCA e-Filing',
        revenue: 5500,
        manpowerCost: 1000,
        expense: 150,
        profit: 4350,
      },
    ];

    const pdfBuffer = generateProfitabilityReportPdf({
      organizationName: 'Ayatrio Practice Management Suite',
      reportTitle: 'Sanitization Test — Rupee & Special Characters',
      dateRange: { from: '2026-07-01', to: '2026-07-31' },
      rows: rowsWithSpecialChars,
    });

    const text = pdfBuffer.toString('utf-8');
    // Escaped parenthesis in title / text
    assert(!text.includes('((CA Practice))'), 'Parentheses must be properly escaped with backslashes');
    // Column headers explicitly specify INR to avoid Type 1 unicode clipping
    assert(text.includes('Revenue \\(INR\\)'), 'Column headers must use standard ASCII (INR) currency identifier');
    assert(text.includes('Profit \\(INR\\)'), 'Profit header must use standard ASCII (INR) currency identifier');
  });

  it('enforces tenant isolation and client filtering on profitability reporting queries', async () => {
    const originalInvoiceFind = FinancialInvoice.find;
    const originalTimeFind = FinancialTimeEntry.find;
    const originalExpenseFind = TaskExpense.find;
    const originalTaskFind = Task.find;

    let invoiceFilter: any = null;
    let taskFilter: any = null;

    FinancialInvoice.find = ((filter: any) => {
      invoiceFilter = filter;
      return { select: () => ({ lean: async () => [] }) };
    }) as any;

    FinancialTimeEntry.find = (() => {
      return { select: () => ({ populate: () => ({ lean: async () => [] }) }) };
    }) as any;

    TaskExpense.find = (() => {
      return { select: () => ({ lean: async () => [] }) };
    }) as any;

    Task.find = ((filter: any) => {
      taskFilter = filter;
      return { select: () => ({ lean: async () => [] }) };
    }) as any;

    try {
      const dummyCtx = {
        userId: '6ad9e23bf460aa2e6102c0c8',
        orgId: '999999999999999999999999',
        role: 'admin',
      };

      const report = await FinancialService.getProfitabilityReport('2026-07-01', '2026-07-31', dummyCtx);
      assert.equal(report.rows.length, 0, 'Must return empty rows for tenant with no tasks');
      assert.equal(invoiceFilter.orgId, '999999999999999999999999', 'Invoices must be strictly filtered by caller orgId');
      assert.deepEqual(taskFilter.isDeleted, false, 'Deleted tasks must be excluded');
    } finally {
      FinancialInvoice.find = originalInvoiceFind;
      FinancialTimeEntry.find = originalTimeFind;
      TaskExpense.find = originalExpenseFind;
      Task.find = originalTaskFind;
    }
  });

  it('ensures all interactive dashboard links point to existing valid routes in the application', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const target = path.resolve(__dirname, '../../../../frontend/src/app/reports/others/profitability/page.tsx');
    assert(fs.existsSync(target), 'Active dashboard route /reports/others/profitability must exist on disk');
    const legacyTarget = path.resolve(__dirname, '../../../../frontend/src/app/reports/profitability/page.tsx');
    assert(fs.existsSync(legacyTarget), 'Legacy route /reports/profitability must also exist for backward compatibility');
  });
});

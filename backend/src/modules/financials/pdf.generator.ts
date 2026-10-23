/**
 * Pure TypeScript PDF 1.4 Document Generator for Financial & Profitability Reports.
 * Zero external npm dependencies. Produces standard vector PDF files readable by
 * all PDF viewers, print drivers, and preview applications.
 */

export interface ProfitabilityPdfRow {
  clientName: string;
  taskId: string;
  serviceName: string;
  revenue: number;
  manpowerCost: number;
  expense: number;
  profit: number;
}

export interface ProfitabilityPdfOptions {
  organizationName?: string;
  reportTitle?: string;
  dateRange: { from: string; to: string };
  generatedAt?: Date;
  clientFilter?: string;
  view?: 'list' | 'client' | 'employee';
  rows: ProfitabilityPdfRow[];
}

function escapePdf(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?'); // sanitize non-ASCII for standard Type 1 Helvetica font
}

function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount).toFixed(2);
  const parts = abs.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian currency formatting: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  return `${isNegative ? '-' : ''}${integerPart}.${decimalPart}`;
}

function getEstimatedTextWidth(str: string, fontSize = 8, isBold = false): number {
  let w = 0;
  const factor = isBold ? 1.08 : 1.0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch >= '0' && ch <= '9') w += fontSize * 0.556 * factor;
    else if (ch === '.' || ch === ',') w += fontSize * 0.278 * factor;
    else if (ch === '-' || ch === ':') w += fontSize * 0.333 * factor;
    else if (ch === ' ' || ch === '(' || ch === ')') w += fontSize * 0.278 * factor;
    else if (ch >= 'A' && ch <= 'Z') w += fontSize * 0.667 * factor;
    else w += fontSize * 0.5 * factor;
  }
  return w;
}

export function generateProfitabilityReportPdf(options: ProfitabilityPdfOptions): Buffer {
  const orgName = options.organizationName || 'Ayatrio Practice Management';
  const title = options.reportTitle || 'Profitability Report';
  const from = options.dateRange.from;
  const to = options.dateRange.to;
  const generated = (options.generatedAt || new Date()).toLocaleString('en-IN');
  const rows = options.rows;

  // Geometry: A4 Landscape is 842 pt wide x 595 pt high
  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2; // 762 pt

  // Column definitions (total width = 762 pt)
  const cols = [
    { label: 'Client Name', width: 180, align: 'left' as const },
    { label: 'Task ID', width: 85, align: 'left' as const },
    { label: 'Service', width: 185, align: 'left' as const },
    { label: 'Revenue (INR)', width: 78, align: 'right' as const },
    { label: 'Manpower (INR)', width: 78, align: 'right' as const },
    { label: 'Expense (INR)', width: 78, align: 'right' as const },
    { label: 'Profit (INR)', width: 78, align: 'center' as const },
  ];

  // Pagination calculation
  const rowsPerPageFirst = 15;
  const rowsPerPageSubsequent = 18;
  const pagesData: ProfitabilityPdfRow[][] = [];

  if (rows.length === 0) {
    pagesData.push([]);
  } else {
    let index = 0;
    let isFirst = true;
    while (index < rows.length) {
      const limit = isFirst ? rowsPerPageFirst : rowsPerPageSubsequent;
      pagesData.push(rows.slice(index, index + limit));
      index += limit;
      isFirst = false;
    }
  }

  const totalPages = pagesData.length;

  // Compute Totals
  const totalRevenue = rows.reduce((acc, r) => acc + (r.revenue || 0), 0);
  const totalLabor = rows.reduce((acc, r) => acc + (r.manpowerCost || 0), 0);
  const totalExpense = rows.reduce((acc, r) => acc + (r.expense || 0), 0);
  const totalProfit = rows.reduce((acc, r) => acc + (r.profit || 0), 0);

  // PDF Structure Assembly
  const objects: string[] = [];
  const offsets: number[] = [];
  let pdfString = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  function addObj(data: string): number {
    offsets.push(Buffer.byteLength(pdfString, 'utf-8'));
    const id = objects.length + 1;
    const str = `${id} 0 obj\n${data}\nendobj\n`;
    pdfString += str;
    objects.push(str);
    return id;
  }

  // Pre-allocate object numbers
  const catalogId = 1;
  const pagesId = 2;
  const fontRegularId = 3;
  const fontBoldId = 4;
  const fontItalicId = 5;

  // We will add pages starting from object 6
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  for (let p = 0; p < totalPages; p++) {
    pageObjIds.push(6 + p * 2);
    contentObjIds.push(7 + p * 2);
  }

  // Build stream content for each page
  const pageStreams: string[] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageRows = pagesData[p];
    const isFirstPage = p === 0;
    const isLastPage = p === totalPages - 1;

    let s = '';

    // Header Background Accent bar at top
    s += '0.38 0.31 0.86 rg\n'; // primary purple #635bff
    s += `0 ${pageHeight - 6} ${pageWidth} 6 re f\n`;

    let currentY = pageHeight - 38;

    if (isFirstPage) {
      // Organization / Practice Header
      s += 'BT\n';
      s += `/F4 16 Tf 0.12 0.14 0.17 rg\n`;
      s += `${marginX} ${currentY} Td (${escapePdf(orgName)}) Tj\n`;
      s += 'ET\n';

      // Report Title
      currentY -= 20;
      s += 'BT\n';
      s += `/F4 13 Tf 0.25 0.28 0.35 rg\n`;
      s += `${marginX} ${currentY} Td (${escapePdf(title)} \\(${rows.length} Total Records\\)) Tj\n`;
      s += 'ET\n';

      // Metadata Subtitle line
      currentY -= 16;
      let meta = `Period: ${from} to ${to}   |   Generated: ${generated}`;
      if (options.clientFilter) meta += `   |   Client: ${options.clientFilter}`;
      if (options.view && options.view !== 'list') meta += `   |   View: ${options.view.toUpperCase()}`;

      s += 'BT\n';
      s += `/F3 9 Tf 0.45 0.48 0.55 rg\n`;
      s += `${marginX} ${currentY} Td (${escapePdf(meta)}) Tj\n`;
      s += 'ET\n';

      currentY -= 18;
    } else {
      // Continuation Header for subsequent pages
      s += 'BT\n';
      s += `/F4 11 Tf 0.25 0.28 0.35 rg\n`;
      s += `${marginX} ${currentY} Td (${escapePdf(orgName)} — ${escapePdf(title)} \\(Continued\\)) Tj\n`;
      s += 'ET\n';
      currentY -= 18;
    }

    // Divider line above table
    s += '0.85 0.87 0.90 RG\n';
    s += `1 w ${marginX} ${currentY} m ${marginX + contentWidth} ${currentY} l S\n`;
    currentY -= 6;

    // Table Header Row Background
    const headerHeight = 22;
    currentY -= headerHeight;
    s += '0.94 0.95 0.98 rg\n'; // subtle blue-gray #f1f4f9
    s += `${marginX} ${currentY} ${contentWidth} ${headerHeight} re f\n`;

    // Table Header Texts
    s += 'BT\n';
    s += `/F4 8.5 Tf 0.2 0.24 0.3 rg\n`;
    let colX = marginX;
    for (const c of cols) {
      const labelW = getEstimatedTextWidth(c.label, 8.5, true);
      let textX: number;
      if (c.align === 'right') {
        textX = colX + c.width - labelW - 6;
      } else if (c.align === 'center') {
        textX = colX + (c.width - labelW) / 2;
      } else {
        textX = colX + 6;
      }
      const textY = currentY + 6.5;
      s += `${textX} ${textY} Td (${escapePdf(c.label)}) Tj\n`;
      s += `-${textX} -${textY} Td\n`; // reset origin
      colX += c.width;
    }
    s += 'ET\n';

    // Render Rows
    if (pageRows.length === 0) {
      currentY -= 32;
      s += 'BT\n';
      s += `/F5 9 Tf 0.45 0.5 0.58 rg\n`;
      s += `${marginX + 20} ${currentY} Td (No tasks or financial transactions recorded for this period.) Tj\n`;
      s += 'ET\n';
    }

    const rowHeight = 20;
    for (let rIdx = 0; rIdx < pageRows.length; rIdx++) {
      const row = pageRows[rIdx];
      currentY -= rowHeight;

      // Alternating row background
      if (rIdx % 2 === 1) {
        s += '0.98 0.98 0.99 rg\n';
        s += `${marginX} ${currentY} ${contentWidth} ${rowHeight} re f\n`;
      }

      // Bottom row border
      s += '0.92 0.93 0.95 RG\n';
      s += `0.5 w ${marginX} ${currentY} m ${marginX + contentWidth} ${currentY} l S\n`;

      // Absolute column X coordinates
      const colX0 = marginX;
      const colX1 = colX0 + cols[0].width;
      const colX2 = colX1 + cols[1].width;
      const colX3 = colX2 + cols[2].width;
      const colX4 = colX3 + cols[3].width;
      const colX5 = colX4 + cols[4].width;
      const colX6 = colX5 + cols[5].width;

      // Formatted numeric strings
      const revStr = formatCurrency(row.revenue);
      const manStr = formatCurrency(row.manpowerCost);
      const expStr = formatCurrency(row.expense);
      const profStr = formatCurrency(row.profit);

      const revW = getEstimatedTextWidth(revStr, 8);
      const manW = getEstimatedTextWidth(manStr, 8);
      const expW = getEstimatedTextWidth(expStr, 8);
      const profW = getEstimatedTextWidth(profStr, 8, true);

      // Profit badge background box centered in colX6
      const badgePaddingX = 8;
      const badgeW = Math.max(54, profW + badgePaddingX * 2);
      const badgeX = colX6 + (cols[6].width - badgeW) / 2;
      const isPositive = row.profit >= 0;
      if (isPositive) {
        s += '0.91 0.97 0.93 rg\n'; // light green #e8f8ee
      } else {
        s += '0.99 0.91 0.91 rg\n'; // light red #fde8e8
      }
      s += `${badgeX} ${currentY + 2.5} ${badgeW} ${rowHeight - 5} re f\n`;

      // Cell texts
      s += 'BT\n';

      // 1. Client Name (truncated if > 28 chars)
      s += `/F3 8 Tf 0.15 0.18 0.22 rg\n`;
      const clientNameDisp = row.clientName.length > 28 ? row.clientName.slice(0, 26) + '...' : row.clientName;
      s += `${colX0 + 6} ${currentY + 5.5} Td (${escapePdf(clientNameDisp)}) Tj\n`;
      s += `-${colX0 + 6} -${currentY + 5.5} Td\n`;

      // 2. Task ID
      s += `/F4 8 Tf 0.35 0.32 0.75 rg\n`; // purple/indigo #5b50d6
      s += `${colX1 + 6} ${currentY + 5.5} Td (${escapePdf(row.taskId)}) Tj\n`;
      s += `-${colX1 + 6} -${currentY + 5.5} Td\n`;

      // 3. Service (truncated if > 30 chars)
      s += `/F3 8 Tf 0.25 0.28 0.35 rg\n`;
      const serviceDisp = row.serviceName.length > 30 ? row.serviceName.slice(0, 28) + '...' : row.serviceName;
      s += `${colX2 + 6} ${currentY + 5.5} Td (${escapePdf(serviceDisp)}) Tj\n`;
      s += `-${colX2 + 6} -${currentY + 5.5} Td\n`;

      // 4. Revenue (right-aligned in colX3)
      s += `/F3 8 Tf 0.2 0.2 0.2 rg\n`;
      const revTextX = colX3 + cols[3].width - revW - 6;
      s += `${revTextX} ${currentY + 5.5} Td (${escapePdf(revStr)}) Tj\n`;
      s += `-${revTextX} -${currentY + 5.5} Td\n`;

      // 5. Manpower (right-aligned in colX4)
      const manTextX = colX4 + cols[4].width - manW - 6;
      s += `${manTextX} ${currentY + 5.5} Td (${escapePdf(manStr)}) Tj\n`;
      s += `-${manTextX} -${currentY + 5.5} Td\n`;

      // 6. Expense (right-aligned in colX5)
      const expTextX = colX5 + cols[5].width - expW - 6;
      s += `${expTextX} ${currentY + 5.5} Td (${escapePdf(expStr)}) Tj\n`;
      s += `-${expTextX} -${currentY + 5.5} Td\n`;

      // 7. Profit in badge (centered in colX6)
      if (isPositive) {
        s += `/F4 8 Tf 0.09 0.54 0.26 rg\n`; // green #188a42
      } else {
        s += `/F4 8 Tf 0.88 0.14 0.14 rg\n`; // red #e02424
      }
      const profTextX = colX6 + (cols[6].width - profW) / 2;
      s += `${profTextX} ${currentY + 5.5} Td (${escapePdf(profStr)}) Tj\n`;
      s += `-${profTextX} -${currentY + 5.5} Td\n`;

      s += 'ET\n';
    }

    // If last page, render Summary Totals
    if (isLastPage && rows.length > 0) {
      currentY -= 24;
      s += '0.92 0.94 0.98 rg\n';
      s += `${marginX} ${currentY} ${contentWidth} 22 re f\n`;
      s += '0.38 0.31 0.86 RG 1 w\n';
      s += `${marginX} ${currentY} m ${marginX + contentWidth} ${currentY} l S\n`;

      const colX0 = marginX;
      const colX1 = colX0 + cols[0].width;
      const colX2 = colX1 + cols[1].width;
      const colX3 = colX2 + cols[2].width;
      const colX4 = colX3 + cols[3].width;
      const colX5 = colX4 + cols[4].width;
      const colX6 = colX5 + cols[5].width;

      const totRevStr = formatCurrency(totalRevenue);
      const totManStr = formatCurrency(totalLabor);
      const totExpStr = formatCurrency(totalExpense);
      const totProfStr = formatCurrency(totalProfit);

      const totRevW = getEstimatedTextWidth(totRevStr, 8.5, true);
      const totManW = getEstimatedTextWidth(totManStr, 8.5, true);
      const totExpW = getEstimatedTextWidth(totExpStr, 8.5, true);
      const totProfW = getEstimatedTextWidth(totProfStr, 8.5, true);

      s += 'BT\n';
      s += `/F4 8.5 Tf 0.1 0.12 0.15 rg\n`;
      s += `${marginX + 10} ${currentY + 6.5} Td (TOTALS \\(${rows.length} Tasks\\):) Tj\n`;
      s += `-${marginX + 10} -${currentY + 6.5} Td\n`;

      // Revenue total
      const totRevX = colX3 + cols[3].width - totRevW - 6;
      s += `${totRevX} ${currentY + 6.5} Td (${escapePdf(totRevStr)}) Tj\n`;
      s += `-${totRevX} -${currentY + 6.5} Td\n`;

      // Manpower total
      const totManX = colX4 + cols[4].width - totManW - 6;
      s += `${totManX} ${currentY + 6.5} Td (${escapePdf(totManStr)}) Tj\n`;
      s += `-${totManX} -${currentY + 6.5} Td\n`;

      // Expense total
      const totExpX = colX5 + cols[5].width - totExpW - 6;
      s += `${totExpX} ${currentY + 6.5} Td (${escapePdf(totExpStr)}) Tj\n`;
      s += `-${totExpX} -${currentY + 6.5} Td\n`;

      // Profit total
      const isTotPos = totalProfit >= 0;
      if (isTotPos) {
        s += `/F4 8.5 Tf 0.09 0.54 0.26 rg\n`;
      } else {
        s += `/F4 8.5 Tf 0.88 0.14 0.14 rg\n`;
      }
      const totProfX = colX6 + (cols[6].width - totProfW) / 2;
      s += `${totProfX} ${currentY + 6.5} Td (${escapePdf(totProfStr)}) Tj\n`;
      s += `-${totProfX} -${currentY + 6.5} Td\n`;

      s += 'ET\n';
    }

    // Page Footer (Border + Page numbering + Confidential note)
    const footerY = 24;
    s += '0.85 0.87 0.90 RG 0.5 w\n';
    s += `${marginX} ${footerY + 12} m ${marginX + contentWidth} ${footerY + 12} l S\n`;

    s += 'BT\n';
    s += `/F3 8 Tf 0.5 0.54 0.6 rg\n`;
    s += `${marginX} ${footerY} Td (Ayatrio Compliance & Practice Management Suite  |  Confidential Financial Report) Tj\n`;
    s += `-${marginX} -${footerY} Td\n`;

    const pageStr = `Page ${p + 1} of ${totalPages}`;
    s += `${pageWidth - marginX - 60} ${footerY} Td (${pageStr}) Tj\n`;
    s += 'ET\n';

    pageStreams.push(s);
  }

  // Construct PDF Objects
  // 1: Catalog
  addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // 2: Pages
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  addObj(`<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`);

  // 3: Font Regular (Helvetica)
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  // 4: Font Bold (Helvetica-Bold)
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  // 5: Font Italic (Helvetica-Oblique)
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>`);

  // For each page, add Page obj and Content stream obj
  for (let p = 0; p < totalPages; p++) {
    const contentObjId = contentObjIds[p];
    const stream = pageStreams[p];
    const streamLength = Buffer.byteLength(stream, 'utf-8');

    // Add Page Object
    addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Contents ${contentObjId} 0 R ` +
      `/Resources << /Font << /F3 ${fontRegularId} 0 R /F4 ${fontBoldId} 0 R /F5 ${fontItalicId} 0 R >> >> >>`
    );

    // Add Content Stream Object
    addObj(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);
  }

  // Cross Reference Table
  const startXref = Buffer.byteLength(pdfString, 'utf-8');
  pdfString += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdfString += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  // Trailer
  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdfString, 'utf-8');
}

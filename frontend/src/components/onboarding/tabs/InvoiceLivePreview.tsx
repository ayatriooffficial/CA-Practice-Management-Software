"use client";

import React, { useMemo } from "react";
import { Mail, Phone } from "lucide-react";
import QRCode from "qrcode";
import { CaIndiaLogo } from "@/components/ui/CaIndiaLogo";

export interface DynamicUpiQrCodeProps {
  upiId?: string;
  payeeName?: string;
  amount: number;
  invoiceNumber?: string;
  className?: string;
}

export const DynamicUpiQrCode: React.FC<DynamicUpiQrCodeProps> = ({
  upiId = "sharma@hdfc",
  payeeName = "M/s Sharma & Associates",
  amount,
  invoiceNumber = "INV/2026-001",
  className = "w-full h-full",
}) => {
  const qrSvgData = useMemo(() => {
    try {
      const cleanUpi = (upiId || "sharma@hdfc").trim();
      const cleanName = (payeeName || "Merchant").trim();
      const cleanAmount = amount > 0 ? amount.toFixed(2) : "0.00";
      const cleanNote = `Payment for ${invoiceNumber || "Invoice"}`.trim();

      // Standard UPI Deep-link URI format:
      // upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>
      const upiUrl = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;

      const qr = QRCode.create(upiUrl, { errorCorrectionLevel: "M" });
      const size = qr.modules.size;
      const margin = 1; // 1-module quiet zone around QR code

      let path = "";
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (qr.modules.get(r, c)) {
            path += `M${c + margin} ${r + margin}h1v1h-1z `;
          }
        }
      }

      const totalSize = size + margin * 2;
      return { path, totalSize, upiUrl };
    } catch (err) {
      console.error("Error generating QR code:", err);
      return null;
    }
  }, [upiId, payeeName, amount, invoiceNumber]);

  if (!qrSvgData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
        QR Error
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${qrSvgData.totalSize} ${qrSvgData.totalSize}`}
      className={className}
      shapeRendering="crispEdges"
      aria-label="UPI Payment QR Code"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path fill="#111827" d={qrSvgData.path} />
    </svg>
  );
};


export function numberToWordsINR(num: number): string {
  if (isNaN(num) || num <= 0) return "Zero Rupees Only";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + " " + a[n % 10];
      }
    }
    return str;
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = "Rupees " + inWords(rupees).trim();
  if (paise > 0) {
    words += " and " + inWords(paise).trim() + " Paise";
  }
  return words + " Only";
}

/**
 * Explicit page pagination function for print and PDF generation.
 *
 * 1. Content Grouping:
 *    Distributes pre-table header, client details, and item table rows into
 *    physical page containers (.print-page).
 *
 * 2. Array Tracking & Live DOM Measurement:
 *    Measures exact heights from the live rendered DOM and tracks pages in an array
 *    to accurately calculate totalPages (pages.length).
 *
 * 3. Conditional Footer Injection:
 *    Injects the Last Footer (amount in words, totals computation, payment details with QR code,
 *    notes, and authorised signatory) ONLY on the final page.
 *
 * 4. Every-Page Footer:
 *    Every page receives the solid color strip anchored flush to the bottom.
 *    Non-final pages include a subtle continuation indicator (e.g. Page X of Y).
 */
export function paginateInvoiceForPrint(sourceElement: HTMLElement): HTMLElement {
  const printRoot = document.createElement("div");
  printRoot.className = "invoice-print-pages-wrapper";
  printRoot.style.width = "100%";
  printRoot.style.background = "#ffffff";

  // 1. Measure real rendered dimensions from live DOM
  const liveMain = (sourceElement.querySelector(".invoice-main-content") as HTMLElement) || sourceElement;
  const liveTable = liveMain.querySelector("table.invoice-items-table") as HTMLTableElement | null;
  const liveThead = liveTable ? liveTable.querySelector("thead") : null;
  const liveTbody = liveTable ? liveTable.querySelector("tbody") : null;
  const liveRowEls = liveTbody ? Array.from(liveTbody.querySelectorAll("tr")) : [];
  const liveFooter = sourceElement.querySelector(".invoice-last-page-footer") as HTMLElement | null;

  const theadHeight = liveThead ? (liveThead.offsetHeight || liveThead.getBoundingClientRect().height) : 38;
  const rowHeights = liveRowEls.map((r) => r.offsetHeight || r.getBoundingClientRect().height || 44);
  const footerHeight = liveFooter ? (liveFooter.offsetHeight || liveFooter.getBoundingClientRect().height) : 390;

  // Exact live height of everything on Page 1 before the table:
  // (Top strip + firm header + dates/meta + Bill To card & right section + padding/margins)
  const preTableHeight = (liveTable && sourceElement)
    ? Math.max(240, Math.round(liveTable.getBoundingClientRect().top - sourceElement.getBoundingClientRect().top))
    : 260;

  // Header height for continuation pages (Top strip + firm logo, title, dates):
  const liveHeaderRow = liveMain.children[1] as HTMLElement | null;
  const headerHeight = liveHeaderRow ? Math.max(90, Math.round(liveHeaderRow.offsetHeight || liveHeaderRow.getBoundingClientRect().height)) : 100;

  // 2. Clone source element for detached manipulation
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  const cloneMain = (clone.querySelector(".invoice-main-content") as HTMLElement) || clone;
  const cloneTable = cloneMain.querySelector("table.invoice-items-table") as HTMLTableElement | null;
  const cloneColgroup = cloneTable ? cloneTable.querySelector("colgroup") : null;
  const cloneThead = cloneTable ? cloneTable.querySelector("thead") : null;
  const cloneTbody = cloneTable ? cloneTable.querySelector("tbody") : null;
  const cloneRows = cloneTbody ? Array.from(cloneTbody.querySelectorAll("tr")) : [];

  // Extract top strip and top header row from cloneMain to repeat on ALL pages
  const cloneTopStrip = cloneMain.children[0] ? (cloneMain.children[0].cloneNode(true) as HTMLElement) : null;
  const cloneHeaderRow = cloneMain.children[1] ? (cloneMain.children[1].cloneNode(true) as HTMLElement) : null;

  // Extract the Last Footer template (amount in words, totals, payment details, notes, signatory line)
  const footerTemplate = clone.querySelector(".invoice-last-page-footer") as HTMLElement | null;
  if (footerTemplate && footerTemplate.parentNode) {
    footerTemplate.parentNode.removeChild(footerTemplate);
  }

  // Detect theme accent color reliably
  const accentStrip = clone.querySelector("div[style*='background-color']") as HTMLElement | null;
  const effectiveColor = sourceElement.getAttribute("data-accent-color") ||
    (accentStrip ? accentStrip.style.backgroundColor : "#3D6A9E");

  // Usable heights for A4 page (A4 = 1122.5px at 96 DPI; use 1080px safe content height)
  const MAX_PAGE_HEIGHT = 1080;
  const BOTTOM_STRIP_HEIGHT = 28; // Reserved for every-page footer
  const USABLE_PAGE_HEIGHT = MAX_PAGE_HEIGHT - BOTTOM_STRIP_HEIGHT;

  interface PagePlan {
    hasPreTable: boolean;
    rowIndices: number[];
    hasLastFooter: boolean;
  }

  const pagePlans: PagePlan[] = [];

  if (!cloneTable || cloneRows.length === 0) {
    pagePlans.push({
      hasPreTable: true,
      rowIndices: [],
      hasLastFooter: true,
    });
  } else {
    let currentUsedHeight = preTableHeight + theadHeight;
    let currentRowIndices: number[] = [];

    cloneRows.forEach((_, rowIndex) => {
      const rowH = rowHeights[rowIndex] || 38;
      const isLastRow = rowIndex === cloneRows.length - 1;

      // If last row, check if row + last footer both fit on current page
      if (isLastRow) {
        if (currentUsedHeight + rowH + footerHeight <= USABLE_PAGE_HEIGHT) {
          currentRowIndices.push(rowIndex);
          pagePlans.push({
            hasPreTable: pagePlans.length === 0,
            rowIndices: currentRowIndices,
            hasLastFooter: true,
          });
          return;
        }
      }

      // If adding this row overflows available page height:
      if (currentUsedHeight + rowH > USABLE_PAGE_HEIGHT && currentRowIndices.length > 0) {
        pagePlans.push({
          hasPreTable: pagePlans.length === 0,
          rowIndices: currentRowIndices,
          hasLastFooter: false,
        });

        // Start next page (which includes the repeated Header)
        currentRowIndices = [rowIndex];
        currentUsedHeight = headerHeight + theadHeight + rowH;
      } else {
        currentRowIndices.push(rowIndex);
        currentUsedHeight += rowH;
      }

      // If this was the last row:
      if (isLastRow) {
        if (currentUsedHeight + footerHeight <= USABLE_PAGE_HEIGHT) {
          pagePlans.push({
            hasPreTable: pagePlans.length === 0,
            rowIndices: currentRowIndices,
            hasLastFooter: true,
          });
        } else {
          // Last row on this page, and last footer placed on dedicated final page
          pagePlans.push({
            hasPreTable: pagePlans.length === 0,
            rowIndices: currentRowIndices,
            hasLastFooter: false,
          });
          pagePlans.push({
            hasPreTable: false,
            rowIndices: [],
            hasLastFooter: true,
          });
        }
      }
    });
  }

  // Calculate total pages dynamically
  const totalPages = pagePlans.length;

  // Build the physical page DOM containers
  pagePlans.forEach((plan, idx) => {
    const pageNumber = idx + 1;
    const isFinalPage = pageNumber === totalPages;

    const page = document.createElement("div");
    page.className = "print-page invoice-printable-container";
    page.style.display = "flex";
    page.style.flexDirection = "column";
    page.style.justifyContent = "space-between";
    page.style.boxSizing = "border-box";
    page.style.width = "100%";
    page.style.minHeight = "296mm";
    page.style.height = "296mm";
    page.style.maxHeight = "296mm";
    page.style.position = "relative";
    page.style.overflow = "hidden";
    page.style.background = "#ffffff";
    page.style.margin = "0";
    page.style.padding = "0";

    if (isFinalPage) {
      page.style.pageBreakAfter = "auto";
      page.style.breakAfter = "auto";
    } else {
      page.style.pageBreakAfter = "always";
      page.style.breakAfter = "page";
    }

    // Top Content Container
    const topContainer = document.createElement("div");
    topContainer.className = "print-page-top flex-1 flex flex-col w-full";

    // Page 1: Includes full header, firm details, Client "Bill To" card & right meta section, and Page 1 items table
    if (plan.hasPreTable) {
      const page1Content = cloneMain.cloneNode(true) as HTMLElement;
      const page1Table = page1Content.querySelector("table.invoice-items-table") as HTMLTableElement | null;
      if (page1Table) {
        const page1Tbody = page1Table.querySelector("tbody");
        if (page1Tbody) {
          page1Tbody.innerHTML = "";
          plan.rowIndices.forEach((rowIdx) => {
            if (cloneRows[rowIdx]) {
              page1Tbody.appendChild(cloneRows[rowIdx].cloneNode(true));
            }
          });
        }
      }
      topContainer.appendChild(page1Content);
    } else {
      // Continuation pages: Add the official header on all pages!
      if (cloneTopStrip) {
        topContainer.appendChild(cloneTopStrip.cloneNode(true));
      }
      if (cloneHeaderRow) {
        const continuationHeader = cloneHeaderRow.cloneNode(true) as HTMLElement;
        const metaContainer = continuationHeader.querySelector(".text-right");
        if (metaContainer) {
          const pageBadge = document.createElement("div");
          pageBadge.className = "text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider";
          pageBadge.innerText = `PAGE ${pageNumber} OF ${totalPages}`;
          metaContainer.appendChild(pageBadge);
        }
        topContainer.appendChild(continuationHeader);
      }

      const pageSpacer = document.createElement("div");
      pageSpacer.className = "w-full h-2 sm:h-2.5 print:h-2 bg-transparent";
      topContainer.appendChild(pageSpacer);

      if (cloneTable && plan.rowIndices.length > 0) {
        const pageTable = cloneTable.cloneNode(false) as HTMLTableElement;
        if (cloneColgroup) {
          pageTable.appendChild(cloneColgroup.cloneNode(true));
        }
        if (cloneThead) {
          pageTable.appendChild(cloneThead.cloneNode(true));
        }
        const pageTbody = document.createElement("tbody");
        plan.rowIndices.forEach((rowIdx) => {
          if (cloneRows[rowIdx]) {
            pageTbody.appendChild(cloneRows[rowIdx].cloneNode(true));
          }
        });
        pageTable.appendChild(pageTbody);

        const tableWrapper = document.createElement("div");
        tableWrapper.className = "px-5 sm:px-8 print:px-6 w-full";
        tableWrapper.appendChild(pageTable);
        topContainer.appendChild(tableWrapper);
      }
    }

    page.appendChild(topContainer);

    // 3. Bottom Footer Container (anchored flush to page bottom)
    const bottomContainer = document.createElement("div");
    bottomContainer.className = "print-page-bottom w-full flex flex-col mt-auto shrink-0";

    if (isFinalPage && footerTemplate) {
      // Injected Last Footer: Amount in words, total calculation, payment details, notes, signature line
      const injectedFooter = footerTemplate.cloneNode(true) as HTMLElement;
      injectedFooter.classList.remove("hidden");
      injectedFooter.style.display = "flex";
      injectedFooter.style.flexDirection = "column";
      injectedFooter.style.flexShrink = "0";
      injectedFooter.style.width = "100%";
      injectedFooter.style.marginTop = "auto";
      bottomContainer.appendChild(injectedFooter);
    } else if (!isFinalPage) {
      // Non-final page continuation line
      const continuationFooter = document.createElement("div");
      continuationFooter.className = "py-2 px-6 sm:px-8 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 shrink-0";
      continuationFooter.innerHTML = `
        <span>Continued on next page...</span>
        <span>Page ${pageNumber} of ${totalPages}</span>
      `;
      bottomContainer.appendChild(continuationFooter);

      // Color strip at the bottom of EVERY page
      const pageColorStrip = document.createElement("div");
      pageColorStrip.className = "w-full h-1.5 shrink-0";
      pageColorStrip.style.backgroundColor = effectiveColor;
      bottomContainer.appendChild(pageColorStrip);
    }

    page.appendChild(bottomContainer);
    printRoot.appendChild(page);
  });

  return printRoot;
}

/**
 * Isolated multi-page printer with zero page margins and strict pagination support.
 * Clones the invoice into a dedicated headless iframe to guarantee zero cutoff.
 */
export function printInvoiceElement(elementId: string = "invoice-printable-root") {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Generate dynamically paginated layout
  const paginatedDom = paginateInvoiceForPrint(element);

  // Create an invisible iframe with 100% width (zero left/right margins) for isolated printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-9999";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Copy stylesheets from main document
  const headElements = Array.from(
    document.querySelectorAll("style, link[rel='stylesheet']")
  )
    .map((el) => el.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invoice</title>
        ${headElements}
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #111827 !important;
            font-family: inherit;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-print-pages-wrapper {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-page {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            height: 296mm !important;
            min-height: 296mm !important;
            max-height: 296mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            position: relative !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .print-page-top {
            flex: 1 0 auto !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .print-page-bottom {
            margin-top: auto !important;
            width: 100% !important;
            flex-shrink: 0 !important;
          }
          .invoice-last-page-footer {
            margin-top: auto !important;
            width: 100% !important;
            flex-shrink: 0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table.invoice-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          table.invoice-items-table > thead {
            display: table-header-group !important;
          }
          table.invoice-items-table > thead > tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table.invoice-items-table > tbody {
            display: table-row-group !important;
          }
          table.invoice-items-table > tbody > tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:hidden, .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${paginatedDom.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    const images = Array.from(doc.images);
    const imagePromises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(imagePromises).then(() => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error("Iframe print error:", err);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 150);
    });
  };

  if (doc.readyState === "complete") {
    triggerPrint();
  } else {
    iframe.onload = triggerPrint;
    setTimeout(triggerPrint, 500);
  }
}

/**
 * Generates and downloads a high-resolution, pixel-perfect A4 PDF using jsPDF & html2canvas.
 */
export async function downloadInvoicePDF(
  elementId: string = "invoice-printable-root",
  fileName: string = "invoice.pdf"
): Promise<void> {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // Paginate before generating PDF so each page matches the exact print layout
    const paginatedDom = paginateInvoiceForPrint(element);
    paginatedDom.style.position = "fixed";
    paginatedDom.style.top = "-99999px";
    paginatedDom.style.left = "-99999px";
    paginatedDom.style.width = "794px"; // 210mm at 96 DPI
    document.body.appendChild(paginatedDom);

    const pages = Array.from(paginatedDom.querySelectorAll(".print-page")) as HTMLElement[];

    // Ensure all images (logo, signature, QR) in paginated DOM are fully loaded before rasterizing
    const domImages = Array.from(paginatedDom.querySelectorAll("img"));
    await Promise.all(
      domImages.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    }

    if (document.body.contains(paginatedDom)) {
      document.body.removeChild(paginatedDom);
    }

    const safeName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    pdf.save(safeName);
  } catch (error) {
    console.error("Failed to generate PDF via html2canvas:", error);
    // Fallback to print if canvas generation encounters an error
    printInvoiceElement(elementId);
  }
}

export interface InvoiceItemPreview {
  id?: string;
  name: string;
  description?: string;
  hsnSac?: string;
  qty?: number;
  rate: number;
  taxable?: number;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  total: number;
}

export interface InvoiceLivePreviewProps {
  id?: string;
  template: "classic" | "modern" | "minimal";
  accentColor: string; // e.g. '#4F46E5'
  firmName: string;
  firmAddress?: string;
  firmGstin?: string;
  firmPan?: string;
  firmEmail?: string;
  firmPhone?: string;
  firmLogoUrl?: string | null;
  digitalSignatureUrl?: string | null;
  showCaLogo: boolean;
  invoiceType?: "invoice" | "proforma" | "credit_note";
  title?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  // Client details
  clientName?: string;
  clientLegalName?: string;
  clientAddress?: string;
  clientGstin?: string;
  clientPan?: string;
  clientTan?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientPos?: string;
  // Items & totals
  items?: InvoiceItemPreview[];
  subtotal?: number;
  taxableAmount?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  totalAmount?: number;
  amountInWords?: string;
  currency?: string;
  // Bank details
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  showQuantity?: boolean;
  showHsnSac?: boolean;
  showDescription?: boolean;
  showCgst?: boolean;
  showSgst?: boolean;
  notes?: string;
}

export const InvoiceLivePreview: React.FC<InvoiceLivePreviewProps> = ({
  id,
  template = "modern",
  accentColor = "#3D6A9E",
  firmName = "Your Firm Name",
  firmAddress,
  firmGstin,
  firmPan,
  firmEmail,
  firmPhone,
  firmLogoUrl = null,
  digitalSignatureUrl = null,
  showCaLogo = true,
  invoiceType = "invoice",
  title,
  invoiceNumber = "INV/2024-001",
  invoiceDate = "01-Jun-2024",
  dueDate = "15-Jun-2024",
  clientName,
  clientLegalName,
  clientAddress,
  clientGstin,
  clientPan,
  clientTan,
  clientEmail,
  clientPhone,
  clientPos,
  items,
  subtotal,
  taxableAmount,
  cgstTotal,
  sgstTotal,
  totalAmount,
  amountInWords,
  currency = "INR",
  bankName = "HDFC Bank",
  accountHolderName = "M/s Sharma & Associates",
  accountNumber = "50200012345678",
  ifscCode = "HDFC0001234",
  branchName = "Koramangala, Bengaluru",
  upiId = "sharma@hdfc",
  showQuantity = true,
  showHsnSac = true,
  showDescription = true,
  showCgst = true,
  showSgst = true,
  notes = "Thank you for your business. Please make payment within the due date.",
}) => {
  const isMinimal = template === "minimal";
  const isModern = template === "modern";
  const isClassic = template === "classic";
  const effectiveColor = accentColor || (isMinimal ? "#111827" : "#3D6A9E");

  const effectiveTitle = title || (invoiceType === "proforma" ? "Proforma Invoice" : "Tax Invoice");
  const effectiveClientName = clientLegalName || clientName || "Rajesh Exports Pvt. Ltd.";
  const effectiveClientAddress = clientAddress || "B-12, Industrial Area Phase-II, Koramangala Bengaluru, Karnataka - 560058";
  const effectiveGstin = clientGstin || "29AABCU9603R1ZM";
  const effectivePan = clientPan || "AABCU9603R";
  const effectiveTan = clientTan || "BLRR12345E";
  const effectiveContact = clientName || "Rajesh Kumar";
  const effectiveEmail = clientEmail || "accounts@rajeshexports.com";
  const effectivePhone = clientPhone || "9876543210";
  const effectivePos = clientPos || "29 – Karnataka";

  const defaultItems: InvoiceItemPreview[] = [
    {
      id: "1",
      name: "GST Return Filing (GSTR-1)",
      description: "Monthly GST Return Filing & reconciliation under Section 37",
      hsnSac: "998211",
      qty: 1,
      rate: 1500,
      taxable: 1500,
      gstRate: 18,
      cgst: 135,
      sgst: 135,
      total: 1770,
    },
    {
      id: "2",
      name: "Income Tax Return Filing (ITR-3)",
      description: "Business & Profession Income Tax Return Filing for Assessment Year 2025-26",
      hsnSac: "998231",
      qty: 1,
      rate: 2500,
      taxable: 2500,
      gstRate: 18,
      cgst: 225,
      sgst: 225,
      total: 2950,
    },
    {
      id: "3",
      name: "TDS Return Filing (Form 26Q)",
      description: "Quarterly TDS return preparation and electronic filing with TRACES",
      hsnSac: "998211",
      qty: 1,
      rate: 800,
      taxable: 800,
      gstRate: 18,
      cgst: 72,
      sgst: 72,
      total: 944,
    },
  ];

  const sourceItems: InvoiceItemPreview[] = items && items.length > 0 ? items : defaultItems;

  const normalizedItems = useMemo(() => {
    return sourceItems.map((item, idx) => {
      const qty = item.qty !== undefined && item.qty > 0 ? item.qty : 1;
      const rate = item.rate !== undefined ? item.rate : 0;
      const taxable = item.taxable !== undefined ? item.taxable : rate * qty;
      const gstRate = item.gstRate !== undefined ? item.gstRate : 18;
      const cgst = item.cgst !== undefined && item.cgst > 0 ? item.cgst : Math.round((taxable * (gstRate / 2)) / 100);
      const sgst = item.sgst !== undefined && item.sgst > 0 ? item.sgst : Math.round((taxable * (gstRate / 2)) / 100);
      const computedTotal = taxable + cgst + sgst;
      const total = (item.total !== undefined && item.total > taxable) ? item.total : computedTotal;
      return {
        ...item,
        id: item.id || String(idx + 1),
        qty,
        rate,
        taxable,
        gstRate,
        cgst,
        sgst,
        total,
      };
    });
  }, [sourceItems]);

  const calculatedSubtotal = subtotal !== undefined ? subtotal : normalizedItems.reduce((acc, it) => acc + it.taxable, 0);
  const calculatedTaxable = taxableAmount !== undefined ? taxableAmount : calculatedSubtotal;
  const calculatedCgst = cgstTotal !== undefined && cgstTotal > 0 ? cgstTotal : normalizedItems.reduce((acc, it) => acc + it.cgst, 0);
  const calculatedSgst = sgstTotal !== undefined && sgstTotal > 0 ? sgstTotal : normalizedItems.reduce((acc, it) => acc + it.sgst, 0);
  
  // Total GST: CGST + SGST (always calculated from items)
  const effectiveGstTotal = calculatedCgst + calculatedSgst;

  // Final total MUST ALWAYS include GST!
  const calculatedTotal = (totalAmount !== undefined && totalAmount > calculatedTaxable)
    ? totalAmount
    : (calculatedTaxable + effectiveGstTotal);
  const effectiveWords = amountInWords || numberToWordsINR(calculatedTotal);

  return (
    <>
      {/* Scoped CSS for browser direct print (Ctrl + P / Print button) */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-printable-root,
          #invoice-printable-root *,
          .invoice-printable-container,
          .invoice-printable-container * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Neutralize modal overlays, backdrops, and fixed height containers in print */
          .fixed,
          .overflow-y-auto,
          .overflow-hidden,
          .max-h-\[92vh\],
          .max-h-\[95vh\],
          div[role="dialog"] {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }
          #invoice-printable-root,
          .invoice-printable-container {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            overflow: visible !important;
            height: auto !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .invoice-main-content {
            flex: 1 0 auto !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .invoice-last-page-footer,
          .invoice-bottom-pinned-section {
            margin-top: auto !important;
            width: 100% !important;
            flex-shrink: 0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table.invoice-items-table {
            page-break-inside: auto !important;
            break-inside: auto !important;
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          table.invoice-items-table > thead {
            display: table-header-group !important;
          }
          table.invoice-items-table > thead > tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table.invoice-items-table > tbody {
            display: table-row-group !important;
          }
          table.invoice-items-table > tbody > tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .invoice-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .invoice-every-page-print-strip {
            display: block !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 6px !important;
            z-index: 9999 !important;
          }
          .print\\:hidden,
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id={id || "invoice-printable-root"}
        data-accent-color={effectiveColor}
        className={`invoice-printable-container w-full bg-white text-gray-900 shadow-xl rounded-xl overflow-hidden border transition-all text-xs select-none print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:overflow-visible flex flex-col justify-between ${isMinimal ? "border-gray-300 font-sans" : "border-gray-200/90"
          }`}
        style={{
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.08)",
          minHeight: "100%",
        }}
      >
        {/* Direct browser print (Ctrl+P) fallback: color strip at the bottom of every page */}
        <div
          className="invoice-every-page-print-strip hidden print:block pointer-events-none"
          style={{ backgroundColor: effectiveColor }}
          aria-hidden="true"
        />

        {/* Main Content Area: Header, Client Details, and Line Items */}
        <div className="invoice-main-content flex-1 flex flex-col w-full">
          {/* 1. Top Strip: Plain solid for Classic, Diagonal Striped for Modern */}
          {isClassic && (
            <div
              className="w-full h-2"
              style={{ backgroundColor: effectiveColor }}
            />
          )}
          {isModern && (
            <div
              className="w-full h-2"
              style={{
                backgroundColor: effectiveColor,
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12) 10px, transparent 10px, transparent 20px)",
              }}
            />
          )}

          {/* 2. Top Header Row: Soft tinted ONLY for Modern; Plain/transparent for Classic & Minimal */}
          <div
            className={`px-5 py-3 sm:px-8 sm:py-3.5 flex items-start justify-between gap-4 print:px-6 print:py-2.5 ${isModern
              ? "border-b"
              : isMinimal
                ? "border-b border-gray-300 bg-transparent pb-3"
                : "border-b border-gray-100 bg-transparent"
              }`}
            style={{
              backgroundColor: isModern
                ? `color-mix(in srgb, ${effectiveColor} 6%, #f8faff)`
                : "transparent",
              borderBottomColor: isModern
                ? `color-mix(in srgb, ${effectiveColor} 20%, #e2e8f0)`
                : undefined,
            }}
          >
            {/* Firm Logo & Name */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              {firmLogoUrl ? (
                <img
                  src={firmLogoUrl}
                  alt={firmName}
                  crossOrigin="anonymous"
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain"
                />
              ) : showCaLogo ? (
                <CaIndiaLogo size={46} />
              ) : null}

              <div>
                <h2
                  className={`text-lg sm:text-xl font-bold tracking-tight ${isMinimal ? "text-black" : "text-gray-900"
                    }`}
                >
                  {firmName || "Your Firm Name"}
                </h2>
                {firmAddress && (
                  <p className="text-[10.5px] text-gray-500 max-w-sm leading-tight mt-0.5">
                    {firmAddress}
                  </p>
                )}
                {(firmGstin || firmPan) && (
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                    {firmGstin && (
                      <span>
                        GSTIN: <span className="font-semibold text-gray-700">{firmGstin}</span>
                      </span>
                    )}
                    {firmPan && (
                      <span>
                        PAN: <span className="font-semibold text-gray-700">{firmPan}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tax Invoice Badge & Number & Dates */}
            <div className="text-right shrink-0">
              <h1
                className="text-lg sm:text-xl font-extrabold uppercase tracking-wide"
                style={{ color: effectiveColor }}
              >
                {isClassic ? effectiveTitle : effectiveTitle.toUpperCase()}
              </h1>
              <p className="text-xs sm:text-sm font-bold font-mono text-gray-700 mt-0.5">
                {invoiceNumber}
              </p>
              <div className="text-[10.5px] text-gray-500 mt-0.5">
                <span>Date: </span>
                <span className="font-semibold text-gray-800">{invoiceDate}</span>
                <span className="ml-2">Due: </span>
                <span className="font-semibold text-gray-800">{dueDate}</span>
              </div>
            </div>
          </div>

          {/* Persistent Spacer between Header and Content */}
          <div className="w-full h-2 sm:h-2.5 print:h-2 bg-transparent" aria-hidden="true" />

          {/* 3. Main Body */}
          <div className="px-5 pb-3.5 sm:px-8 sm:pb-4 space-y-3.5 print:px-6 print:pb-2 print:space-y-2 flex-1">
            {/* Client Details & Dates / Meta */}
            {isClassic ? (
              /* Classic: NO border in any card and area */
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 invoice-avoid-break">
                <div className="space-y-1">
                  <span
                    className="text-xs font-bold uppercase tracking-wider block mb-1"
                    style={{ color: effectiveColor }}
                  >
                    BILL TO
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
                    {effectiveClientName}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                    {effectiveClientAddress}
                  </p>
                  <div className="space-y-0.5 text-xs text-gray-600 pt-1">
                    {effectiveGstin && (
                      <div>
                        <span className="text-gray-500 font-medium">GSTIN: </span>
                        <span className="font-medium text-gray-800">{effectiveGstin}</span>
                      </div>
                    )}
                    {effectivePan && (
                      <div>
                        <span className="text-gray-500 font-medium">PAN: </span>
                        <span className="font-medium text-gray-800">{effectivePan}</span>
                      </div>
                    )}
                    {effectiveTan && (
                      <div>
                        <span className="text-gray-500 font-medium">TAN: </span>
                        <span className="font-medium text-gray-800">{effectiveTan}</span>
                      </div>
                    )}
                    {effectiveContact && (
                      <div>
                        <span className="text-gray-500 font-medium">Contact: </span>
                        <span className="font-medium text-gray-800">{effectiveContact}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-gray-500 text-xs">
                      {effectiveEmail && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" /> {effectiveEmail}
                        </span>
                      )}
                      {effectivePhone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" /> {effectivePhone}
                        </span>
                      )}
                    </div>
                    {effectivePos && (
                      <div className="pt-0.5">
                        <span className="text-gray-500 font-medium">POS: </span>
                        <span className="font-medium text-gray-800">{effectivePos}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Classic Invoice Dates - Clean text on right without card border */}
                <div className="text-right space-y-3 shrink-0 pt-1">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      INVOICE DATE
                    </span>
                    <span className="text-sm font-bold text-gray-800 block">
                      {invoiceDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      DUE DATE
                    </span>
                    <span className="text-sm font-bold text-gray-800 block">
                      {dueDate}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Modern / Minimal: Two rounded bordered cards */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 print:gap-2.5 invoice-avoid-break">
                {/* Bill To Card (Col Span 2) */}
                <div
                  className={`sm:col-span-2 p-3.5 sm:p-4 print:p-2.5 rounded-xl bg-white shadow-xs ${isMinimal ? "" : "border border-gray-200/90"
                    }`}
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider block mb-1.5"
                    style={{ color: effectiveColor }}
                  >
                    BILL TO
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">
                    {effectiveClientName}
                  </h3>
                  <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">
                    {effectiveClientAddress}
                  </p>
                  <div className="space-y-0.5 text-xs text-gray-600">
                    {effectiveGstin && (
                      <div>
                        <span className="text-gray-500 font-medium">GSTIN: </span>
                        <span className="font-medium text-gray-800">{effectiveGstin}</span>
                      </div>
                    )}
                    {effectivePan && (
                      <div>
                        <span className="text-gray-500 font-medium">PAN: </span>
                        <span className="font-medium text-gray-800">{effectivePan}</span>
                      </div>
                    )}
                    {effectiveTan && (
                      <div>
                        <span className="text-gray-500 font-medium">TAN: </span>
                        <span className="font-medium text-gray-800">{effectiveTan}</span>
                      </div>
                    )}
                    {effectiveContact && (
                      <div>
                        <span className="text-gray-500 font-medium">Contact: </span>
                        <span className="font-medium text-gray-800">{effectiveContact}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-gray-500 text-xs">
                      {effectiveEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-gray-400" /> {effectiveEmail}
                        </span>
                      )}
                      {effectivePhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" /> {effectivePhone}
                        </span>
                      )}
                    </div>
                    {effectivePos && (
                      <div className="pt-0.5">
                        <span className="text-gray-500 font-medium">POS: </span>
                        <span className="font-medium text-gray-800">{effectivePos}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Meta Box (Only for Non-Minimal) */}
                {!isMinimal && (
                  <div className="p-3.5 sm:p-4 print:p-2.5 rounded-xl bg-white border border-gray-200/90 shadow-xs flex flex-col justify-between space-y-2 print:space-y-1">
                    <div>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider block"
                        style={{ color: effectiveColor }}
                      >
                        INVOICE NO.
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono text-gray-900 mt-0.5 block">
                        {invoiceNumber}
                      </span>
                    </div>
                    <div className="border-t border-gray-100 pt-1.5 print:pt-1">
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider block"
                        style={{ color: effectiveColor }}
                      >
                        INVOICE DATE
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 block">
                        {invoiceDate}
                      </span>
                    </div>
                    <div className="border-t border-gray-100 pt-1.5 print:pt-1">
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider block"
                        style={{ color: effectiveColor }}
                      >
                        DUE DATE
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 block">
                        {dueDate}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Line Items Table */}
            {(() => {
              const optionalColsWidth = (showHsnSac ? 9 : 0) + (showQuantity ? 5 : 0) + (showCgst ? 7 : 0) + (showSgst ? 7 : 0);
              const descWidth = Math.max(26, 100 - 43 - optionalColsWidth);
              return (
                <div
                  className={`overflow-hidden rounded-xl print:overflow-visible print:rounded-none print:border-none print:shadow-none ${isMinimal
                    ? ""
                    : isClassic
                      ? "border border-gray-100"
                      : "border border-gray-200/90 shadow-xs"
                    }`}
                >
                  <table className="w-full border-collapse text-left text-xs table-fixed invoice-items-table">
                    <colgroup>
                      <col style={{ width: "4%" }} />
                      <col style={{ width: `${descWidth}%` }} />
                      {showHsnSac && <col style={{ width: "9%" }} />}
                      {showQuantity && <col style={{ width: "5%" }} />}
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "7%" }} />
                      {showCgst && <col style={{ width: "7%" }} />}
                      {showSgst && <col style={{ width: "7%" }} />}
                      <col style={{ width: "11%" }} />
                    </colgroup>
                    <thead>
                      <tr
                        className="font-bold text-[10px] sm:text-[11px] tracking-wider uppercase"
                        style={{
                          backgroundColor: isMinimal ? "#ffffff" : effectiveColor,
                          color: isMinimal ? effectiveColor : "#ffffff",
                          borderBottom: isMinimal ? `2px solid ${effectiveColor}` : undefined,
                        }}
                      >
                        <th className="py-1.5 sm:py-2 print:py-1 px-1.5 sm:px-2 text-center opacity-90">#</th>
                        <th className="py-1.5 sm:py-2 print:py-1 px-2 sm:px-3 text-left tracking-wider">
                          DESCRIPTION
                        </th>
                        {showHsnSac && <th className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-center whitespace-nowrap">HSN/SAC</th>}
                        {showQuantity && <th className="py-1.5 sm:py-2 print:py-1 px-1 text-center whitespace-nowrap">QTY</th>}
                        <th className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right whitespace-nowrap">RATE</th>
                        <th className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right whitespace-nowrap">TAXABLE</th>
                        <th className="py-1.5 sm:py-2 print:py-1 px-1 text-center whitespace-nowrap">GST %</th>
                        {showCgst && <th className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right whitespace-nowrap">CGST</th>}
                        {showSgst && <th className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right whitespace-nowrap">SGST</th>}
                        <th className="py-1.5 sm:py-2 print:py-1 px-2 sm:px-3 text-right whitespace-nowrap font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                      {normalizedItems.map((item, idx) => {
                        const isComplianceInHsn = item.hsnSac && item.hsnSac.startsWith("FY");
                        const cleanHsn = isComplianceInHsn ? "998211" : (item.hsnSac || "998211");
                        const periodNote = isComplianceInHsn ? item.hsnSac : null;
                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors invoice-avoid-break print:break-inside-avoid">
                            <td className="py-1.5 sm:py-2 print:py-1 px-1.5 sm:px-2 text-center font-medium text-gray-400 align-top text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 sm:py-2 print:py-1 px-2 sm:px-3 align-top overflow-hidden">
                              <div className="font-bold text-gray-900 text-xs sm:text-[13px] leading-snug break-words">
                                {item.name}
                              </div>
                              {showDescription && item.description && item.description !== item.name && (
                                <div className="text-[11px] text-gray-500 font-normal mt-0.5 leading-relaxed whitespace-pre-line break-words">
                                  {item.description}
                                </div>
                              )}
                              {showDescription && periodNote && !item.description?.includes(periodNote) && (
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                                  Period: {periodNote}
                                </div>
                              )}
                            </td>
                            {showHsnSac && (
                              <td className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-center font-mono text-gray-600 align-top text-[11px] whitespace-nowrap">
                                {cleanHsn}
                              </td>
                            )}
                            {showQuantity && (
                              <td className="py-1.5 sm:py-2 print:py-1 px-1 text-center font-medium align-top whitespace-nowrap text-gray-700 text-xs">
                                {item.qty}
                              </td>
                            )}
                            <td className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right font-mono text-gray-700 align-top text-[11px] whitespace-nowrap">
                              ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right font-mono text-gray-700 align-top text-[11px] whitespace-nowrap">
                              ₹{item.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 sm:py-2 print:py-1 px-1 text-center text-gray-600 align-top text-[11px] whitespace-nowrap">
                              {item.gstRate}%
                            </td>
                            {showCgst && (
                              <td className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right font-mono text-gray-600 align-top text-[11px] whitespace-nowrap">
                                ₹{item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            {showSgst && (
                              <td className="py-1.5 sm:py-2 print:py-1 px-1 sm:px-1.5 text-right font-mono text-gray-600 align-top text-[11px] whitespace-nowrap">
                                ₹{item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="py-1.5 sm:py-2 print:py-1 px-2 sm:px-3 text-right font-mono font-bold text-gray-900 align-top text-[11px] whitespace-nowrap">
                              ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 4. Last Page Footer (Final element in printable container flow, pinned via margin-top: auto) */}
        <div className="invoice-last-page-footer invoice-bottom-pinned-section invoice-avoid-break print:break-inside-avoid print:page-break-inside-avoid w-full flex flex-col justify-end mt-auto">
          <div className="px-5 sm:px-8 space-y-2.5 print:px-6 print:space-y-1.5 pb-2 print:pb-1">
            {/* Totals & Amount in Words */}
            {isClassic ? (
              /* Classic: NO border, simple bg gray for Amount in Words, and total has NO bg color */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                {/* Amount In Words - simple subtle gray, no color */}
                <div className="p-3 rounded-xl bg-gray-50 space-y-1 print:p-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    AMOUNT IN WORDS
                  </span>
                  <p className="text-xs sm:text-sm italic font-semibold text-gray-700 leading-relaxed">
                    {effectiveWords}
                  </p>
                </div>

                {/* Totals computation - no border, total amount with NO background color */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-gray-900">₹{calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Amount</span>
                    <span className="font-mono font-bold text-gray-900">₹{calculatedTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {calculatedCgst > 0 && (
                    <div className="border-t border-dotted border-gray-300 my-2 pt-2 flex justify-between text-gray-600">
                      <span>CGST (9%)</span>
                      <span className="font-mono font-bold text-gray-900">₹{calculatedCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {calculatedSgst > 0 && (
                    <div className={`flex justify-between text-gray-600 ${calculatedCgst === 0 ? 'border-t border-dotted border-gray-300 my-2 pt-2' : ''}`}>
                      <span>SGST (9%)</span>
                      <span className="font-mono font-bold text-gray-900">₹{calculatedSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {/* Total Amount without background color */}
                  <div
                    className="border-t border-gray-300 pt-2.5 flex justify-between items-center text-sm font-extrabold"
                    style={{ color: effectiveColor }}
                  >
                    <span>Total</span>
                    <span className="text-base sm:text-lg font-mono">₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Modern / Minimal: Bordered cards with Total Amount colored box */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 print:gap-2.5 items-start">
                {/* Amount In Words Box */}
                <div
                  className={`p-3 sm:p-3.5 print:p-2 rounded-xl shadow-xs border`}
                  style={{
                    backgroundColor: isMinimal
                      ? "#ffffff"
                      : `color-mix(in srgb, ${effectiveColor} 5%, #ffffff)`,
                    borderColor: isMinimal
                      ? "#d1d5db"
                      : `color-mix(in srgb, ${effectiveColor} 20%, #e2e8f0)`,
                  }}
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider block mb-1.5"
                    style={{ color: effectiveColor }}
                  >
                    AMOUNT IN WORDS
                  </span>
                  <p className="text-xs sm:text-sm italic font-semibold text-gray-800 leading-relaxed">
                    {effectiveWords}
                  </p>
                </div>

                {/* Totals Computation */}
                <div>
                  <div
                    className={`rounded-t-xl bg-white shadow-xs p-3 sm:p-3.5 print:p-2 space-y-1.5 print:space-y-1 text-xs ${isMinimal ? "border border-gray-300" : "border border-gray-200/90"
                      }`}
                  >
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-mono font-bold text-gray-900">₹{calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Taxable Amount</span>
                      <span className="font-mono font-bold text-gray-900">₹{calculatedTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {calculatedCgst > 0 && (
                      <div className="border-t border-dotted border-gray-300 my-1 pt-1 flex justify-between text-gray-600">
                        <span>CGST (9%)</span>
                        <span className="font-mono font-bold text-gray-900">₹{calculatedCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {calculatedSgst > 0 && (
                      <div className={`flex justify-between text-gray-600 ${calculatedCgst === 0 ? 'border-t border-dotted border-gray-300 my-1 pt-1' : ''}`}>
                        <span>SGST (9%)</span>
                        <span className="font-mono font-bold text-gray-900">₹{calculatedSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex justify-between items-center px-3.5 py-2 print:py-1.5 rounded-b-xl text-white shadow-xs ${isMinimal
                      ? "border-t-2 pt-2 bg-transparent px-0 rounded-none shadow-none"
                      : ""
                      }`}
                    style={{
                      backgroundColor: isMinimal ? "transparent" : effectiveColor,
                      color: isMinimal ? effectiveColor : "#ffffff",
                      borderTopColor: isMinimal ? effectiveColor : undefined,
                    }}
                  >
                    <span className="text-xs sm:text-sm font-bold">
                      {isMinimal ? "Total" : "Total Amount"}
                    </span>
                    <span className="text-base sm:text-lg font-bold font-mono">
                      ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details & QR Code */}
            {isClassic ? (
              /* Classic: NO border in any card and area */
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span
                  className="text-xs font-bold uppercase tracking-wider block"
                  style={{ color: effectiveColor }}
                >
                  PAYMENT DETAILS
                </span>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-1 text-xs">
                  {/* Bank Info borderless */}
                  <div className="space-y-2 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      BANK DETAILS
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">A/C Holder</span>
                      <span className="col-span-2 font-bold text-gray-900">
                        {accountHolderName || "M/s Sharma & Associates"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">A/C No.</span>
                      <span className="col-span-2 font-mono font-bold text-gray-900">
                        {accountNumber || "50200012345678"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">IFSC</span>
                      <span className="col-span-2 font-mono font-bold text-gray-900">
                        {ifscCode || "HDFC0001234"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">Branch</span>
                      <span className="col-span-2 font-medium text-gray-800">
                        {branchName || "Koramangala, Bengaluru"}
                      </span>
                    </div>
                  </div>

                  {/* QR without box border */}
                  <div className="flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      SCAN TO PAY
                    </span>
                    <div className="w-22 h-22 sm:w-24 sm:h-24 bg-white border border-gray-200 p-1.5 rounded-xl shadow-xs flex items-center justify-center">
                      <DynamicUpiQrCode
                        upiId={upiId}
                        payeeName={accountHolderName || firmName}
                        amount={calculatedTotal}
                        invoiceNumber={invoiceNumber}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-700 mt-2 font-medium">
                      {upiId || "sharma@hdfc"}
                    </span>
                    {calculatedTotal > 0 && (
                      <span className="text-[11px] font-semibold text-gray-900 mt-0.5">
                        ₹{calculatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Modern / Minimal: Bordered payment card */
              <div className="space-y-1.5">
                <span
                  className="text-xs font-bold uppercase tracking-wider block"
                  style={{ color: effectiveColor }}
                >
                  PAYMENT DETAILS
                </span>
                <div
                  className={`rounded-xl overflow-hidden flex flex-col sm:flex-row bg-white shadow-xs ${isMinimal ? "border border-gray-300" : "border border-gray-200/90"
                    }`}
                >
                  {/* Bank Info */}
                  <div className="flex-1 p-3.5 sm:p-4 print:p-2.5 space-y-1.5 print:space-y-1 text-xs">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                      BANK DETAILS
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">A/C Holder</span>
                      <span className="col-span-2 font-bold text-gray-900">
                        {accountHolderName || "M/s Sharma & Associates"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">A/C No.</span>
                      <span className="col-span-2 font-mono font-bold text-gray-900">
                        {accountNumber || "50200012345678"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">IFSC</span>
                      <span className="col-span-2 font-mono font-bold text-gray-900">
                        {ifscCode || "HDFC0001234"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-500 font-medium">Branch</span>
                      <span className="col-span-2 font-medium text-gray-800">
                        {branchName || "Koramangala, Bengaluru"}
                      </span>
                    </div>
                  </div>

                  {/* Scan To Pay QR Box */}
                  <div
                    className={`w-full sm:w-48 p-3 sm:p-3.5 print:p-2 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l text-center`}
                    style={{
                      backgroundColor: isMinimal
                        ? "rgba(249, 250, 251, 0.5)"
                        : `color-mix(in srgb, ${effectiveColor} 5%, #ffffff)`,
                      borderColor: isMinimal
                        ? "#d1d5db"
                        : `color-mix(in srgb, ${effectiveColor} 20%, #e2e8f0)`,
                    }}
                  >
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: effectiveColor }}
                    >
                      SCAN TO PAY
                    </span>
                    <div className="w-20 h-20 sm:w-22 sm:h-22 bg-white border border-gray-200 p-1 rounded-xl shadow-xs flex items-center justify-center">
                      <DynamicUpiQrCode
                        upiId={upiId}
                        payeeName={accountHolderName || firmName}
                        amount={calculatedTotal}
                        invoiceNumber={invoiceNumber}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-gray-700 mt-1.5 font-medium">
                      {upiId || "sharma@hdfc"}
                    </span>
                    {calculatedTotal > 0 && (
                      <span className="text-[10.5px] font-semibold text-gray-900 mt-0.5">
                        ₹{calculatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* For Classic & Minimal: Notes inside the body container */}
            {!isModern && (
              <div className="pt-2 flex flex-col sm:flex-row items-end justify-between gap-6">
                <div className="space-y-1.5 max-w-lg text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    NOTES
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed">{notes}</p>
                </div>

                <div className="flex flex-col items-center min-w-[180px]">
                  {digitalSignatureUrl ? (
                    <img
                      src={digitalSignatureUrl}
                      alt="Digital Signature"
                      crossOrigin="anonymous"
                      className="h-10 object-contain mb-1"
                    />
                  ) : (
                    <div className="h-8 w-36 mb-1" />
                  )}
                  <div className="w-full border-t border-gray-400 mb-1.5" />
                  <span className="text-xs font-bold text-gray-700">
                    Authorised Signatory
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. For Modern: Notes has FULL HORIZONTAL WIDTH with NO padding/margin to the document, similar to header */}
          {isModern && (
            <div
              className="w-full border-t border-b px-5 py-2.5 sm:px-8 sm:py-3 print:px-6 print:py-2 flex flex-col sm:flex-row items-end justify-between gap-4"
              style={{
                backgroundColor: `color-mix(in srgb, ${effectiveColor} 4%, #f8faff)`,
                borderTopColor: `color-mix(in srgb, ${effectiveColor} 20%, #e2e8f0)`,
                borderBottomColor: `color-mix(in srgb, ${effectiveColor} 20%, #e2e8f0)`,
              }}
            >
              <div className="space-y-1 max-w-lg text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  NOTES
                </span>
                <p className="text-xs text-gray-600 leading-relaxed">{notes}</p>
              </div>

              {/* Authorised Signatory */}
              <div className="flex flex-col items-center min-w-[170px]">
                {digitalSignatureUrl ? (
                  <img
                    src={digitalSignatureUrl}
                    alt="Digital Signature"
                    crossOrigin="anonymous"
                    className="h-8 object-contain mb-0.5"
                  />
                ) : (
                  <div className="h-6 w-32 mb-0.5" />
                )}
                <div className="w-full border-t border-gray-400 mb-1" />
                <span className="text-xs font-bold text-gray-700">
                  Authorised Signatory
                </span>
              </div>
            </div>
          )}

          {/* System Generated Invoice Footer Line */}
          <div className="py-1 print:py-0.5 text-center text-xs text-gray-400">
            This is a system-generated invoice.
          </div>

          {/* Bottom Solid Accent Strip (for Classic AND Modern to frame flush with page bottom) */}
          <div
            className="w-full h-1.5 shrink-0"
            style={{ backgroundColor: effectiveColor }}
          />
        </div>
      </div>
    </>
  );
};

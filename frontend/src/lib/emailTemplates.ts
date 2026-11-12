/**
 * Pre-filled Email Templates for Invoices, Receipts, Document Requests, and Task Reminders
 */

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export function generateInvoiceEmailTemplate(invoice: any, firmName: string = 'CA Practice Management'): EmailDraft {
  const number = invoice.invoiceNumber || invoice.number || 'INV';
  const clientName = invoice.clientName || invoice.businessName || invoice.legalName || 'Valued Client';
  const to = invoice.clientEmail || invoice.email || '';
  const total = Number(invoice.total || invoice.totalPayable || invoice.amount || 0);
  const formattedTotal = total ? `₹${total.toLocaleString('en-IN')}` : '₹0.00';
  const dueDate = invoice.dueDate || invoice.issueDate || 'Upon Receipt';
  const isCredit = invoice.type === 'credit_note' || invoice.kind === 'credit_note';
  const label = isCredit ? 'Credit Note' : 'Tax Invoice';

  const subject = `${label} #${number} from ${firmName} - ${formattedTotal}`;
  const body = `Dear ${clientName},

Please find the billing details for the ${label.toLowerCase()} issued for professional services rendered to your account:

--------------------------------------------------
${label} Number : #${number}
Total Amount Due  : ${formattedTotal}
Due Date          : ${dueDate}
--------------------------------------------------

Kindly arrange for settlement on or before the due date. If you have already made this payment or have any queries, feel free to reply to this email.

Warm regards,
Billing & Accounts Team
${firmName}`;

  return { to, subject, body };
}

export function generateReceiptEmailTemplate(receipt: any, firmName: string = 'CA Practice Management'): EmailDraft {
  const receiptNo = receipt.receiptNo || 'REC';
  const clientName = receipt.clientName || receipt.businessName || receipt.legalName || 'Valued Client';
  const to = receipt.clientEmail || receipt.email || '';
  const amount = Number(receipt.amount || 0);
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  const method = receipt.method || 'Bank Transfer';
  const invoiceNumber = receipt.invoiceNumber || 'N/A';
  const dateStr = receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString('en-IN') : 'Today';

  const subject = `Payment Receipt #${receiptNo} - ${formattedAmount} - ${firmName}`;
  const body = `Dear ${clientName},

Thank you for your prompt payment. We gratefully acknowledge the receipt of your payment with the following details:

--------------------------------------------------
Receipt Number    : #${receiptNo}
Amount Received   : ${formattedAmount}
Payment Date      : ${dateStr}
Payment Mode      : ${method}
Against Invoice   : ${invoiceNumber}
--------------------------------------------------

This is an electronically generated acknowledgment receipt. If you require a consolidated statement of account, please contact our desk.

Warm regards,
Accounts Department
${firmName}`;

  return { to, subject, body };
}

export function generateDocRequestEmailTemplate(
  task: any,
  docs: any[],
  clientEmail?: string,
  firmName: string = 'CA Practice Management'
): EmailDraft {
  const taskName = task.taskName || task.title || 'Professional Engagement';
  const clientName = task.clientName || 'Valued Client';
  const to = clientEmail || task.clientEmail || '';
  const service = task.serviceName || 'Compliance & Tax Services';
  const dueDate = task.targetDueDate || task.dueDate || 'As soon as possible';
  const assignee = task.assigneeName || 'Audit & Taxation Team';

  // Only list documents that are still pending / not yet received or uploaded
  const pendingDocs = (docs || []).filter((d: any) => d.status !== 'Received' && !d.fileUrl);
  const effectiveDocs = pendingDocs.length > 0 ? pendingDocs : docs;

  const docList = effectiveDocs && effectiveDocs.length > 0
    ? effectiveDocs.map((d: any, i: number) => `${i + 1}. ${d.title || d.name || 'Required Document'}${d.isMandatory ? ' [Mandatory]' : ''}${d.description ? ` - ${d.description}` : ''}`).join('\n')
    : '1. Required statutory documents and statements.';

  const isSingle = effectiveDocs.length === 1;
  const singleDocTitle = isSingle ? (effectiveDocs[0].title || effectiveDocs[0].name || 'Document') : '';

  const subject = isSingle
    ? `Document Request: ${singleDocTitle} for ${taskName} - ${clientName}`
    : `Action Required: Document Request for ${taskName} - ${clientName}`;

  const body = `Dear ${clientName},

Our team is actively processing your engagement: ${taskName} (${service}).

To proceed with the statutory filing and review procedures without delay, kindly provide the following document${isSingle ? '' : '(s)'} at your earliest convenience:

--------------------------------------------------
${isSingle ? 'REQUESTED DOCUMENT:' : 'REQUESTED DOCUMENTS:'}
${docList}
--------------------------------------------------
Target Due Date : ${dueDate}
Assigned Lead   : ${assignee}
--------------------------------------------------

You may reply directly to this email with the requested file${isSingle ? '' : 's'} attached, or upload them securely to your client workspace.

Warm regards,
${assignee}
${firmName}`;

  return { to, subject, body };
}

export function generateTaskReminderEmailTemplate(
  task: any,
  clientEmail?: string,
  firmName: string = 'CA Practice Management'
): EmailDraft {
  const taskName = task.taskName || task.title || 'Professional Engagement';
  const clientName = task.clientName || 'Valued Client';
  const to = clientEmail || task.clientEmail || '';
  const service = task.serviceName || 'Statutory Compliance';
  const dueDate = task.targetDueDate || task.dueDate || 'Upcoming';
  const assignee = task.assigneeName || 'Audit & Taxation Team';

  const subject = `Gentle Reminder: ${taskName} - Due on ${dueDate}`;
  const body = `Dear ${clientName},

This is a gentle reminder regarding your upcoming engagement: ${taskName} (${service}).

--------------------------------------------------
Target Filing / Due Date : ${dueDate}
Current Status          : ${task.status || 'In Progress'}
Engagement Lead         : ${assignee}
--------------------------------------------------

Please let us know if any additional information or documentation is required from your side before the deadline.

Warm regards,
${assignee}
${firmName}`;

  return { to, subject, body };
}


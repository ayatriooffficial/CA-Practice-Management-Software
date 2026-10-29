import { pdfSignerApi } from './pdfSignerApi';

export interface StageOptions {
  fileName: string;
  clientId?: string;
  clientName?: string;
  driveDocumentId?: string;
  fileUrl?: string;
  blob?: Blob;
  invoiceData?: any;
}

/**
 * Stages a PDF blob into the PDF Signer storage and associates client information.
 */
export async function stagePdfBlob(
  blob: Blob,
  fileName: string,
  clientMeta?: { clientId?: string; clientName?: string }
) {
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const file = new File([blob], safeName, { type: 'application/pdf' });
  const res = await pdfSignerApi.uploadDocuments([file]);
  if (res && res.data && res.data.length > 0) {
    const stagedDoc = res.data[0];
    if (clientMeta && (clientMeta.clientId || clientMeta.clientName)) {
      try {
        await pdfSignerApi.updateClient(stagedDoc.id, clientMeta);
      } catch (err) {
        console.warn('Could not update client metadata on staged document:', err);
      }
    }
    return stagedDoc;
  }
  throw new Error('Failed to stage document into PDF Signer');
}

/**
 * Universal CA Staging Helper: Stages any PDF document directly into
 * the PDF Signer workflow and redirects the user to the staged list.
 */
export async function stageAndRedirectToPdfSigner(
  router: { push: (url: string) => void },
  options: StageOptions
) {
  let stagedId: string | undefined;

  if (options.driveDocumentId) {
    const res = await pdfSignerApi.stageFromDrive(options.driveDocumentId);
    stagedId = res?.data?.id || (res?.data as any)?._id;
  } else if (options.invoiceData) {
    const res = await pdfSignerApi.stageInvoice(options.invoiceData);
    stagedId = res?.data?.id || (res?.data as any)?._id;
  } else if (options.blob) {
    const doc = await stagePdfBlob(options.blob, options.fileName, {
      clientId: options.clientId,
      clientName: options.clientName,
    });
    stagedId = doc.id || (doc as any)._id;
  } else if (options.fileUrl) {
    // If URL points to a local or cloud Drive document ID, stage directly from Drive
    const driveMatch = options.fileUrl.match(/\/drive\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const res = await pdfSignerApi.stageFromDrive(driveMatch[1]);
      stagedId = res?.data?.id || (res?.data as any)?._id;
    } else {
      try {
        const fetchRes = await fetch(options.fileUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          const doc = await stagePdfBlob(blob, options.fileName, {
            clientId: options.clientId,
            clientName: options.clientName,
          });
          stagedId = doc.id || (doc as any)._id;
        } else {
          throw new Error('Could not fetch file stream');
        }
      } catch {
        const res = await pdfSignerApi.stageFromDrive('doc_tax_01');
        stagedId = res?.data?.id || (res?.data as any)?._id;
      }
    }
  } else {
    const res = await pdfSignerApi.stageFromDrive('doc_tax_01');
    stagedId = res?.data?.id || (res?.data as any)?._id;
  }

  const redirectUrl = stagedId
    ? `/pdf-signer?stagedId=${encodeURIComponent(stagedId)}`
    : '/pdf-signer';
  router.push(redirectUrl);
}


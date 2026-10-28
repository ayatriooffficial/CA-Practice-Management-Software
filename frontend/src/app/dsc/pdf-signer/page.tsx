import { Metadata } from 'next';
import { PdfSignerPage } from '@/components/pdfSigner/PdfSignerPage';

export const metadata: Metadata = {
  title: 'PDF Signer | Ayatrio CRM',
  description: 'Cryptographically sign client PDF documents with registered Digital Signature Certificates (DSC).',
};

export default function PdfSignerRoute() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
      <PdfSignerPage />
    </div>
  );
}

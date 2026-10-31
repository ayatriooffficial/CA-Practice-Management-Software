import { Metadata } from "next";
import { InvoiceModule } from "@/components/invoice/InvoiceModule";

export const metadata: Metadata = {
  title: "Invoice & Billing Management | CA Practice",
  description: "Proforma bills, tax invoices, client reimbursements, payment receipts, and billing analytics.",
};

export default function InvoicePage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <InvoiceModule />
    </div>
  );
}


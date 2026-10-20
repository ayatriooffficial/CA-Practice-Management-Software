import { Metadata } from "next";
import { InvoiceModule } from "@/components/invoice/InvoiceModule";

export const metadata: Metadata = {
  title: "Invoice & Billing Management | Turia Practice",
  description: "Proforma bills, tax invoices, client reimbursements, payment receipts, and billing analytics.",
};

export default function InvoicePage() {
  return <InvoiceModule />;
}


import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Turia Practice - CA Practice Management Software",
  description: "Unified portal for CA practice management, GST, Income Tax, and TRACES notice tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}

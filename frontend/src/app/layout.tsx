import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { StoreProvider } from "@/store/StoreProvider";

export const metadata: Metadata = {
  title: "CA Practice - Practice Management Software",
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
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}

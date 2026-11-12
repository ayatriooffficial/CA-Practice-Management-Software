import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { StoreProvider } from "@/store/StoreProvider";

export const metadata: Metadata = {
  title: "CA Practice - Practice Management Software",
  description: "Unified portal for CA practice management, GST, Income Tax, and TRACES notice tracking",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CA Practice",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#31719B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Ayatrio CA Practice" />
        <meta name="ayatrio-extension-bridge" content="enabled" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] antialiased overflow-x-hidden">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}

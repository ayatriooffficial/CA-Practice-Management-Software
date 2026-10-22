import { Suspense } from "react";
import { NoticesShell } from "@/components/notices/NoticesShell";

export default function NoticesPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen w-full"
          style={{ backgroundColor: "var(--bg-app)" }}
        />
      }
    >
      <NoticesShell />
    </Suspense>
  );
}

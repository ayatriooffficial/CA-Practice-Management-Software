import { Suspense } from "react";
import { ComplianceShell } from "@/components/compliance/ComplianceShell";

export default function CompliancePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen w-full"
          style={{ backgroundColor: "var(--bg-app)" }}
        />
      }
    >
      <ComplianceShell />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthAnimationPanel } from "@/components/auth/AuthAnimationPanel";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Organization | CA Practice",
  description: "Create your firm organization account on CA Practice.",
};

export default function SignupPage() {
  return (
    <AuthLayout visualScene={<AuthAnimationPanel />} variant="signup">
      <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading signup...</div>}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}

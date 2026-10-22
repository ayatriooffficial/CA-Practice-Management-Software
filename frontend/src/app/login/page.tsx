import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthAnimationPanel } from "@/components/auth/AuthAnimationPanel";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | CA Practice",
  description: "Login to your CA Practice management dashboard.",
};

export default function LoginPage() {
  return (
    <AuthLayout visualScene={<AuthAnimationPanel />}>
      <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}

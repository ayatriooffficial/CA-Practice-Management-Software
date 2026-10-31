import { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding & Profile Setup - CA Practice",
  description: "Complete your organization profile, bank account, and firm preferences in CA Practice.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

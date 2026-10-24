import { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding & Profile Setup - Turia Practice",
  description: "Complete your organization profile, bank account, and firm preferences in Turia Practice.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

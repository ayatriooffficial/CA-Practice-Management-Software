import { Metadata } from "next";
import { GlobalDscPage } from "@/components/dsc/GlobalDscPage";

export const metadata: Metadata = {
  title: "Global DSC Management | Ayatrio CRM",
  description: "Centralized Digital Signature Certificate (DSC) tracker across all clients.",
};

export default function DscRoute() {
  return <GlobalDscPage />;
}

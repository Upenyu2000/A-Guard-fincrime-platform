import type { Metadata } from "next";
import { AmlWorkspace } from "@/components/aml/AmlWorkspace";

export const metadata: Metadata = {
  title: "AML, KYC & Transaction Governance | African Guard",
  description: "African Guard AML, KYC, KYB, suspicious microtransaction, SAR, and transaction-governance workspace.",
};

export default function AmlPage() {
  return <AmlWorkspace />;
}

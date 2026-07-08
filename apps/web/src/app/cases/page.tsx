import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Cases | African Guard",
  description: "African Guard investigation cases, evidence, exposure, recovery, and case timeline workspace.",
};

export default function CasesPage() {
  return <OperatingConsole section="cases" />;
}

import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Fraud Copilot | African Guard",
  description: "African Guard Financial Crime Copilot for case explanation, linked entities, and SAR draft support.",
};

export default function CopilotPage() {
  return <OperatingConsole section="copilot" />;
}

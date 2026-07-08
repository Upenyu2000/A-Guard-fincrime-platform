import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Agentic Risk Operations | African Guard",
  description: "African Guard agentic fraud and AML workflows, merchant monitoring, disputes, rules, and enablement.",
};

export default function AgentsPage() {
  return <OperatingConsole section="agents" />;
}

import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Alert Stream | African Guard",
  description: "Real-time African Guard fraud alert stream, risk heatmap, and severity distribution.",
};

export default function AlertsPage() {
  return <OperatingConsole section="alerts" />;
}

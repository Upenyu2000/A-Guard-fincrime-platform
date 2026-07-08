import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Identity Graph | African Guard",
  description: "African Guard identity graph, risk propagation, consortium intelligence, and fraud-ring workspace.",
};

export default function GraphPage() {
  return <OperatingConsole section="graph" />;
}

import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Security | African Guard",
  description: "African Guard audit stream, controls, RBAC, rate limiting, and secure consortium envelope controls.",
};

export default function SecurityPage() {
  return <OperatingConsole section="security" />;
}

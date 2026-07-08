import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Payment Tracking | African Guard",
  description: "African Guard payment tracking, recall, route, and interdiction workspace.",
};

export default function PaymentsPage() {
  return <OperatingConsole section="payments" />;
}

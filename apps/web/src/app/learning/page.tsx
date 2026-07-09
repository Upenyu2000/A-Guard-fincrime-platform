import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "Decision Intelligence Learning | African Guard",
  description: "African Guard feedback, drift, governed learning, and unified fraud plus AML risk monitoring.",
};

export default function LearningPage() {
  return <OperatingConsole section="learning" />;
}

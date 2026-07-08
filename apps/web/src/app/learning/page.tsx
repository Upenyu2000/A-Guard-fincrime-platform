import type { Metadata } from "next";
import { OperatingConsole } from "@/components/OperatingConsole";

export const metadata: Metadata = {
  title: "AI Learning | African Guard",
  description: "African Guard feedback, drift, model learning, and unified fraud plus AML risk monitoring.",
};

export default function LearningPage() {
  return <OperatingConsole section="learning" />;
}

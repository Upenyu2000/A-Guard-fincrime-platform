import { AuthenticatedRealtimeBridge } from "@/components/AuthenticatedRealtimeBridge";
import { OperatingConsole } from "@/components/OperatingConsole";

export default function Home() {
  return (
    <>
      <AuthenticatedRealtimeBridge />
      <OperatingConsole />
    </>
  );
}

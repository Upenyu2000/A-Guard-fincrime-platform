"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, Brain, CreditCard, Gauge, GitBranch, Landmark, LockKeyhole, Shield } from "lucide-react";

const items = [
  { icon: Gauge, label: "Command", href: "/" },
  { icon: Bell, label: "Alerts" },
  { icon: CreditCard, label: "Payments" },
  { icon: GitBranch, label: "Graph" },
  { icon: Bot, label: "Copilot" },
  { icon: Brain, label: "Agents" },
  { icon: Landmark, label: "AML", href: "/aml" },
  { icon: LockKeyhole, label: "Security" },
];

export function AppNavigation({ connected }: { connected: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] w-[88px] shrink-0 rounded-lg p-3 lg:block">
        <div className="flex h-full flex-col items-center justify-between">
          <div className="space-y-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-guard-violet to-guard-purple shadow-glow">
              <Shield className="h-6 w-6" aria-hidden />
            </div>
            <nav className="space-y-2" aria-label="Primary">
              {items.map((item) => (
                <NavItem key={item.label} item={item} active={item.href === pathname} />
              ))}
            </nav>
          </div>
          <div className="grid gap-2 text-center">
            <span className={`mx-auto h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{connected ? "Live" : "Local"}</span>
          </div>
        </div>
      </aside>

      <nav
        className="glass fixed bottom-3 left-3 right-3 z-50 grid grid-cols-4 gap-1 rounded-lg p-2 lg:hidden"
        aria-label="Mobile primary"
      >
        {items.filter((item) => item.href).map((item) => (
          <NavItem key={item.label} item={item} active={item.href === pathname} mobile />
        ))}
      </nav>
    </>
  );
}

function NavItem({
  item,
  active,
  mobile = false,
}: {
  item: { icon: typeof Shield; label: string; href?: string };
  active: boolean;
  mobile?: boolean;
}) {
  const className = `${
    mobile ? "flex h-11 flex-col items-center justify-center gap-1 text-[10px]" : "grid h-12 w-12 place-items-center"
  } rounded-lg border transition ${
    active
      ? "border-fuchsia-300/45 bg-fuchsia-400/16 text-white"
      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-fuchsia-300/40 hover:bg-white/10 hover:text-white"
  }`;

  if (item.href) {
    return (
      <Link href={item.href} className={className} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined}>
        <item.icon className="h-5 w-5" aria-hidden />
        {mobile ? <span>{item.label}</span> : null}
      </Link>
    );
  }

  return (
    <button type="button" className={className} title={`${item.label} is available in the command console`} aria-label={item.label}>
      <item.icon className="h-5 w-5" aria-hidden />
      {mobile ? <span>{item.label}</span> : null}
    </button>
  );
}

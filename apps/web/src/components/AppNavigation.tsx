"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, Brain, CreditCard, FileWarning, Gauge, GitBranch, Landmark, LockKeyhole, Shield, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const items = [
  { icon: Gauge, label: "Command", href: "/" },
  { icon: Bell, label: "Alerts", href: "/alerts" },
  { icon: CreditCard, label: "Payments", href: "/payments" },
  { icon: GitBranch, label: "Graph", href: "/graph" },
  { icon: FileWarning, label: "Cases", href: "/cases" },
  { icon: Bot, label: "Copilot", href: "/copilot" },
  { icon: Sparkles, label: "Agents", href: "/agents" },
  { icon: Landmark, label: "AML", href: "/aml" },
  { icon: Brain, label: "Learning", href: "/learning" },
  { icon: LockKeyhole, label: "Security", href: "/security" },
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
                <NavItem key={item.label} item={item} active={isActive(pathname, item.href)} />
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
        className="glass fixed bottom-3 left-3 right-3 z-50 flex gap-1 overflow-x-auto rounded-lg p-2 lg:hidden"
        aria-label="Mobile primary"
      >
        {items.map((item) => (
          <NavItem key={item.label} item={item} active={isActive(pathname, item.href)} mobile />
        ))}
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  item,
  active,
  mobile = false,
}: {
  item: { icon: LucideIcon; label: string; href: string };
  active: boolean;
  mobile?: boolean;
}) {
  const className = `${
    mobile ? "flex h-11 min-w-16 flex-col items-center justify-center gap-1 px-2 text-[10px]" : "grid h-12 w-12 place-items-center"
  } rounded-lg border transition ${
    active
      ? "border-fuchsia-300/45 bg-fuchsia-400/16 text-white"
      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-fuchsia-300/40 hover:bg-white/10 hover:text-white"
  }`;

  return (
    <Link href={item.href} className={className} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined}>
      <item.icon className="h-5 w-5" aria-hidden />
      {mobile ? <span>{item.label}</span> : null}
    </Link>
  );
}

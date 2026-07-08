"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  Brain,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileWarning,
  Gauge,
  GitBranch,
  Landmark,
  LockKeyhole,
  Shield,
  Sparkles,
} from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("african-guard-nav-expanded");
    if (stored) setExpanded(stored === "true");
  }, []);

  const toggleExpanded = () => {
    setExpanded((current) => {
      const next = !current;
      window.localStorage.setItem("african-guard-nav-expanded", String(next));
      return next;
    });
  };

  return (
    <>
      <aside
        className={`glass fixed top-4 z-40 hidden h-[calc(100vh-2rem)] shrink-0 rounded-lg p-3 transition-[width] duration-200 md:block ${
          expanded ? "w-[244px]" : "w-[88px]"
        }`}
        style={{ left: "max(1rem, calc((100vw - 1800px) / 2 + 1rem))" }}
      >
        <div className="flex h-full flex-col justify-between">
          <div className="min-w-0 space-y-3">
            <div className={`flex h-12 items-center gap-3 rounded-lg bg-gradient-to-br from-guard-violet to-guard-purple shadow-glow ${expanded ? "px-3" : "justify-center"}`}>
              <Shield className="h-6 w-6 shrink-0" aria-hidden />
              {expanded ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">African Guard</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/55">FinCrime OS</p>
                </div>
              ) : null}
            </div>
            <nav className="space-y-2" aria-label="Primary">
              {items.map((item) => (
                <NavItem key={item.label} item={item} active={isActive(pathname, item.href)} expanded={expanded} />
              ))}
            </nav>
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={toggleExpanded}
              className={`flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-fuchsia-300/40 hover:bg-white/10 hover:text-white ${
                expanded ? "justify-between px-3" : "justify-center"
              }`}
              aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
              aria-expanded={expanded}
            >
              {expanded ? <span className="text-xs font-medium">Collapse</span> : null}
              {expanded ? <ChevronLeft className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            </button>
            <div className={`flex items-center gap-2 ${expanded ? "justify-start px-2" : "justify-center"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
              {expanded ? <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{connected ? "Live" : "Local"}</span> : null}
            </div>
          </div>
        </div>
      </aside>
      <div className={`hidden shrink-0 transition-[width] duration-200 md:block ${expanded ? "w-[244px]" : "w-[88px]"}`} aria-hidden />

      <nav
        className="glass fixed bottom-3 left-3 right-3 z-50 flex gap-1 overflow-x-auto rounded-lg p-2 md:hidden"
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
  expanded = false,
  mobile = false,
}: {
  item: { icon: LucideIcon; label: string; href: string };
  active: boolean;
  expanded?: boolean;
  mobile?: boolean;
}) {
  const className = `${
    mobile
      ? "flex h-11 min-w-16 flex-col items-center justify-center gap-1 px-2 text-[10px]"
      : expanded
        ? "flex h-11 w-full items-center gap-3 px-3 text-sm"
        : "grid h-12 w-12 place-items-center"
  } rounded-lg border transition ${
    active
      ? "border-fuchsia-300/45 bg-fuchsia-400/16 text-white"
      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-fuchsia-300/40 hover:bg-white/10 hover:text-white"
  }`;

  return (
    <Link href={item.href} className={className} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined}>
      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
      {mobile || expanded ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

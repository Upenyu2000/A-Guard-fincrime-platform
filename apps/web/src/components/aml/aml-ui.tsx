"use client";

import { ReactNode } from "react";
import { RiskLevel } from "@/lib/types";

export const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const riskClass: Record<RiskLevel, string> = {
  low: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  medium: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  high: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  critical: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100",
};

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-4 ${className}`}>{children}</section>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-white/58">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-white/48">{detail}</p>
    </div>
  );
}

export function StatusPill({ children, tone = "medium" }: { children: ReactNode; tone?: RiskLevel }) {
  return <span className={`rounded-md border px-2 py-1 text-xs capitalize ${riskClass[tone]}`}>{children}</span>;
}

export function MiniBar({ value, tone = "high" }: { value: number; tone?: RiskLevel }) {
  const color = tone === "critical" ? "bg-fuchsia-400" : tone === "high" ? "bg-rose-400" : tone === "medium" ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
    </div>
  );
}

export function SimpleBars({ data }: { data: Array<{ label: string; value: number; secondaryValue?: number; risk?: RiskLevel }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.length === 0) return <EmptyState title="No data yet" detail="The API returned an empty series for this visualisation." />;
  return (
    <div className="grid gap-2">
      {data.slice(0, 8).map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(100px,0.45fr)_minmax(0,1fr)_70px] items-center gap-3 text-xs">
          <span className="truncate text-white/58">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-guard-violet to-guard-teal" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
          </div>
          <span className="text-right text-white/70">{compact.format(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function timeAgo(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

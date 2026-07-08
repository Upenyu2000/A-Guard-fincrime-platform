"use client";

import { Building2, RefreshCcw, ShieldCheck } from "lucide-react";
import { BusinessKybProfile } from "@/lib/aml-types";
import { money, Panel, StatusPill } from "./aml-ui";
import { OwnershipGraph } from "./OwnershipGraph";

export function BusinessKybWorkspace({
  businesses,
  onRefresh,
  onScreen,
}: {
  businesses: BusinessKybProfile[];
  onRefresh: (id: string) => void;
  onScreen: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {businesses.map((business) => {
        const tone = business.riskScore >= 80 ? "critical" : business.riskScore >= 60 ? "high" : business.riskScore >= 30 ? "medium" : "low";
        return (
          <Panel key={business.id}>
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-guard-teal" />
                      <h2 className="text-lg font-semibold text-white">{business.legalName}</h2>
                    </div>
                    <p className="mt-1 text-sm text-white/48">{business.tradingName} · {business.companyNumber} · {business.industry}</p>
                  </div>
                  <StatusPill tone={tone}>{Math.round(business.riskScore)}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                  <p>Incorporation: {business.incorporationCountry}</p>
                  <p>Regulatory status: {business.regulatoryStatus}</p>
                  <p>Declared turnover: {money.format(business.declaredTurnover)}</p>
                  <p>Expected volume: {money.format(business.expectedTransactionVolume)}</p>
                  <p>Countries: {business.countriesOfOperation.join(", ")}</p>
                  <p>Status: {business.kybStatus.replaceAll("_", " ")}</p>
                </div>
                <div className="mt-4 grid gap-2">
                  {business.indicators.map((indicator) => (
                    <p key={indicator} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-white/58">{indicator}</p>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <PartyList title="Directors" items={business.directors.map((item) => ({ label: item.name, meta: item.country, risk: item.risk }))} />
                  <PartyList title="Shareholders" items={business.shareholders.map((item) => ({ label: item.name, meta: `${item.ownershipPct}%`, risk: item.risk }))} />
                  <PartyList title="UBOs" items={business.ultimateBeneficialOwners.map((item) => ({ label: item.name, meta: `${item.ownershipPct}%`, risk: item.risk }))} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10" onClick={() => onRefresh(business.id)}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh KYB
                  </button>
                  <button className="flex h-9 items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs text-emerald-100 hover:bg-emerald-400/15" onClick={() => onScreen(business.id)}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Run test screening
                  </button>
                </div>
              </div>
              <OwnershipGraph graph={business.ownershipGraph} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function PartyList({ title, items }: { title: string; items: Array<{ label: string; meta: string; risk: "low" | "medium" | "high" | "critical" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="mb-2 text-xs uppercase tracking-[0.12em] text-white/35">{title}</p>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={`${title}-${item.label}`} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-white/65">{item.label}</span>
            <span className="text-white/35">{item.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { AmlScoreBreakdown } from "@/lib/aml-types";
import { MiniBar } from "./aml-ui";

const labels: Array<[keyof AmlScoreBreakdown, string]> = [
  ["deterministicRules", "Rules"],
  ["mlAnomaly", "ML anomaly"],
  ["behaviouralProfile", "Behaviour"],
  ["identityGraph", "Graph"],
  ["amlSanctions", "AML/sanctions"],
  ["customerKyc", "KYC"],
  ["businessKyb", "KYB"],
  ["transactionVelocity", "Velocity"],
  ["microtransactionCluster", "Micro cluster"],
  ["historicalOutcomes", "History"],
];

export function RiskScoreBreakdown({ scores }: { scores: AmlScoreBreakdown }) {
  return (
    <div className="grid gap-2">
      {labels.map(([key, label]) => {
        const value = Math.round(scores[key] ?? 0);
        const tone = value >= 80 ? "critical" : value >= 60 ? "high" : value >= 30 ? "medium" : "low";
        return (
          <div key={key} className="grid grid-cols-[96px_minmax(0,1fr)_34px] items-center gap-2 text-xs">
            <span className="truncate text-white/48">{label}</span>
            <MiniBar value={value} tone={tone} />
            <span className="text-right text-white/68">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, UserCheck } from "lucide-react";
import { AmlAlert } from "@/lib/aml-types";
import { money, Panel, StatusPill, timeAgo } from "./aml-ui";

export function AmlAlertsQueue({
  alerts,
  onAssign,
  onEscalate,
  onConvert,
  onCloseFalsePositive,
}: {
  alerts: AmlAlert[];
  onAssign: (id: string) => void;
  onEscalate: (id: string) => void;
  onConvert: (id: string) => void;
  onCloseFalsePositive: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {alerts.map((alert) => {
        const tone = alert.riskScores.unified >= 80 ? "critical" : alert.riskScores.unified >= 60 ? "high" : alert.riskScores.unified >= 30 ? "medium" : "low";
        return (
          <Panel key={alert.id}>
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/38">{alert.id} · {alert.category}</p>
                    <h2 className="mt-1 text-base font-semibold text-white">{alert.explanation}</h2>
                    <p className="mt-1 text-xs text-white/42">{alert.subjectType} {alert.subjectId} · {timeAgo(alert.createdAt)} ago · SLA {new Date(alert.serviceLevelDeadline).toLocaleString()}</p>
                  </div>
                  <StatusPill tone={tone}>{Math.round(alert.riskScores.unified)}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-4">
                  <p>Transactions: {alert.transactionCount}</p>
                  <p>Value: {money.format(alert.cumulativeAmount)}</p>
                  <p>Window: {alert.rollingWindow}</p>
                  <p>Status: {alert.status.replaceAll("_", " ")}</p>
                  <p>Analyst: {alert.assignedAnalyst ?? "Unassigned"}</p>
                  <p>Fraud: {Math.round(alert.riskScores.fraud)}</p>
                  <p>AML: {Math.round(alert.riskScores.aml)}</p>
                  <p>Cases: {alert.relatedCases.join(", ") || "None"}</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {alert.evidence.map((item) => (
                    <p key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-white/52">{item}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-medium text-white">Suggested action</p>
                <p className="mt-1 text-xs leading-5 text-white/52">{alert.suggestedAction}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/70" onClick={() => onAssign(alert.id)}>
                    <UserCheck className="h-3.5 w-3.5" />
                    Assign
                  </button>
                  <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-300/20 bg-amber-400/10 px-2 text-xs text-amber-100" onClick={() => onEscalate(alert.id)}>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Escalate
                  </button>
                  <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-guard-teal/25 bg-guard-teal/10 px-2 text-xs text-guard-teal" onClick={() => onConvert(alert.id)}>
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    Case
                  </button>
                  <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-2 text-xs text-emerald-100" onClick={() => onCloseFalsePositive(alert.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Close FP
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

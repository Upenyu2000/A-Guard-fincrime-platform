"use client";

import { ClipboardList, FilePlus2 } from "lucide-react";
import { AmlInvestigation } from "@/lib/aml-types";
import { Panel, StatusPill, timeAgo } from "./aml-ui";

export function AmlInvestigationWorkspace({
  investigations,
  onCreateSar,
}: {
  investigations: AmlInvestigation[];
  onCreateSar: (caseId: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {investigations.map((investigation) => (
        <Panel key={investigation.id}>
          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-guard-teal" />
                    <h2 className="text-lg font-semibold text-white">{investigation.id}</h2>
                  </div>
                  <p className="mt-1 text-sm text-white/52">{investigation.hypothesis}</p>
                  <p className="mt-1 text-xs text-white/38">Owner: {investigation.owner} · Status: {investigation.status.replaceAll("_", " ")}</p>
                </div>
                <StatusPill tone={investigation.priority}>{investigation.priority}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                <p>Alert: {investigation.alertId}</p>
                <p>Transactions: {investigation.linkedTransactions.join(", ")}</p>
                <p>Linked entities: {investigation.linkedEntities.join(", ")}</p>
                <p>Recommended: {investigation.recommendedAction}</p>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-white">Source of funds</p>
                  <p className="mt-1 text-xs leading-5 text-white/52">{investigation.sourceOfFundsAnalysis}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-white">Source of wealth</p>
                  <p className="mt-1 text-xs leading-5 text-white/52">{investigation.sourceOfWealthAnalysis}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {investigation.findings.map((finding) => (
                  <p key={finding} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-white/55">{finding}</p>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-white/35">Timeline</p>
                <div className="grid gap-2">
                  {investigation.timeline.map((item) => (
                    <div key={`${investigation.id}-${item.at}-${item.action}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
                      <p className="text-xs font-medium text-white">{item.action}</p>
                      <p className="mt-1 text-[11px] text-white/38">{item.actor} · {timeAgo(item.at)} ago</p>
                      <p className="mt-1 text-xs leading-5 text-white/50">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-white/35">Evidence export set</p>
                <div className="grid gap-2">
                  {investigation.evidence.map((evidence) => (
                    <p key={evidence.id} className="text-xs text-white/55">{evidence.label} · {Math.round(evidence.confidence)}%</p>
                  ))}
                </div>
                <button className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 text-xs text-fuchsia-100" onClick={() => onCreateSar(investigation.id)}>
                  <FilePlus2 className="h-3.5 w-3.5" />
                  Prepare SAR draft
                </button>
              </div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

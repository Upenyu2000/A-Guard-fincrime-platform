"use client";

import { ShieldQuestion } from "lucide-react";
import { BusinessKybProfile, CustomerKycProfile, ScreeningCheck } from "@/lib/aml-types";
import { Panel, StatusPill, timeAgo } from "./aml-ui";

export function ScreeningWorkspace({
  checks,
  customers,
  businesses,
  onRunCustomer,
  onRunBusiness,
}: {
  checks: ScreeningCheck[];
  customers: CustomerKycProfile[];
  businesses: BusinessKybProfile[];
  onRunCustomer: (id: string) => void;
  onRunBusiness: (id: string) => void;
}) {
  const firstCustomerId = customers[0]?.id;
  const firstBusinessId = businesses[0]?.id;

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Provider-independent screening</h2>
            <p className="mt-1 text-sm text-white/48">Results are labelled as live, test, mock, manual, unavailable, or not completed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {firstCustomerId ? <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70" onClick={() => onRunCustomer(firstCustomerId)}>Run customer test</button> : null}
            {firstBusinessId ? <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70" onClick={() => onRunBusiness(firstBusinessId)}>Run business test</button> : null}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {checks.map((check) => {
          const tone = check.disposition === "true_match" ? "critical" : check.disposition === "possible_match" || check.disposition === "needs_review" ? "high" : check.disposition === "false_positive" ? "medium" : "low";
          return (
            <Panel key={check.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldQuestion className="h-4 w-4 text-guard-teal" />
                    <h3 className="font-semibold text-white">{check.checkType.replaceAll("_", " ")}</h3>
                  </div>
                  <p className="mt-1 text-xs text-white/42">{check.subjectType} · {check.subjectId} · {check.provider}</p>
                </div>
                <StatusPill tone={tone}>{check.disposition.replaceAll("_", " ")}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                <p>Dataset: {check.datasetVersion}</p>
                <p>Result: {check.resultStatus.replaceAll("_", " ")}</p>
                <p>Match score: {Math.round(check.matchScore)}</p>
                <p>Checked: {timeAgo(check.checkedAt)} ago</p>
                <p>Fields: {check.matchingFields.join(", ") || "None"}</p>
                <p>Reviewer: {check.reviewer ?? "Unassigned"}</p>
              </div>
              <div className="mt-3 grid gap-2">
                {check.evidence.map((item) => (
                  <p key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-white/52">{item}</p>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

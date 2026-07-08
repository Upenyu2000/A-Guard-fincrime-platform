"use client";

import { FlaskConical, GitBranch, Plus, ShieldCheck, ToggleRight } from "lucide-react";
import { AmlRule } from "@/lib/aml-types";
import { Panel, StatusPill } from "./aml-ui";

export function RuleBuilder({
  rules,
  onCreate,
  onBacktest,
  onApprove,
  onActivate,
}: {
  rules: AmlRule[];
  onCreate: () => void;
  onBacktest: (id: string) => void;
  onApprove: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Rules and scenarios</h2>
            <p className="mt-1 text-sm text-white/48">Draft, test, approve, and activate versioned AML scenarios with four-eyes controls.</p>
          </div>
          <button className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-guard-violet to-guard-purple px-3 text-xs font-medium text-white shadow-glow" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" />
            New draft
          </button>
        </div>
      </Panel>

      <div className="grid gap-3">
        {rules.map((rule) => (
          <Panel key={rule.id}>
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/38">{rule.id} · v{rule.version} · {rule.category}</p>
                    <h3 className="mt-1 text-base font-semibold text-white">{rule.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/52">{rule.description}</p>
                  </div>
                  <StatusPill tone={rule.priority}>{rule.priority}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-white/55 md:grid-cols-4">
                  <p>Window: {rule.rollingWindow}</p>
                  <p>Count: {rule.countThreshold}</p>
                  <p>Cumulative: {rule.cumulativeThreshold}</p>
                  <p>Contribution: {rule.scoreContribution}</p>
                  <p>Action: {rule.action.replaceAll("_", " ")}</p>
                  <p>Owner: {rule.owner}</p>
                  <p>Approval: {rule.approvalStatus.replaceAll("_", " ")}</p>
                  <p>Production: {rule.productionStatus.replaceAll("_", " ")}</p>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-white/35">Performance</p>
                <div className="mt-3 grid gap-2 text-xs text-white/58">
                  <p>Estimated alerts: {rule.estimatedAlertVolume}</p>
                  <p>Estimated false-positive rate: {rule.estimatedFalsePositiveRate.toFixed(1)}%</p>
                  <p>True-positive rate: {rule.performance.truePositiveRate.toFixed(1)}%</p>
                  <p>Last backtest: {new Date(rule.performance.lastBacktestedAt).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/70" onClick={() => onBacktest(rule.id)}>
                    <FlaskConical className="h-3.5 w-3.5" />
                    Backtest
                  </button>
                  <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-2 text-xs text-emerald-100" onClick={() => onApprove(rule.id)}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-lg border border-guard-teal/25 bg-guard-teal/10 px-2 text-xs text-guard-teal" onClick={() => onActivate(rule.id)}>
                    <ToggleRight className="h-3.5 w-3.5" />
                    Activate
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <div className="flex items-start gap-3 text-sm text-white/60">
          <GitBranch className="mt-0.5 h-4 w-4 text-guard-teal" />
          <p>Rule administrators can create and test draft rules, but activation is routed through a compliance-officer role in the API so rule authors cannot activate their own controls without secondary review.</p>
        </div>
      </Panel>
    </div>
  );
}

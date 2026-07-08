"use client";

import { Activity, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { AmlOverview as AmlOverviewData, AmlOverviewMetric } from "@/lib/aml-types";
import { compact, money, Panel, SimpleBars, StatusPill } from "./aml-ui";

function formatMetric(metric: AmlOverviewMetric) {
  if (metric.format === "currency") return money.format(metric.value);
  if (metric.format === "percent") return `${metric.value.toFixed(1)}%`;
  if (metric.format === "minutes") return `${Math.round(metric.value)}m`;
  return compact.format(metric.value);
}

const metricIcons = [Activity, ShieldAlert, CheckCircle2, Clock];

export function AmlOverview({ overview }: { overview: AmlOverviewData }) {
  const charts = [
    ["Alert volume", overview.alertVolumeOverTime],
    ["Risk distribution", overview.riskDistribution],
    ["Value by risk", overview.transactionValueByRisk],
    ["Micro clusters", overview.microtransactionClustersOverTime],
    ["Fan-in activity", overview.fanInActivity],
    ["Fan-out activity", overview.fanOutActivity],
    ["Rule triggers", overview.ruleTriggerFrequency],
    ["Investigation load", overview.investigationWorkload],
  ] as const;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overview.metrics.map((metric, index) => {
          const Icon = metricIcons[index % metricIcons.length] ?? Activity;
          return (
            <Panel key={metric.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-white/45">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatMetric(metric)}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              {metric.risk ? <div className="mt-3"><StatusPill tone={metric.risk}>{metric.risk}</StatusPill></div> : null}
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {charts.map(([title, data]) => (
          <Panel key={title}>
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            <SimpleBars data={data} />
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <h3 className="mb-3 text-sm font-semibold text-white">Highest-risk payment corridors</h3>
          <div className="grid gap-2">
            {overview.highestRiskPaymentCorridors.map((corridor) => (
              <div key={corridor} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/68">{corridor}</div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h3 className="mb-3 text-sm font-semibold text-white">Most triggered scenarios</h3>
          <div className="grid gap-2">
            {overview.mostTriggeredScenarios.map((scenario) => (
              <div key={scenario} className="rounded-lg border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">{scenario}</div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h3 className="mb-3 text-sm font-semibold text-white">Provider status</h3>
          <div className="grid gap-2">
            {overview.providerStatuses.map((provider) => (
              <div key={provider.provider} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-white">{provider.provider}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">{provider.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/48">{provider.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

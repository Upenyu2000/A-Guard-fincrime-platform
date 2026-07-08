"use client";

import { Network, TimerReset } from "lucide-react";
import { AmlOverview, MicrotransactionCluster } from "@/lib/aml-types";
import { compact, money, Panel, SimpleBars, StatusPill, timeAgo } from "./aml-ui";
import { TransactionNetworkGraph } from "./TransactionNetworkGraph";
import { GraphEdge, GraphNode } from "@/lib/types";

export function MicrotransactionIntelligence({
  clusters,
  overview,
  graph,
}: {
  clusters: MicrotransactionCluster[];
  overview: AmlOverview;
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Panel><p className="text-xs text-white/45">Clusters</p><p className="mt-2 text-2xl font-semibold text-white">{clusters.length}</p></Panel>
        <Panel><p className="text-xs text-white/45">Cluster value</p><p className="mt-2 text-2xl font-semibold text-white">{money.format(clusters.reduce((sum, item) => sum + item.cumulativeAmount, 0))}</p></Panel>
        <Panel><p className="text-xs text-white/45">Linked devices</p><p className="mt-2 text-2xl font-semibold text-white">{new Set(clusters.flatMap((item) => item.deviceIds)).size}</p></Panel>
        <Panel><p className="text-xs text-white/45">Scenario coverage</p><p className="mt-2 text-2xl font-semibold text-white">{overview.scenarioCoverage.length}</p></Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Panel>
          <h2 className="mb-3 text-lg font-semibold text-white">Suspicious microtransaction clusters</h2>
          <div className="grid gap-3">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-guard-teal" />
                      <p className="font-medium text-white">{cluster.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-white/42">{cluster.scenario} · {cluster.rollingWindow} · first seen {timeAgo(cluster.firstSeenAt)} ago</p>
                  </div>
                  <StatusPill tone={cluster.riskLevel}>{Math.round(cluster.riskScore)}</StatusPill>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/58 sm:grid-cols-4">
                  <p>{cluster.transactionCount} transactions</p>
                  <p>{money.format(cluster.cumulativeAmount)}</p>
                  <p>{compact.format(cluster.customerIds.length)} customers</p>
                  <p>{cluster.thresholdAvoidancePct.toFixed(1)}% below threshold</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {cluster.evidence.map((item) => (
                    <p key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-white/55">{item}</p>
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-amber-100"><TimerReset className="h-3.5 w-3.5" />{cluster.recommendedAction}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid gap-4">
          <Panel>
            <h3 className="mb-3 text-sm font-semibold text-white">Scenario coverage</h3>
            <div className="grid gap-2">
              {overview.scenarioCoverage.map((scenario) => (
                <div key={scenario} className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">{scenario}</div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-sm font-semibold text-white">Cluster trend</h3>
            <SimpleBars data={overview.microtransactionClustersOverTime} />
          </Panel>
        </div>
      </div>
      <Panel>
        <TransactionNetworkGraph graph={graph} />
      </Panel>
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, Loader2, Play, X } from "lucide-react";
import { AmlTransactionDetail } from "@/lib/aml-types";
import { EmptyState, money, Panel, StatusPill, timeAgo } from "./aml-ui";
import { RiskScoreBreakdown } from "./RiskScoreBreakdown";
import { TransactionNetworkGraph } from "./TransactionNetworkGraph";

export function TransactionDetailDrawer({
  detail,
  loading,
  onClose,
  onEvaluate,
}: {
  detail?: AmlTransactionDetail;
  loading: boolean;
  onClose: () => void;
  onEvaluate: () => void;
}) {
  if (!detail && !loading) return null;
  const transaction = detail?.transaction;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/52 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Transaction details">
      <div className="thin-scrollbar h-full w-full max-w-3xl overflow-y-auto border-l border-white/12 bg-[#080812] p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/38">Transaction evidence</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{transaction?.id ?? "Loading transaction"}</h2>
            {transaction ? <p className="mt-1 text-sm text-white/48">{transaction.description}</p> : null}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10" onClick={onClose} aria-label="Close transaction details">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !detail || !transaction ? (
          <Panel className="grid min-h-[220px] place-items-center">
            <div className="flex items-center gap-2 text-sm text-white/58">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading full risk evidence
            </div>
          </Panel>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Panel>
                <p className="text-xs text-white/45">Unified score</p>
                <p className="mt-2 text-3xl font-semibold text-white">{Math.round(transaction.unifiedRisk)}</p>
                <StatusPill tone={transaction.unifiedRisk >= 80 ? "critical" : transaction.unifiedRisk >= 60 ? "high" : transaction.unifiedRisk >= 30 ? "medium" : "low"}>{transaction.decision.replaceAll("_", " ")}</StatusPill>
              </Panel>
              <Panel>
                <p className="text-xs text-white/45">Amount</p>
                <p className="mt-2 text-2xl font-semibold text-white">{money.format(transaction.baseCurrencyEquivalent)}</p>
                <p className="mt-1 text-xs text-white/42">{transaction.originCountry} to {transaction.destinationCountry}</p>
              </Panel>
              <Panel>
                <p className="text-xs text-white/45">KYC/KYB</p>
                <p className="mt-2 text-sm font-medium text-white">{detail.customer?.kycStatus.replaceAll("_", " ") ?? "No customer profile"}</p>
                <p className="mt-1 text-xs text-white/42">{detail.business?.kybStatus.replaceAll("_", " ") ?? "No business profile"}</p>
              </Panel>
              <Panel>
                <p className="text-xs text-white/45">Alert status</p>
                <p className="mt-2 text-sm font-medium capitalize text-white">{transaction.alertStatus.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-white/42">{timeAgo(transaction.timestamp)} ago</p>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
              <Panel>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">Component score breakdown</h3>
                  <button className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-guard-violet to-guard-purple px-3 text-xs font-medium text-white shadow-glow" onClick={onEvaluate}>
                    <Play className="h-3.5 w-3.5" />
                    Evaluate demo
                  </button>
                </div>
                <RiskScoreBreakdown scores={transaction.componentScores} />
              </Panel>
              <Panel>
                <h3 className="mb-3 text-sm font-semibold text-white">Recommended action</h3>
                <p className="text-sm leading-6 text-white/68">{transaction.recommendedAction}</p>
                <div className="mt-4 grid gap-2">
                  {transaction.rulesTriggered.map((rule) => (
                    <div key={rule} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/68">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                      {rule}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel>
              <h3 className="mb-3 text-sm font-semibold text-white">Explainability</h3>
              <div className="grid gap-2">
                {transaction.explainability.map((factor) => (
                  <div key={`${factor.feature}-${factor.evidence}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{factor.feature}</p>
                      <span className={factor.direction === "risk_decrease" ? "text-xs text-emerald-200" : "text-xs text-rose-200"}>{factor.impact > 0 ? "+" : ""}{factor.impact}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/52">{factor.evidence}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {transaction.researchSignals && transaction.researchSignals.length > 0 ? (
              <Panel>
                <h3 className="mb-3 text-sm font-semibold text-white">Research-derived signals</h3>
                <div className="grid gap-2">
                  {transaction.researchSignals.map((signal) => (
                    <div key={signal.id} className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">{signal.name}</p>
                          <p className="mt-1 text-xs text-white/42">{signal.paper}</p>
                        </div>
                        <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white/70">
                          {signal.score} - {signal.governanceStatus.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1">
                        {signal.evidence.map((item) => (
                          <p key={item} className="text-xs leading-5 text-cyan-50/62">{item}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <h3 className="mb-3 text-sm font-semibold text-white">Rolling windows</h3>
                <div className="grid gap-2">
                  {detail.rollingWindows.map((window) => (
                    <div key={window.window} className="grid grid-cols-[52px_1fr_1fr] gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs">
                      <span className="font-medium text-white">{window.window}</span>
                      <span className="text-white/58">{window.transactionCount} tx</span>
                      <span className="text-right text-white/58">{money.format(window.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel>
                <h3 className="mb-3 text-sm font-semibold text-white">Linked evidence</h3>
                <div className="grid gap-2 text-xs text-white/58">
                  <p>Devices: {transaction.linkedDevices.join(", ") || transaction.deviceId}</p>
                  <p>IP addresses: {transaction.linkedIpAddresses.join(", ") || transaction.ipAddress}</p>
                  <p>Accounts: {transaction.linkedAccounts.join(", ") || transaction.accountId}</p>
                  <p>Beneficiaries: {transaction.sharedBeneficiaries.join(", ") || transaction.beneficiary}</p>
                  <p>Historical alerts: {transaction.historicalAlerts.join(", ") || "None"}</p>
                </div>
              </Panel>
            </div>

            {detail.relatedAlerts.length > 0 ? (
              <Panel>
                <h3 className="mb-3 text-sm font-semibold text-white">Related alerts and investigations</h3>
                <div className="grid gap-2">
                  {detail.relatedAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs">
                      <span className="text-white/70">{alert.id} - {alert.category}</span>
                      <span className="capitalize text-white/45">{alert.status.replaceAll("_", " ")}</span>
                    </div>
                  ))}
                  {detail.relatedInvestigations.map((investigation) => (
                    <div key={investigation.id} className="flex items-center justify-between rounded-lg border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs">
                      <span className="text-emerald-100">{investigation.id} - {investigation.hypothesis}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                    </div>
                  ))}
                </div>
              </Panel>
            ) : (
              <EmptyState title="No linked investigations" detail="This transaction has not yet been converted into a case." />
            )}

            <Panel>
              <TransactionNetworkGraph graph={detail.graph} />
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { RefreshCcw, ShieldCheck } from "lucide-react";
import { CustomerKycProfile } from "@/lib/aml-types";
import { money, Panel, StatusPill } from "./aml-ui";

export function CustomerKycWorkspace({
  customers,
  onRefresh,
  onScreen,
}: {
  customers: CustomerKycProfile[];
  onRefresh: (id: string) => void;
  onScreen: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {customers.map((customer) => {
        const tone = customer.customerRiskScore >= 80 ? "critical" : customer.customerRiskScore >= 60 ? "high" : customer.customerRiskScore >= 30 ? "medium" : "low";
        return (
          <Panel key={customer.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/38">{customer.id}</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{customer.fullLegalName}</h2>
                <p className="mt-1 text-sm text-white/48">{customer.occupation} · {customer.countryOfResidence} · {customer.expectedAccountPurpose}</p>
              </div>
              <StatusPill tone={tone}>{Math.round(customer.customerRiskScore)}</StatusPill>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
              <p>Source of funds: {customer.sourceOfFunds}</p>
              <p>Source of wealth: {customer.sourceOfWealth}</p>
              <p>Expected income: {money.format(customer.expectedMonthlyIncome)}</p>
              <p>Expected volume: {money.format(customer.expectedTransactionVolume)}</p>
              <p>Corridors: {customer.expectedPaymentCorridors.join(", ")}</p>
              <p>Status: {customer.kycStatus.replaceAll("_", " ")}</p>
              <p>Last review: {new Date(customer.lastReviewDate).toLocaleDateString()}</p>
              <p>Next review: {new Date(customer.nextReviewDate).toLocaleDateString()}</p>
            </div>
            <div className="mt-4 grid gap-2">
              {customer.checks.map((check) => (
                <div key={check.name} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{check.name}</p>
                    <StatusPill tone={check.risk}>{check.status.replaceAll("_", " ")}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-white/48">{check.evidence}</p>
                </div>
              ))}
            </div>
            {customer.edd.required ? (
              <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3">
                <p className="text-sm font-medium text-amber-100">Enhanced due diligence required</p>
                <p className="mt-1 text-xs leading-5 text-amber-100/70">Senior approval: {customer.edd.seniorApproval}. Monitoring: {customer.edd.monitoringFrequency}. Documents: {customer.edd.supportingDocuments.join(", ")}.</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10" onClick={() => onRefresh(customer.id)}>
                <RefreshCcw className="h-3.5 w-3.5" />
                Refresh KYC
              </button>
              <button className="flex h-9 items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs text-emerald-100 hover:bg-emerald-400/15" onClick={() => onScreen(customer.id)}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Run test screening
              </button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

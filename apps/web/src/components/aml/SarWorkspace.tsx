"use client";

import { LockKeyhole, ShieldCheck } from "lucide-react";
import { SarDraft } from "@/lib/aml-types";
import { money, Panel, StatusPill, timeAgo } from "./aml-ui";

export function SarWorkspace({
  drafts,
  onApprove,
}: {
  drafts: SarDraft[];
  onApprove: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex items-start gap-3 text-sm text-white/60">
          <LockKeyhole className="mt-0.5 h-4 w-4 text-amber-200" />
          <p>SAR narratives are draft-only until an authorised MLRO-equivalent role approves them. The workspace blocks automatic submission, customer-facing disclosure, and unversioned post-approval edits.</p>
        </div>
      </Panel>
      {drafts.map((draft) => {
        const tone = draft.mlroReviewStatus === "approved" ? "low" : draft.mlroReviewStatus === "ready_for_review" ? "high" : "medium";
        return (
          <Panel key={draft.id}>
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/38">{draft.id} · case {draft.caseId} · v{draft.version}</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">SAR draft awaiting authorised review</h2>
                    <p className="mt-1 text-xs text-white/42">Created {timeAgo(draft.createdAt)} ago by {draft.investigator}</p>
                  </div>
                  <StatusPill tone={tone}>{draft.mlroReviewStatus.replaceAll("_", " ")}</StatusPill>
                </div>
                <div className="mt-4 rounded-lg border border-fuchsia-300/15 bg-fuchsia-400/10 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-fuchsia-100/70">Decision Intelligence draft requiring human validation</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{draft.narrative}</p>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                  <p>Total suspicious value: {money.format(draft.totalSuspiciousValue)}</p>
                  <p>Corridors: {draft.paymentCorridors.join(", ")}</p>
                  <p>Subjects: {draft.subjectIds.join(", ")}</p>
                  <p>Businesses: {draft.businessIds.join(", ") || "None"}</p>
                  <p>Accounts: {draft.accountIds.join(", ")}</p>
                  <p>Wallets: {draft.walletIds.join(", ")}</p>
                </div>
                <div className="mt-4 grid gap-2">
                  {draft.suspicionIndicators.map((indicator) => (
                    <p key={indicator} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-white/55">{indicator}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-medium text-white">Controls</p>
                <div className="mt-3 grid gap-2">
                  {draft.tippingOffControls.map((control) => (
                    <p key={control} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-white/52">{control}</p>
                  ))}
                </div>
                <button className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs text-emerald-100 disabled:opacity-45" onClick={() => onApprove(draft.id)} disabled={draft.mlroReviewStatus === "approved"}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  MLRO approve
                </button>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Code2,
  Database,
  FileSearch,
  GitBranch,
  KeyRound,
  Landmark,
  Network,
  PlugZap,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { ingestDemoTransaction, runLawfulOsintSearch, testIntegration } from "@/lib/api";
import { IntegrationStatus, OperatingPicture, RiskLevel } from "@/lib/types";

const statusClass: Record<IntegrationStatus, string> = {
  connected: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  testing: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
  degraded: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  failed: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  paused: "border-white/15 bg-white/[0.04] text-white/60",
  draft: "border-white/15 bg-white/[0.04] text-white/60",
};

const riskClass: Record<RiskLevel, string> = {
  low: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  medium: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  high: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  critical: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100",
};

const views = [
  "Integrations",
  "Transactions",
  "OSINT",
  "Evidence",
  "Developer",
  "Compliance",
  "Audit",
] as const;

export function EnterprisePlatformPanel({ picture }: { picture: OperatingPicture }) {
  const enterprise = picture.enterprise;
  const queryClient = useQueryClient();
  const [view, setView] = useState<(typeof views)[number]>("Integrations");
  const firstIntegration = enterprise.integrations[0];
  const testConnection = useMutation({
    mutationFn: (id: string) => testIntegration(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["operating-picture"] }),
  });
  const ingestTransaction = useMutation({
    mutationFn: (id: string) => ingestDemoTransaction(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["operating-picture"] }),
  });
  const osintSearch = useMutation({
    mutationFn: runLawfulOsintSearch,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["operating-picture"] }),
  });

  return (
    <section className="glass w-[calc(100vw-2rem)] max-w-full overflow-hidden rounded-lg p-4 sm:w-full">
      <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <Header icon={PlugZap} eyebrow="Bank and payment network integration" title="Secure connections, ingestion, investigation, and governance" />
        <div className="flex flex-wrap gap-2">
          {views.map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                view === item
                  ? "border-fuchsia-300/35 bg-fuchsia-400/12 text-fuchsia-50"
                  : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <Metric label="Tenants" value={String(enterprise.tenants.length)} detail="MFA and tenant isolation enforced" />
        <Metric label="Integrations" value={String(enterprise.integrations.length)} detail={`${enterprise.adapters.length} adapter types`} />
        <Metric label="24h volume" value={enterprise.integrations.reduce((sum, item) => sum + item.dataVolume24h, 0).toLocaleString()} detail="transactions/events" />
        <Metric label="API keys" value={String(enterprise.apiKeys.length)} detail="fingerprints only, no raw key storage" />
      </div>

      <div className="mt-4">
        {view === "Integrations" ? (
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.64fr)_minmax(360px,0.36fr)]">
            <Panel title="Bank connections dashboard" icon={Landmark}>
              <div className="space-y-3">
                {enterprise.integrations.map((integration) => (
                  <div key={integration.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{integration.name}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {integration.organisationName} / {integration.type.replaceAll("_", " ")} / {integration.environment}
                        </p>
                      </div>
                      <span className={`w-fit rounded-md border px-2 py-1 text-xs capitalize ${statusClass[integration.status]}`}>
                        {integration.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Mini label="Last sync" value={integration.lastSyncAt ? "recent" : "not started"} />
                      <Mini label="Volume 24h" value={integration.dataVolume24h.toLocaleString()} />
                      <Mini label="Errors" value={String(integration.errors.length)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {integration.authMethods.map((method) => (
                        <span key={method} className="rounded-md border border-white/10 bg-black/18 px-2 py-1 text-xs text-white/55">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Connection setup" icon={KeyRound}>
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-[#0b0c19]/72 p-3">
                  <p className="text-sm font-medium text-white">Secure credential intake</p>
                  <p className="mt-1 text-xs leading-5 text-white/50">
                    Credentials are encrypted into vault references. The UI stores fingerprints, scopes, consent IDs, mTLS fingerprints, and webhook signing refs only.
                  </p>
                </div>
                <div className="grid gap-2">
                  {firstIntegration ? (
                    <>
                      <button
                        onClick={() => testConnection.mutate(firstIntegration.id)}
                        disabled={testConnection.isPending}
                        className="rounded-md border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 disabled:opacity-60"
                      >
                        {testConnection.isPending ? "Testing connection" : "Test selected connection"}
                      </button>
                      <button
                        onClick={() => ingestTransaction.mutate(firstIntegration.id)}
                        disabled={ingestTransaction.isPending}
                        className="rounded-md bg-gradient-to-r from-guard-violet to-guard-purple px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {ingestTransaction.isPending ? "Ingesting" : "Ingest sandbox transaction"}
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/36">Field mapping</p>
                  {firstIntegration?.fieldMappings.slice(0, 3).map((mapping) => (
                    <p key={`${mapping.sourceField}-${mapping.targetField}`} className="mt-2 text-xs text-white/58">
                      {mapping.sourceField} &rarr; {mapping.targetField}
                    </p>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        ) : null}

        {view === "Transactions" ? (
          <Panel title="Transaction monitoring dashboard" icon={UploadCloud}>
            <div className="grid gap-3 xl:grid-cols-3">
              {enterprise.transactions.map((txn) => (
                <div key={txn.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{txn.id}</p>
                      <p className="mt-1 text-xs text-white/42">{txn.rail} / {txn.status}</p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-xs ${riskClass[txn.riskLevel]}`}>{txn.riskScore}</span>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-white">{txn.currency} {txn.amount.toLocaleString()}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {txn.reasons.slice(0, 3).map((reason) => (
                      <span key={reason} className="rounded-md border border-white/10 bg-black/18 px-2 py-1 text-xs text-white/55">{reason}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {view === "OSINT" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.58fr)_minmax(360px,0.42fr)]">
            <Panel title="Lawful OSINT and identity search" icon={FileSearch}>
              <p className="text-sm leading-6 text-white/60">
                Searches require case reference, lawful basis, permission level, purpose, approved data sources, and a full audit trail. Private, restricted, password-protected, paywalled, or platform-prohibited content is excluded.
              </p>
              <button
                onClick={() => osintSearch.mutate()}
                disabled={osintSearch.isPending}
                className="mt-3 rounded-md bg-gradient-to-r from-guard-violet to-guard-purple px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                {osintSearch.isPending ? "Searching approved sources" : "Run lawful sandbox search"}
              </button>
              <div className="mt-3 space-y-2">
                {enterprise.osint[0]?.safeguards.map((item) => (
                  <p key={item} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1.5 text-xs leading-5 text-white/58">{item}</p>
                ))}
              </div>
            </Panel>
            <Panel title="Identity match results" icon={Network}>
              <div className="space-y-3">
                {enterprise.osint[0]?.matches.map((match) => (
                  <div key={match.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-white">{match.label}</p>
                      <span className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">{match.quality.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/55">{match.summary}</p>
                    <p className="mt-2 text-xs text-white/40">Confidence {match.confidence}% / source {match.source}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {view === "Evidence" ? (
          <Panel title="Evidence graph and chain of custody" icon={GitBranch}>
            <div className="grid gap-3 xl:grid-cols-2">
              {enterprise.evidence.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/45">{item.type} / {item.quality.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-xs text-white/55">{item.hash}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.chainOfCustody.map((step) => (
                      <span key={step} className="rounded-md border border-white/10 bg-black/18 px-2 py-1 text-xs text-white/52">{step}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {view === "Developer" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Developer portal" icon={Code2}>
              <p className="text-sm text-white/60">OpenAPI: {enterprise.developerPortal.openApiUrl}</p>
              <code className="mt-3 block rounded-md border border-white/10 bg-black/24 p-3 text-xs leading-5 text-fuchsia-100">
                {enterprise.developerPortal.sampleRequest}
              </code>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {enterprise.developerPortal.webhookEvents.map((event) => (
                  <span key={event} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-white/55">{event}</span>
                ))}
              </div>
            </Panel>
            <Panel title="API key management" icon={KeyRound}>
              {enterprise.apiKeys.map((key) => (
                <div key={key.id} className="mb-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-white">{key.name}</p>
                  <p className="mt-1 text-xs text-white/45">{key.prefix}... / {key.status}</p>
                  <p className="mt-2 text-xs text-white/55">{key.fingerprint}</p>
                </div>
              ))}
            </Panel>
          </div>
        ) : null}

        {view === "Compliance" ? (
          <Panel title="Compliance and data governance" icon={ShieldCheck}>
            <div className="grid gap-3 xl:grid-cols-2">
              {enterprise.governance.controls.map((control) => (
                <div key={control.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-200" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-white">{control.framework}: {control.title}</p>
                      <p className="mt-1 text-xs text-white/45">{control.status.replaceAll("_", " ")} / owner {control.owner}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {view === "Audit" ? (
          <Panel title="Audit logs and access governance" icon={Database}>
            <div className="grid gap-3 xl:grid-cols-2">
              {picture.audit.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-white">{event.action}</p>
                  <p className="mt-1 text-xs text-white/45">{event.actor} / {event.role} / {event.target}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

function Header({ icon: Icon, eyebrow, title }: { icon: typeof PlugZap; eyebrow: string; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
        <Icon className="h-5 w-5 text-fuchsia-200" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof PlugZap; children: ReactNode }) {
  return (
    <div className="panel min-w-0 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
          <Icon className="h-4 w-4 text-fuchsia-200" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/38">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/50">{detail}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BookOpenCheck,
  Bot,
  Building2,
  CheckCircle2,
  CirclePlay,
  Gauge,
  GraduationCap,
  Network,
  Radar,
  ReceiptText,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";
import { approveAgentAction, runAgent, runAgentOpsCycle, setAgentAutonomy } from "@/lib/api";
import { AgentAutonomyMode, AgentCapability, AgentRunResult, OperatingPicture, RiskLevel } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const riskClass: Record<RiskLevel, string> = {
  low: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  medium: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  high: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  critical: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100",
};

const prompts = [
  "Identify merchants with a high concentration of shared users, and determine whether there are links between those merchants that could indicate collusion.",
  "In the last 60 days, identify merchants that have been dormant but are now experiencing a spike in session activity.",
  "Show the top 10 device IDs shared by users, map the geographic locations associated with those users, and identify any session-based risk signals.",
  "Perform an OSINT search on Velo Digital Goods and return any relevant findings.",
  "Review activity from the last 30 days and identify potential account takeover cases.",
  "Determine whether any disputes qualify for Visa Compelling Evidence 3.0. If the dispute qualifies, provide the relevant details for all three transactions.",
  "In the last 30 days, identify users who made low-value transactions at one merchant and then high-value transactions at another merchant.",
  "Suggest a rule for merchants that are under 90 days old, have no acquiring transactions, and are using a device that has been used by more than five accounts.",
  "Review the past several months of activity for selected email hashes, identify associated merchants, and determine whether common merchants indicate a fraud ring.",
];
const defaultPrompt = prompts[0]!;

export function AgenticOpsPanel({ picture }: { picture: OperatingPicture }) {
  const ops = picture.agenticOperations;
  const queryClient = useQueryClient();
  const [selectedPrompt, setSelectedPrompt] = useState(defaultPrompt);
  const [lastRun, setLastRun] = useState<AgentRunResult | null>(ops.recentRuns[0] ?? null);
  const mutation = useMutation({
    mutationFn: () => runAgent(selectedPrompt, undefined, "Velo Digital Goods"),
    onSuccess: (result) => {
      setLastRun(result);
      void queryClient.invalidateQueries({ queryKey: ["operating-picture"] });
    },
  });

  return (
    <section className="glass w-[calc(100vw-2rem)] max-w-full overflow-hidden rounded-lg p-4 sm:w-full">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Agentic risk operations</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            <span className="block sm:inline">Agents that clear queues,</span>{" "}
            <span className="block sm:inline">find fraud rings,</span>{" "}
            <span className="block sm:inline">and train teams</span>
          </h2>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-guard-violet to-guard-purple px-4 text-sm font-medium text-white shadow-glow disabled:opacity-60 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          <span>{mutation.isPending ? "Running agent" : "Run selected prompt"}</span>
        </button>
      </div>

      <WorkforceImpact picture={picture} />
      <AgentOpsControlPanel picture={picture} onAgentRun={setLastRun} />

      <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,0.78fr)_minmax(420px,0.52fr)]">
        <div className="min-w-0 space-y-4">
          <AgentLauncher agents={ops.agents} selectedPrompt={selectedPrompt} onSelectPrompt={setSelectedPrompt} />
          <MerchantRisk picture={picture} />
          <DeviceAndAto picture={picture} />
        </div>
        <div className="min-w-0 space-y-4">
          <AgentRunCard run={lastRun ?? ops.recentRuns[0]} />
          <DisputesAndRules picture={picture} />
          <DemoAndTraining picture={picture} />
        </div>
      </div>
    </section>
  );
}

function WorkforceImpact({ picture }: { picture: OperatingPicture }) {
  const impact = picture.agenticOperations.workforceImpact;
  const cards = [
    { label: "Manual hours saved", value: impact.manualHoursSavedMonthly.toLocaleString(), detail: "monthly analyst hours", icon: Bot },
    { label: "Auto-resolved alerts", value: `${impact.alertsAutoResolvedPct}%`, detail: "low-risk queue clearance", icon: Workflow },
    { label: "Redeployable capacity", value: `${impact.estimatedFteRedeployable.toFixed(1)} FTE`, detail: "shift to higher-value work", icon: UsersRound },
    { label: "Cost avoidance", value: money.format(impact.monthlyCostAvoidance), detail: "monthly operations savings", icon: ShieldCheck },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-white/38">{card.label}</p>
              <p className="mt-2 truncate text-2xl font-semibold text-white">{card.value}</p>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
              <card.icon className="h-5 w-5 text-fuchsia-200" aria-hidden />
            </div>
          </div>
          <p className="mt-2 text-sm text-white/50">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}

function AgentOpsControlPanel({
  picture,
  onAgentRun,
}: {
  picture: OperatingPicture;
  onAgentRun: (run: AgentRunResult) => void;
}) {
  const queryClient = useQueryClient();
  const controlPlane = picture.agenticOperations.controlPlane;
  const readiness = picture.agenticOperations.deploymentReadiness;
  const nextApproval = controlPlane.actionQueue.find((action) => action.status === "requires_approval");
  const runCycle = useMutation({
    mutationFn: runAgentOpsCycle,
    onSuccess: (result) => {
      onAgentRun(result.run);
      void queryClient.invalidateQueries({ queryKey: ["operating-picture"] });
    },
  });
  const approveAction = useMutation({
    mutationFn: (id: string) => approveAgentAction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operating-picture"] });
    },
  });
  const autonomy = useMutation({
    mutationFn: (mode: AgentAutonomyMode) => setAgentAutonomy(mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operating-picture"] });
    },
  });

  return (
    <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,0.62fr)_minmax(360px,0.38fr)]">
      <div className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
              <Gauge className="h-4 w-4 text-fuchsia-200" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">AgentOps control plane</p>
              <h3 className="text-base font-semibold text-white">Real-time defense cycles and governed autonomy</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["copilot", "monitored", "autonomous"] as AgentAutonomyMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => autonomy.mutate(mode)}
                disabled={autonomy.isPending}
                className={`rounded-md border px-2.5 py-1.5 text-xs capitalize transition ${
                  controlPlane.autonomyMode === mode
                    ? "border-fuchsia-300/35 bg-fuchsia-400/12 text-fuchsia-50"
                    : "border-white/10 bg-white/[0.035] text-white/52 hover:bg-white/[0.07]"
                }`}
              >
                {mode}
              </button>
            ))}
            <button
              onClick={() => runCycle.mutate()}
              disabled={runCycle.isPending}
              className="rounded-md bg-gradient-to-r from-guard-violet to-guard-purple px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {runCycle.isPending ? "Running" : "Run defense cycle"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <MiniMetric label="Signals / day" value={`${(controlPlane.telemetry.signalsMonitoredDaily / 1_000_000).toFixed(1)}M`} />
          <MiniMetric label="P95 latency" value={`${controlPlane.telemetry.p95LatencyMs}ms`} />
          <MiniMetric label="Precision" value={`${controlPlane.telemetry.agentPrecision.toFixed(1)}%`} />
          <MiniMetric label="Pending approvals" value={String(controlPlane.telemetry.humanApprovalsPending)} />
        </div>
        <div className="mt-3 grid gap-3 2xl:grid-cols-2">
          {controlPlane.emergingPatterns.slice(0, 2).map((pattern) => (
            <div key={pattern.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{pattern.name}</p>
                  <p className="mt-1 text-xs text-white/42">{pattern.impactEstimate}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs capitalize ${riskClass[pattern.severity]}`}>
                  {pattern.riskScore}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pattern.signals.slice(0, 4).map((signal) => (
                  <span key={signal} className="rounded-md border border-white/10 bg-black/18 px-2 py-1 text-xs text-white/52">
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-4">
        <Header icon={Activity} eyebrow="Deployment readiness" title="Launch gates and action approvals" />
        <div className="rounded-lg border border-white/10 bg-[#0b0c19]/72 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Readiness status</p>
            <span className={`rounded-md border px-2 py-1 text-xs uppercase ${
              readiness.status === "pass"
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                : readiness.status === "warn"
                  ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
                  : "border-rose-300/25 bg-rose-400/10 text-rose-100"
            }`}>
              {readiness.status}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {readiness.checks.slice(0, 3).map((check) => (
              <div key={check.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.035] p-2">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 ${check.status === "pass" ? "text-emerald-200" : "text-amber-200"}`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">{check.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {nextApproval ? (
          <div className="mt-3 rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/10 p-3">
            <p className="text-sm font-medium text-white">{nextApproval.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/55">{nextApproval.description}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/60">
                Risk {nextApproval.riskScore}
              </span>
              <button
                onClick={() => approveAction.mutate(nextApproval.id)}
                disabled={approveAction.isPending}
                className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100 disabled:opacity-60"
              >
                {approveAction.isPending ? "Approving" : "Approve action"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AgentLauncher({
  agents,
  selectedPrompt,
  onSelectPrompt,
}: {
  agents: AgentCapability[];
  selectedPrompt: string;
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="panel min-w-0 overflow-hidden p-4">
      <Header icon={Bot} eyebrow="Agent launcher" title="Natural-language fraud and AML workflows" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.65fr)_minmax(300px,0.35fr)]">
        <div className="grid gap-2 md:grid-cols-2">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{agent.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/50">{agent.description}</p>
                </div>
                <span className="w-fit rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-100">
                  {agent.automationRate}%
                </span>
              </div>
              <p className="mt-3 text-xs text-white/42">
                {agent.avgRuntimeSeconds}s avg / {agent.humanReviewRequired ? "human review" : "auto-clear eligible"}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0b0c19]/74 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-white/38">Prompt library</p>
          <div className="thin-scrollbar max-h-[310px] space-y-2 overflow-auto pr-1">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSelectPrompt(prompt)}
                className={`w-full rounded-lg border p-2 text-left text-xs leading-5 transition ${
                  selectedPrompt === prompt
                    ? "border-fuchsia-300/35 bg-fuchsia-400/12 text-fuchsia-50"
                    : "border-white/10 bg-white/[0.035] text-white/60 hover:bg-white/[0.07]"
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentRunCard({ run }: { run?: AgentRunResult }) {
  if (!run) return null;

  return (
    <div className="panel p-4">
      <Header icon={Radar} eyebrow="Agent output" title="Latest generated investigation" />
      <div className="rounded-lg border border-white/10 bg-[#0b0c19]/72 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.14em] text-white/35">{run.agentId}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-white">{run.summary}</p>
          </div>
          <span className="rounded-md border border-fuchsia-300/25 bg-fuchsia-400/10 px-2 py-1 text-xs text-fuchsia-100">
            {run.confidence}%
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {run.findings.slice(0, 4).map((finding) => (
            <p key={finding} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1.5 text-xs leading-5 text-white/62">
              {finding}
            </p>
          ))}
        </div>
        {run.executionPlan?.length ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/18 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/36">Execution plan</p>
            <div className="mt-2 space-y-2">
              {run.executionPlan.map((step) => (
                <div key={step.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-white/65">{step.name}</span>
                  <span className={`shrink-0 rounded-md border px-2 py-1 ${
                    step.status === "completed"
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-amber-300/20 bg-amber-400/10 text-amber-100"
                  }`}>
                    {step.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {run.policyDecision ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/36">Policy decision</p>
            <p className="mt-2 text-xs leading-5 text-white/60">{run.policyDecision.reason}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MerchantRisk({ picture }: { picture: OperatingPicture }) {
  return (
    <div className="panel p-4">
      <Header icon={Building2} eyebrow="Merchant monitoring" title="Collusion, dormant spikes, and account repurposing" />
      <div className="grid gap-3 xl:grid-cols-2">
        {picture.agenticOperations.merchantInsights.map((merchant) => (
          <div key={merchant.merchantId} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{merchant.merchantName}</p>
                <p className="mt-1 text-xs text-white/42">
                  {merchant.sharedUsers} shared users / {merchant.dormantDays} dormant days
                </p>
              </div>
              <span className={`rounded-md border px-2 py-1 text-xs capitalize ${riskClass[merchant.riskLevel]}`}>
                {merchant.collusionScore}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <MiniMetric label="Spike" value={`${merchant.sessionSpikePct}%`} />
              <MiniMetric label="Devices" value={String(merchant.deviceReuseCount)} />
              <MiniMetric label="Age" value={`${merchant.ageDays}d`} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {merchant.linkedMerchants.map((linked) => (
                <span key={linked} className="rounded-md border border-white/10 bg-black/18 px-2 py-1 text-xs text-white/50">
                  {linked}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceAndAto({ picture }: { picture: OperatingPicture }) {
  const topDevice = picture.agenticOperations.sharedDevices[0];
  const mapPoints = useMemo(() => topDevice?.locations ?? [], [topDevice]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="panel p-4">
        <Header icon={Network} eyebrow="Shared devices" title="Top reused fingerprints and session signals" />
        {topDevice ? (
          <div>
            <div className="grid-surface relative h-[220px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0c19]">
              {mapPoints.map((point) => (
                <div
                  key={`${point.city}-${point.country}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${Math.min(86, Math.max(14, ((point.lng + 18) / 70) * 100))}%`, top: `${Math.min(82, Math.max(14, ((36 - point.lat) / 72) * 100))}%` }}
                  title={`${point.city}: ${point.users} users`}
                >
                  <span className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400/20 blur-md" />
                  <span className="relative block h-3 w-3 rounded-full bg-fuchsia-300" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium text-white">{topDevice.deviceId}</p>
            <p className="mt-1 text-xs text-white/48">{topDevice.sharedUsers} linked users / risk {topDevice.riskScore}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {topDevice.sessionRiskSignals.map((signal) => (
                <span key={signal} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/55">
                  {signal}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="panel p-4">
        <Header icon={Route} eyebrow="ATO review" title="Last 30 days" />
        <div className="space-y-2">
          {picture.agenticOperations.accountTakeovers.map((item) => (
            <div key={item.accountId} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-white">{item.userId}</p>
                <span className="text-sm font-semibold text-rose-200">{item.riskScore}</span>
              </div>
              <p className="mt-1 text-xs text-white/42">{item.geographyShift}</p>
              <p className="mt-2 text-xs leading-5 text-white/60">{item.recommendedAction}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DisputesAndRules({ picture }: { picture: OperatingPicture }) {
  const dispute = picture.agenticOperations.disputes[0];
  const rule = picture.agenticOperations.suggestedRules[0];

  return (
    <div className="panel p-4">
      <Header icon={ReceiptText} eyebrow="Disputes and rules" title="CE 3.0 evidence and rule assistant" />
      {dispute ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{dispute.disputeId}</p>
              <p className="mt-1 text-xs text-white/42">
                {dispute.cardNetwork} / reason {dispute.reasonCode}
              </p>
            </div>
            <span className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-100">
              CE 3.0 {dispute.qualifiesForVisaCE30 ? "qualified" : "not qualified"}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/62">{dispute.evidenceSummary}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {dispute.compellingTransactions.map((txn) => (
              <div key={txn.id} className="rounded-md border border-white/10 bg-black/18 p-2">
                <p className="truncate text-xs text-white">{txn.id}</p>
                <p className="mt-1 text-xs text-white/45">{money.format(txn.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {rule ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-[#0b0c19]/74 p-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-fuchsia-200" aria-hidden />
            <p className="text-sm font-medium text-white">{rule.name}</p>
          </div>
          <code className="mt-3 block whitespace-pre-wrap rounded-md border border-white/10 bg-black/26 p-2 text-xs leading-5 text-fuchsia-100">
            {rule.logic}
          </code>
          <p className="mt-2 text-xs leading-5 text-white/52">{rule.backtestSummary}</p>
        </div>
      ) : null}
    </div>
  );
}

function DemoAndTraining({ picture }: { picture: OperatingPicture }) {
  const ops = picture.agenticOperations;
  const [activeChapterId, setActiveChapterId] = useState(ops.demoVideo.chapters[0]?.id);
  const activeChapter = ops.demoVideo.chapters.find((chapter) => chapter.id === activeChapterId) ?? ops.demoVideo.chapters[0];

  return (
    <div className="panel p-4">
      <Header icon={GraduationCap} eyebrow="Enablement" title="Demo video, guided learning, and facilitated training" />
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0b0c19]">
        <div className="relative aspect-video bg-black">
          <video
            className="h-full w-full object-cover"
            controls
            preload="metadata"
            poster={ops.demoVideo.poster}
            aria-label={ops.demoVideo.title}
          >
            <source src={ops.demoVideo.src} type="video/mp4" />
          </video>
          <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/10 bg-black/48 p-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <CirclePlay className="h-4 w-4 text-fuchsia-200" aria-hidden />
              <p className="text-sm font-medium text-white">{activeChapter?.title}</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-white/60">{activeChapter?.narration}</p>
          </div>
        </div>
        <div className="grid gap-2 p-3">
          {ops.demoVideo.chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              className={`rounded-md border px-2 py-1.5 text-left text-xs transition ${
                activeChapterId === chapter.id
                  ? "border-fuchsia-300/35 bg-fuchsia-400/12 text-fuchsia-50"
                  : "border-white/10 bg-white/[0.035] text-white/55"
              }`}
            >
              {Math.floor(chapter.timestampSeconds / 60)}:{String(chapter.timestampSeconds % 60).padStart(2, "0")} / {chapter.title}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {ops.learningPaths.map((path) => (
          <div key={path.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{path.title}</p>
                <p className="mt-1 text-xs text-white/42">{path.certification}</p>
              </div>
              <span className="rounded-md border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">
                {path.completionPct}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-guard-violet to-guard-teal" style={{ width: `${path.completionPct}%` }} />
            </div>
            <div className="mt-3 grid gap-2">
              {path.lessons.slice(0, 2).map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/18 px-2 py-1.5 text-xs text-white/55">
                  <BookOpenCheck className="h-3.5 w-3.5 text-fuchsia-200" aria-hidden />
                  <span className="truncate">{lesson.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {ops.facilitatedTraining.map((offer) => (
          <div key={offer.id} className="rounded-lg border border-white/10 bg-black/18 p-3">
            <p className="text-sm font-medium text-white">{offer.title}</p>
            <p className="mt-1 text-xs text-white/45">
              {offer.format} / {offer.duration} / sandbox {offer.includesSandbox ? "included" : "optional"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ icon: Icon, eyebrow, title }: { icon: typeof Bot; eyebrow: string; title: string }) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
        <Icon className="h-4 w-4 text-fuchsia-200" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">{eyebrow}</p>
        <h3 className="max-w-[220px] break-words text-base font-semibold text-white sm:max-w-none">{title}</h3>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

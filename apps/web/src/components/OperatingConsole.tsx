"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import {
  Activity,
  Bell,
  Bot,
  Brain,
  CheckCircle2,
  CreditCard,
  Database,
  FileWarning,
  Gauge,
  GitBranch,
  Landmark,
  LockKeyhole,
  Network,
  PauseCircle,
  Radio,
  RotateCcw,
  Search,
  Send,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { AgenticOpsPanel } from "./AgenticOpsPanel";
import {
  chatCase,
  fetchOperatingPicture,
  recallPayment,
  scoreSyntheticEvent,
  submitFeedback,
  WS_URL,
} from "@/lib/api";
import { fallbackPicture } from "@/lib/fallback";
import { useGuardStore } from "@/lib/store";
import { Alert, InvestigationCase, OperatingPicture, Payment, RiskLevel } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const riskStyles: Record<RiskLevel, string> = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  critical: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100",
};

const riskDot: Record<RiskLevel, string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-rose-400",
  critical: "bg-fuchsia-400",
};

function timeAgo(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export function OperatingConsole() {
  const queryClient = useQueryClient();
  const { picture, connected, setPicture, setConnected, pushAlert, setLastDecisionScore, lastDecisionScore } =
    useGuardStore();

  const { data } = useQuery({
    queryKey: ["operating-picture"],
    queryFn: fetchOperatingPicture,
  });

  useEffect(() => {
    if (data) setPicture(data);
  }, [data, setPicture]);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("operating.picture", (incoming: OperatingPicture) => setPicture(incoming));
    socket.on("fraud.alert", (incoming: Alert) => pushAlert(incoming));
    socket.on("fraud.event.scored", (payload: { decision?: { risk_score?: number } }) => {
      if (payload.decision?.risk_score) setLastDecisionScore(payload.decision.risk_score);
    });

    return () => {
      socket.close();
    };
  }, [pushAlert, setConnected, setLastDecisionScore, setPicture]);

  const scorer = useMutation({
    mutationFn: scoreSyntheticEvent,
    onSuccess: (decision) => {
      setLastDecisionScore(decision.risk_score);
      void queryClient.invalidateQueries({ queryKey: ["operating-picture"] });
    },
  });

  const current = picture ?? data ?? fallbackPicture;

  return (
    <main className="min-h-screen w-full overflow-x-hidden px-4 py-4 text-white sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1800px] gap-4 overflow-hidden">
        <SideRail connected={connected} />
        <section className="min-w-0 max-w-full flex-1 overflow-hidden">
          <TopBar
            connected={connected}
            onScore={() => scorer.mutate()}
            scoring={scorer.isPending}
            lastDecisionScore={lastDecisionScore}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.55fr)]">
            <div className="min-w-0 space-y-4">
              <MetricStrip picture={current} />
              <AgenticOpsPanel picture={current} />
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
                <LiveOperations picture={current} />
                <PaymentTracking picture={current} />
              </div>
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.6fr)]">
                <IdentityGraph picture={current} />
                <NetworkIntelligence picture={current} />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <AmlConvergence picture={current} />
                <LearningSystem picture={current} />
              </div>
            </div>
            <div className="min-w-0 space-y-4">
              <CaseWorkspace picture={current} />
              <CopilotPanel picture={current} />
              <AuditPanel picture={current} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SideRail({ connected }: { connected: boolean }) {
  const items = [
    { icon: Gauge, label: "Command" },
    { icon: Bell, label: "Alerts" },
    { icon: CreditCard, label: "Payments" },
    { icon: GitBranch, label: "Graph" },
    { icon: Bot, label: "Copilot" },
    { icon: Brain, label: "Agents" },
    { icon: Landmark, label: "AML" },
    { icon: LockKeyhole, label: "Security" },
  ];

  return (
    <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] w-[88px] shrink-0 rounded-lg p-3 lg:block">
      <div className="flex h-full flex-col items-center justify-between">
        <div className="space-y-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-guard-violet to-guard-purple shadow-glow">
            <Shield className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.label}
                className="grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-fuchsia-300/40 hover:bg-white/10 hover:text-white"
                title={item.label}
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5" aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 text-center">
          <span className={`mx-auto h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{connected ? "Live" : "Local"}</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  connected,
  onScore,
  scoring,
  lastDecisionScore,
}: {
  connected: boolean;
  onScore: () => void;
  scoring: boolean;
  lastDecisionScore: number | null;
}) {
  return (
    <header className="glass rounded-lg p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
            <span>African Guard</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Financial Crime Operating System</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
            Fraud intelligence, decisioning, recovery, and investigation
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white/75">
            <Radio className={`h-4 w-4 ${connected ? "text-emerald-300" : "text-amber-300"}`} aria-hidden />
            <span>{connected ? "WebSocket stream" : "Fallback snapshot"}</span>
          </div>
          {lastDecisionScore !== null ? (
            <div className="flex h-10 items-center gap-2 rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 text-sm text-fuchsia-100">
              <Activity className="h-4 w-4" aria-hidden />
              <span>Latest score {lastDecisionScore}</span>
            </div>
          ) : null}
          <button
            onClick={onScore}
            className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-guard-violet to-guard-purple px-4 text-sm font-medium text-white shadow-glow transition hover:brightness-110 disabled:opacity-60"
            disabled={scoring}
          >
            {scoring ? <PauseCircle className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            <span>Score Event</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function MetricStrip({ picture }: { picture: OperatingPicture }) {
  const metrics = [
    {
      label: "Detection rate",
      value: `${picture.metrics.fraudDetectionRate.toFixed(1)}%`,
      delta: "+3.8%",
      icon: Shield,
      tone: "text-emerald-300",
    },
    {
      label: "Decision latency",
      value: `${picture.metrics.decisionLatencyMs}ms`,
      delta: "<250ms",
      icon: Activity,
      tone: "text-fuchsia-300",
    },
    {
      label: "Recovery rate",
      value: `${picture.metrics.recoveryRate.toFixed(1)}%`,
      delta: money.format(picture.metrics.recalledValue),
      icon: RotateCcw,
      tone: "text-cyan-300",
    },
    {
      label: "Blocked value",
      value: money.format(picture.metrics.blockedValue),
      delta: `${compact.format(picture.metrics.eventsPerMinute)} ev/min`,
      icon: LockKeyhole,
      tone: "text-amber-300",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <motion.div
          key={metric.label}
          whileHover={{ y: -2 }}
          className="panel p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-white/45">{metric.label}</p>
              <p className="mt-2 truncate text-2xl font-semibold text-white">{metric.value}</p>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
              <metric.icon className={`h-5 w-5 ${metric.tone}`} aria-hidden />
            </div>
          </div>
          <p className="mt-3 text-sm text-white/55">{metric.delta}</p>
        </motion.div>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  action,
}: {
  icon: typeof Shield;
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
          <Icon className="h-4 w-4 text-fuchsia-200" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{eyebrow}</p>
          <h2 className="truncate text-base font-semibold text-white">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function LiveOperations({ picture }: { picture: OperatingPicture }) {
  return (
    <section className="panel min-h-[520px] p-4">
      <SectionHeader icon={Bell} eyebrow="Alert stream" title="Real-time fraud command" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(290px,0.6fr)]">
        <div className="min-w-0">
          <LiveHeatmap picture={picture} />
          <RiskDistribution picture={picture} />
        </div>
        <div className="thin-scrollbar max-h-[448px] space-y-2 overflow-auto pr-1">
          {picture.alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveHeatmap({ picture }: { picture: OperatingPicture }) {
  const maxAlerts = Math.max(...picture.heatmap.map((item) => item.alerts), 1);
  return (
    <div className="grid-surface relative h-[300px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0c19]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 58" preserveAspectRatio="none" aria-hidden>
        <path
          d="M52 3 L65 7 L77 18 L80 34 L73 50 L58 56 L40 51 L27 39 L21 22 L32 9 Z"
          fill="rgba(255,255,255,0.045)"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.4"
        />
        <path
          d="M42 6 L51 4 L61 10 L60 18 L50 19 L42 14 Z"
          fill="rgba(124,58,237,0.12)"
          stroke="rgba(168,85,247,0.24)"
          strokeWidth="0.2"
        />
      </svg>
      {picture.heatmap.map((point) => {
        const left = ((point.lng + 18) / 70) * 100;
        const top = ((36 - point.lat) / 72) * 100;
        const size = 16 + (point.alerts / maxAlerts) * 42;
        return (
          <div
            key={point.city}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${Math.min(88, Math.max(12, left))}%`, top: `${Math.min(86, Math.max(10, top))}%` }}
          >
            <span
              className="absolute rounded-full bg-fuchsia-400/20 blur-md"
              style={{ width: size, height: size, left: -size / 2, top: -size / 2 }}
            />
            <span
              className="relative block rounded-full border border-white/40 bg-gradient-to-br from-fuchsia-300 to-rose-400"
              style={{ width: Math.max(9, size / 3), height: Math.max(9, size / 3) }}
              title={`${point.city}: ${point.alerts} alerts, risk ${point.risk}`}
            />
          </div>
        );
      })}
      <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2 text-xs text-white/62 sm:grid-cols-3">
        {picture.heatmap.slice(0, 6).map((point) => (
          <div key={point.city} className="rounded-md border border-white/10 bg-black/22 px-2 py-1">
            <span className="text-white/85">{point.city}</span>
            <span className="ml-2 text-fuchsia-200">{point.risk}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskDistribution({ picture }: { picture: OperatingPicture }) {
  const total = picture.riskDistribution.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="mt-3 grid gap-2">
      {picture.riskDistribution.map((item) => (
        <div key={item.level} className="grid grid-cols-[84px_minmax(0,1fr)_74px] items-center gap-3 text-sm">
          <span className="capitalize text-white/65">{item.level}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, (item.count / total) * 100)}%`, backgroundColor: item.color }}
            />
          </div>
          <span className="text-right text-white/70">{compact.format(item.count)}</span>
        </div>
      ))}
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${riskDot[alert.severity]}`} />
            <span className="text-xs uppercase tracking-[0.12em] text-white/45">{alert.institution}</span>
            <span className="text-xs text-white/35">{timeAgo(alert.createdAt)}</span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-white">{alert.title}</h3>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs capitalize ${riskStyles[alert.severity]}`}>
          {alert.severity}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {alert.reasons.slice(0, 3).map((reason) => (
          <span key={reason} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/60">
            {reason}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-white/45">
        <span>{alert.subjectHash}</span>
        <span>{money.format(alert.amount)}</span>
      </div>
    </motion.article>
  );
}

function PaymentTracking({ picture }: { picture: OperatingPicture }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: recallPayment,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["operating-picture"] }),
  });
  const payment = picture.payments[0];

  if (!payment) return null;

  return (
    <section className="panel min-h-[520px] p-4">
      <SectionHeader
        icon={CreditCard}
        eyebrow="Payment tracking"
        title="Stop, recall, route"
        action={
          <button
            onClick={() => mutation.mutate(payment.id)}
            disabled={!payment.recallAvailable || mutation.isPending}
            className="flex h-9 items-center gap-2 rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 text-sm text-fuchsia-100 transition hover:bg-fuchsia-400/20 disabled:opacity-45"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            <span>Recall</span>
          </button>
        }
      />
      <PaymentRoute payment={payment} />
      <div className="mt-4 grid gap-2">
        {picture.payments.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.id}</p>
                <p className="mt-1 truncate text-xs text-white/45">
                  {item.origin} to {item.destination}
                </p>
              </div>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs capitalize text-white/65">
                {item.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-white/55">{money.format(item.amount)}</span>
              <span className="text-amber-200">Delay {item.delayAnomaly}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentRoute({ payment }: { payment: Payment }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b0c19]/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/40">{payment.id}</p>
          <p className="mt-1 text-lg font-semibold text-white">{money.format(payment.amount)}</p>
        </div>
        <span className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
          {payment.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {payment.route.map((hop, index) => (
          <div key={`${hop.institution}-${hop.timestamp}`} className="grid grid-cols-[24px_minmax(0,1fr)_54px] gap-3">
            <div className="flex flex-col items-center">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-fuchsia-300/35 bg-fuchsia-400/15 text-[10px] text-fuchsia-100">
                {index + 1}
              </span>
              {index < payment.route.length - 1 ? <span className="h-8 w-px bg-white/12" /> : null}
            </div>
            <div className="min-w-0 pb-2">
              <p className="truncate text-sm text-white">{hop.institution}</p>
              <p className="text-xs text-white/45">
                {hop.country} / {timeAgo(hop.timestamp)}
              </p>
            </div>
            <div className="text-right text-xs text-white/65">{hop.risk}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {payment.riskSignals.map((signal) => (
          <span key={signal} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/55">
            {signal}
          </span>
        ))}
      </div>
    </div>
  );
}

function IdentityGraph({ picture }: { picture: OperatingPicture }) {
  const nodesById = useMemo(
    () => new Map(picture.graph.nodes.map((node) => [node.id, node])),
    [picture.graph.nodes],
  );

  return (
    <section className="panel p-4">
      <SectionHeader icon={GitBranch} eyebrow="Identity graph" title="Risk propagation and fraud rings" />
      <div className="grid-surface relative h-[390px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0c19]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {picture.graph.edges.map((edge) => {
            const source = nodesById.get(edge.source);
            const target = nodesById.get(edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={edge.relationship === "suspicious_connection" ? "#fb7185" : "rgba(168,85,247,0.62)"}
                strokeWidth={Math.max(0.6, edge.weight * 2.2)}
              />
            );
          })}
        </svg>
        {picture.graph.nodes.map((node) => (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/14 bg-black/52 px-2 py-1 shadow-glass"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            title={`${node.id}: ${node.risk}`}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: node.risk > 80 ? "#fb7185" : node.risk > 65 ? "#f59e0b" : "#2dd4bf" }}
              />
              <span className="max-w-[112px] truncate text-xs text-white/80">{node.label}</span>
            </div>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/35">{node.type}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NetworkIntelligence({ picture }: { picture: OperatingPicture }) {
  return (
    <section className="panel p-4">
      <SectionHeader icon={Network} eyebrow="Consortium" title="Fraud intelligence network" />
      <div className="grid gap-2">
        {picture.institutions.map((institution) => (
          <div key={institution.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{institution.name}</p>
                <p className="mt-1 text-xs text-white/45">
                  {institution.country} / {compact.format(institution.sharedAlerts)} shared alerts
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-fuchsia-100">{institution.trustScore}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">trust</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-guard-violet to-guard-teal" style={{ width: `${institution.reputation}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {picture.typologies.map((typology) => (
          <div key={typology.id} className="rounded-lg border border-white/10 bg-black/18 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">{typology.name}</p>
              <span className={`rounded-md border px-2 py-1 text-xs capitalize ${riskStyles[typology.severity]}`}>
                {typology.severity}
              </span>
            </div>
            <p className="mt-2 text-xs text-white/45">
              {typology.sharedBy} institutions / prevalence {typology.prevalence}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CaseWorkspace({ picture }: { picture: OperatingPicture }) {
  const { selectedCaseId, selectCase } = useGuardStore();
  const selected = picture.cases.find((item) => item.id === selectedCaseId) ?? picture.cases[0];

  return (
    <section className="panel p-4">
      <SectionHeader icon={FileWarning} eyebrow="Case management" title="Investigation workspace" />
      <div className="grid gap-2">
        {picture.cases.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => selectCase(item.id)}
            className={`rounded-lg border p-3 text-left transition ${
              selected?.id === item.id ? "border-fuchsia-300/35 bg-fuchsia-400/12" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-xs text-white/45">
                  {item.assignee} / {item.status}
                </p>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs capitalize ${riskStyles[item.priority]}`}>
                {item.priority}
              </span>
            </div>
          </button>
        ))}
      </div>
      {selected ? <CaseDetail investigationCase={selected} /> : null}
    </section>
  );
}

function CaseDetail({ investigationCase }: { investigationCase: InvestigationCase }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-[#0b0c19]/72 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-white/40">Exposure</p>
          <p className="mt-1 text-lg font-semibold text-white">{money.format(investigationCase.lossExposure)}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Recoverable</p>
          <p className="mt-1 text-lg font-semibold text-emerald-200">{money.format(investigationCase.recoveryPotential)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {investigationCase.timeline.slice(0, 3).map((item) => (
          <div key={`${item.at}-${item.action}`} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-300" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.12em] text-white/35">{item.actor}</p>
              <p className="mt-1 text-sm text-white/78">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {investigationCase.entities.map((entity) => (
          <span key={entity} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/55">
            {entity}
          </span>
        ))}
      </div>
    </div>
  );
}

function CopilotPanel({ picture }: { picture: OperatingPicture }) {
  const { selectedCaseId } = useGuardStore();
  const selected = picture.cases.find((item) => item.id === selectedCaseId) ?? picture.cases[0];
  const [prompt, setPrompt] = useState("Why was this transaction flagged?");
  const [answer, setAnswer] = useState(selected?.sarDraft ?? "");
  const mutation = useMutation({
    mutationFn: ({ caseId, text }: { caseId: string; text: string }) => chatCase(caseId, text),
    onSuccess: (response) => setAnswer(response.answer),
  });

  useEffect(() => {
    if (selected) setAnswer(selected.sarDraft);
  }, [selected]);

  if (!selected) return null;

  const submit = (text = prompt) => {
    setPrompt(text);
    mutation.mutate({ caseId: selected.id, text });
  };

  return (
    <section className="panel p-4">
      <SectionHeader icon={Bot} eyebrow="AI investigation" title="Fraud copilot" />
      <div className="rounded-lg border border-white/10 bg-[#0b0c19]/74 p-3">
        <div className="flex items-center gap-2 text-sm text-white/65">
          <Bot className="h-4 w-4 text-fuchsia-200" aria-hidden />
          <span className="truncate">{selected.id}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/78">{answer}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {["Explain case", "Why flagged?", "Link entities", "Draft SAR"].map((command) => (
          <button
            key={command}
            onClick={() => submit(command)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/[0.08]"
          >
            {command}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/24 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-fuchsia-300/40"
          />
        </div>
        <button
          onClick={() => submit()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-guard-violet to-guard-purple text-white"
          title="Send"
          aria-label="Send"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

function AmlConvergence({ picture }: { picture: OperatingPicture }) {
  return (
    <section className="panel p-4">
      <SectionHeader icon={Landmark} eyebrow="AML plus fraud" title="Unified customer risk" />
      <div className="grid gap-2">
        {picture.amlCustomers.map((customer) => (
          <div key={customer.customerId} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{customer.name}</p>
                <p className="mt-1 text-xs text-white/45">{customer.customerId}</p>
              </div>
              <span className={`rounded-md border px-2 py-1 text-xs capitalize ${riskStyles[customer.riskLevel]}`}>
                {customer.unifiedRisk}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <RiskMini label="Fraud" value={customer.fraudRisk} />
              <RiskMini label="AML" value={customer.amlRisk} />
              <RiskMini label="Sanctions" value={customer.sanctionsRisk} />
            </div>
          </div>
        ))}
      </div>
      <AmlKycMandateCard mandate={picture.amlKycMandate} />
    </section>
  );
}

function AmlKycMandateCard({ mandate }: { mandate: OperatingPicture["amlKycMandate"] }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-[#0b0c19]/74 p-3">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-white/38">Fund operations mandate</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{mandate.title}</h3>
        <p className="mt-2 text-xs leading-5 text-white/56">{mandate.summary}</p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {mandate.definitions.map((item) => (
          <div key={item.term} className="rounded-md border border-white/10 bg-white/[0.035] p-2">
            <p className="text-xs font-medium text-white">{item.term}</p>
            <p className="mt-1 text-[11px] leading-5 text-white/50">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        {mandate.process.map((stage, index) => (
          <div key={stage.id} className="rounded-md border border-white/10 bg-black/18 p-2">
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-fuchsia-300/25 bg-fuchsia-400/10 text-[10px] text-fuchsia-100">
                {index + 1}
              </span>
              <p className="min-w-0 text-xs font-medium text-white">{stage.name}</p>
            </div>
            <div className="mt-2 grid gap-1.5">
              {stage.controls.map((control) => (
                <div key={control} className="flex gap-2 text-[11px] leading-5 text-white/52">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-200" aria-hidden />
                  <span>{control}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {mandate.regulations.map((regulation) => (
          <span
            key={regulation.name}
            className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-100"
            title={regulation.role}
          >
            {regulation.name}
          </span>
        ))}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <AmlMandateList title="Laundering stages" items={mandate.launderingStages} />
        <AmlMandateList title="Program pillars" items={mandate.programPillars} />
        <AmlMandateList title="Consequences" items={mandate.consequences} />
      </div>
    </div>
  );
}

function AmlMandateList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{title}</p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <p key={item} className="text-[11px] leading-5 text-white/52">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function RiskMini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-white/48">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-guard-teal via-guard-amber to-guard-rose"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function LearningSystem({ picture }: { picture: OperatingPicture }) {
  const queryClient = useQueryClient();
  const selectedCase = picture.cases[0];
  const mutation = useMutation({
    mutationFn: () => submitFeedback(selectedCase?.id ?? "case-2048", "confirmed_fraud"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["operating-picture"] }),
  });

  return (
    <section className="panel p-4">
      <SectionHeader
        icon={Brain}
        eyebrow="AI learning"
        title="Feedback and drift"
        action={
          <button
            onClick={() => mutation.mutate()}
            className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
            title="Label"
            aria-label="Label"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-white/35">Model</p>
          <p className="mt-2 text-sm font-medium text-white">{picture.learning.modelVersion}</p>
          <p className="mt-2 text-xs text-white/45">Retrained {timeAgo(picture.learning.lastRetrainedAt)} ago</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-white/35">Drift index</p>
          <p className="mt-2 text-2xl font-semibold text-amber-100">{picture.learning.driftIndex.toFixed(2)}</p>
          <p className="mt-2 text-xs text-white/45">{picture.learning.feedbackQueue} feedback events queued</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <LearningKpi label="Labels" value={compact.format(picture.learning.labelledCases)} />
        <LearningKpi label="FP rate" value={`${picture.learning.falsePositiveRate.toFixed(1)}%`} />
        <LearningKpi label="Lift" value={`+${picture.learning.precisionLift.toFixed(1)}%`} />
      </div>
    </section>
  );
}

function LearningKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/18 p-3">
      <p className="text-xs text-white/42">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function AuditPanel({ picture }: { picture: OperatingPicture }) {
  return (
    <section className="panel p-4">
      <SectionHeader icon={Database} eyebrow="Security" title="Audit and controls" />
      <div className="space-y-2">
        {picture.audit.slice(0, 4).map((event) => (
          <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-white">{event.action}</p>
              <span className="text-xs text-white/38">{timeAgo(event.createdAt)}</span>
            </div>
            <p className="mt-1 truncate text-xs text-white/45">
              {event.actor} / {event.target}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/62">
        <div className="rounded-lg border border-white/10 bg-black/18 p-3">
          <LockKeyhole className="mb-2 h-4 w-4 text-fuchsia-200" aria-hidden />
          AES-GCM consortium envelopes
        </div>
        <div className="rounded-lg border border-white/10 bg-black/18 p-3">
          <Users className="mb-2 h-4 w-4 text-cyan-200" aria-hidden />
          RBAC and rate limiting
        </div>
      </div>
    </section>
  );
}

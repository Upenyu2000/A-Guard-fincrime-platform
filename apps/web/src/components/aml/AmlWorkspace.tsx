"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileText,
  Gavel,
  LayoutDashboard,
  Loader2,
  Network,
  ReceiptText,
  ScanSearch,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { AppNavigation } from "@/components/AppNavigation";
import {
  activateRule,
  approveRule,
  approveSarDraft,
  assignAmlAlert,
  backtestRule,
  closeAmlAlertFalsePositive,
  convertAmlAlertToCase,
  createAmlRule,
  createSarDraft,
  evaluateDemoAmlTransaction,
  escalateAmlAlert,
  fetchAmlTransaction,
  fetchAmlWorkspace,
  refreshKyb,
  refreshKyc,
  runScreening,
} from "@/lib/aml-api";
import { fallbackAmlWorkspace } from "@/lib/aml-fallback";
import { WS_URL } from "@/lib/api";
import { AmlAlertsQueue } from "./AmlAlertsQueue";
import { AmlAuditWorkspace } from "./AmlAuditWorkspace";
import { AmlInvestigationWorkspace } from "./AmlInvestigationWorkspace";
import { AmlOverview } from "./AmlOverview";
import { BusinessKybWorkspace } from "./BusinessKybWorkspace";
import { CustomerKycWorkspace } from "./CustomerKycWorkspace";
import { EmptyState, Panel } from "./aml-ui";
import { MicrotransactionIntelligence } from "./MicrotransactionIntelligence";
import { RuleBuilder } from "./RuleBuilder";
import { SarWorkspace } from "./SarWorkspace";
import { ScreeningWorkspace } from "./ScreeningWorkspace";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import { TransactionMonitor } from "./TransactionMonitor";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transaction Monitoring", icon: ReceiptText },
  { id: "microtransactions", label: "Microtransaction Intelligence", icon: Network },
  { id: "kyc", label: "Customer KYC", icon: ShieldCheck },
  { id: "kyb", label: "Business KYB", icon: Building2 },
  { id: "screening", label: "Screening", icon: ScanSearch },
  { id: "rules", label: "Rules and Scenarios", icon: Gavel },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "investigations", label: "Investigations", icon: BriefcaseBusiness },
  { id: "sar", label: "SAR Workspace", icon: FileText },
  { id: "audit", label: "Audit and Governance", icon: ClipboardList },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AmlWorkspace() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [connected, setConnected] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const workspaceQuery = useQuery({ queryKey: ["aml-workspace"], queryFn: fetchAmlWorkspace });
  const workspace = workspaceQuery.data ?? fallbackAmlWorkspace;
  const isFallback = workspace === fallbackAmlWorkspace || workspace.overview.providerStatuses.some((provider) => provider.status === "provider_unavailable");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["aml-workspace"] });
    if (selectedTransactionId) void queryClient.invalidateQueries({ queryKey: ["aml-transaction", selectedTransactionId] });
  };

  const transactionDetailQuery = useQuery({
    queryKey: ["aml-transaction", selectedTransactionId],
    queryFn: () => fetchAmlTransaction(selectedTransactionId ?? ""),
    enabled: Boolean(selectedTransactionId),
  });

  useEffect(() => {
    const socket = io(WS_URL, { transports: ["websocket", "polling"] });
    const events = [
      "aml.transaction.evaluated",
      "aml.alert.created",
      "aml.alert.updated",
      "aml.microtransaction.cluster.detected",
      "aml.customer.risk.changed",
      "aml.business.risk.changed",
      "aml.screening.match.created",
      "aml.case.escalated",
      "aml.sar.ready_for_review",
      "aml.overview",
    ];
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    events.forEach((event) => socket.on(event, invalidate));
    return () => {
      events.forEach((event) => socket.off(event, invalidate));
      socket.disconnect();
    };
  }, [queryClient, selectedTransactionId]);

  const actions = {
    evaluate: useMutation({ mutationFn: () => evaluateDemoAmlTransaction(), onSuccess: invalidate }),
    assignAlert: useMutation({ mutationFn: (id: string) => assignAmlAlert(id), onSuccess: invalidate }),
    escalateAlert: useMutation({ mutationFn: escalateAmlAlert, onSuccess: invalidate }),
    convertAlert: useMutation({ mutationFn: convertAmlAlertToCase, onSuccess: invalidate }),
    closeAlert: useMutation({ mutationFn: closeAmlAlertFalsePositive, onSuccess: invalidate }),
    refreshKyc: useMutation({ mutationFn: refreshKyc, onSuccess: invalidate }),
    refreshKyb: useMutation({ mutationFn: refreshKyb, onSuccess: invalidate }),
    screenCustomer: useMutation({ mutationFn: (id: string) => runScreening(id, "customer"), onSuccess: invalidate }),
    screenBusiness: useMutation({ mutationFn: (id: string) => runScreening(id, "business"), onSuccess: invalidate }),
    createRule: useMutation({ mutationFn: () => createAmlRule(), onSuccess: invalidate }),
    backtestRule: useMutation({ mutationFn: backtestRule, onSuccess: invalidate }),
    approveRule: useMutation({ mutationFn: approveRule, onSuccess: invalidate }),
    activateRule: useMutation({ mutationFn: activateRule, onSuccess: invalidate }),
    createSar: useMutation({ mutationFn: createSarDraft, onSuccess: invalidate }),
    approveSar: useMutation({ mutationFn: approveSarDraft, onSuccess: invalidate }),
  };

  const activeContent = useMemo(() => {
    if (workspaceQuery.isLoading) {
      return (
        <Panel className="grid min-h-[380px] place-items-center">
          <div className="flex items-center gap-2 text-sm text-white/58">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading AML workspace
          </div>
        </Panel>
      );
    }
    if (workspace.transactions.length === 0 && activeTab !== "overview") {
      return <EmptyState title="No AML data available" detail="The AML API returned no records for this workspace section." />;
    }
    switch (activeTab) {
      case "overview":
        return <AmlOverview overview={workspace.overview} />;
      case "transactions":
        return <TransactionMonitor transactions={workspace.transactions} onSelect={setSelectedTransactionId} onEvaluate={() => actions.evaluate.mutate()} />;
      case "microtransactions":
        return <MicrotransactionIntelligence clusters={workspace.microtransactionClusters} overview={workspace.overview} graph={workspace.relationshipGraph} />;
      case "kyc":
        return <CustomerKycWorkspace customers={workspace.customers} onRefresh={(id) => actions.refreshKyc.mutate(id)} onScreen={(id) => actions.screenCustomer.mutate(id)} />;
      case "kyb":
        return <BusinessKybWorkspace businesses={workspace.businesses} onRefresh={(id) => actions.refreshKyb.mutate(id)} onScreen={(id) => actions.screenBusiness.mutate(id)} />;
      case "screening":
        return <ScreeningWorkspace checks={workspace.screeningChecks} customers={workspace.customers} businesses={workspace.businesses} onRunCustomer={(id) => actions.screenCustomer.mutate(id)} onRunBusiness={(id) => actions.screenBusiness.mutate(id)} />;
      case "rules":
        return <RuleBuilder rules={workspace.rules} onCreate={() => actions.createRule.mutate()} onBacktest={(id) => actions.backtestRule.mutate(id)} onApprove={(id) => actions.approveRule.mutate(id)} onActivate={(id) => actions.activateRule.mutate(id)} />;
      case "alerts":
        return <AmlAlertsQueue alerts={workspace.alerts} onAssign={(id) => actions.assignAlert.mutate(id)} onEscalate={(id) => actions.escalateAlert.mutate(id)} onConvert={(id) => actions.convertAlert.mutate(id)} onCloseFalsePositive={(id) => actions.closeAlert.mutate(id)} />;
      case "investigations":
        return <AmlInvestigationWorkspace investigations={workspace.investigations} onCreateSar={(caseId) => actions.createSar.mutate(caseId)} />;
      case "sar":
        return <SarWorkspace drafts={workspace.sarDrafts} onApprove={(id) => actions.approveSar.mutate(id)} />;
      case "audit":
        return <AmlAuditWorkspace audit={workspace.audit} />;
      default:
        return null;
    }
  }, [actions, activeTab, workspace, workspaceQuery.isLoading]);

  const pendingAction = Object.values(actions).some((mutation) => mutation.isPending);

  return (
    <main className="min-h-screen px-3 py-4 pb-24 sm:px-5 lg:pb-4">
      <div className="mx-auto flex w-full max-w-[1800px] gap-4">
        <AppNavigation connected={connected} />
        <section className="min-w-0 flex-1">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-4 rounded-lg border border-white/10 bg-black/20 p-4 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-guard-teal">African Guard financial-crime workspace</p>
                <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">AML, KYC & Transaction Governance</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-white/52">
                  Extends the existing fraud scoring, identity graph, investigation, SAR, learning, audit, and real-time event systems with AML/KYC/KYB controls and explainable microtransaction monitoring.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs ${connected ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-amber-300/20 bg-amber-400/10 text-amber-100"}`}>
                  {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {connected ? "Live AML socket" : "Socket reconnecting"}
                </span>
                {pendingAction ? (
                  <span className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/60">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving action
                  </span>
                ) : null}
              </div>
            </div>
            {isFallback ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100/75">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Some provider or API data is unavailable. The workspace is displaying safe fallback/test data and labels screening results accordingly.
              </div>
            ) : null}
          </motion.div>

          <div className="thin-scrollbar mb-4 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.035] p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs transition ${active ? "bg-gradient-to-r from-guard-violet to-guard-purple text-white shadow-glow" : "text-white/58 hover:bg-white/10 hover:text-white"}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeContent}
        </section>
      </div>
      <TransactionDetailDrawer detail={transactionDetailQuery.data} loading={transactionDetailQuery.isLoading} onClose={() => setSelectedTransactionId(null)} onEvaluate={() => actions.evaluate.mutate()} />
    </main>
  );
}

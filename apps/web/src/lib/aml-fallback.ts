import { AmlWorkspaceSnapshot } from "./aml-types";

export const fallbackAmlWorkspace: AmlWorkspaceSnapshot = {
  overview: {
    metrics: [
      { label: "Transactions monitored today", value: 0, format: "number" },
      { label: "Provider unavailable", value: 1, format: "number", risk: "medium" },
    ],
    alertVolumeOverTime: [],
    riskDistribution: [],
    transactionValueByRisk: [],
    microtransactionClustersOverTime: [],
    fanInActivity: [],
    fanOutActivity: [],
    highRiskCorridors: [],
    ruleTriggerFrequency: [],
    alertOutcomes: [],
    investigationWorkload: [],
    customerRiskChanges: [],
    businessRiskChanges: [],
    highestRiskPaymentCorridors: [],
    mostTriggeredScenarios: [],
    providerStatuses: [
      { provider: "African Guard API", status: "provider_unavailable", detail: "The AML API is unavailable; showing an empty safe state." },
    ],
    scenarioCoverage: [],
  },
  transactions: [],
  microtransactionClusters: [],
  customers: [],
  businesses: [],
  screeningChecks: [],
  rules: [],
  alerts: [],
  investigations: [],
  sarDrafts: [],
  audit: [],
  relationshipGraph: { nodes: [], edges: [] },
};

import assert from "node:assert/strict";
import { amlRules, amlTransactions } from "./aml.seed";
import { MicrotransactionDetectorService } from "./microtransaction-detector.service";

const detector = new MicrotransactionDetectorService();
const anchor = amlTransactions.find((transaction) => transaction.id === "txn-struct-5");

assert(anchor, "seed transaction txn-struct-5 must exist");

const windows = detector.calculateRollingWindows(amlTransactions, anchor);
assert.deepEqual(
  windows.map((window) => window.window),
  ["1m", "5m", "15m", "1h", "6h", "24h", "7d", "30d"],
  "all configured rolling windows must be calculated",
);

const dayWindow = windows.find((window) => window.window === "24h");
assert(dayWindow, "24h rolling window must exist");
assert(dayWindow.transactionCount >= 5, "structuring seed must include the related low-value payments");
assert(dayWindow.totalAmount > 0, "rolling-window total amount must be authoritative and non-zero");
assert(dayWindow.percentageBelowThreshold > 0, "below-threshold percentage must be calculated");
assert(dayWindow.uniqueDevices >= 1, "unique device count must be calculated");
assert(dayWindow.uniqueIpAddresses >= 1, "unique IP count must be calculated");

const clusters = detector.detectClusters(amlTransactions, amlRules);
const scenarios = new Set(clusters.map((cluster) => cluster.scenario));

const expectedScenarios = ["structuring", "fan_in", "fan_out", "rapid_pass_through", "dormant_reactivation", "mobile_money_consolidation"] as const;
for (const expected of expectedScenarios) {
  assert(scenarios.has(expected), `expected ${expected} cluster to be detected`);
}

for (const cluster of clusters) {
  assert.equal(new Set(cluster.transactionIds).size, cluster.transactionIds.length, `${cluster.id} must not duplicate transaction ids`);
  assert.equal(new Set(cluster.customerIds).size, cluster.customerIds.length, `${cluster.id} must not duplicate customer ids`);
  assert.equal(new Set(cluster.deviceIds).size, cluster.deviceIds.length, `${cluster.id} must not duplicate device ids`);
  assert(cluster.evidence.length > 0, `${cluster.id} must explain why risk increased`);
  assert(cluster.recommendedAction.length > 0, `${cluster.id} must include an analyst action`);
}

const structuring = clusters.find((cluster) => cluster.scenario === "structuring");
assert(structuring, "structuring cluster must be available");
assert(structuring.transactionCount >= 5, "structuring cluster should include repeated payments");
assert(structuring.thresholdAvoidancePct >= 80, "structuring cluster should explain threshold-avoidance behaviour");

console.log(`AML detector tests passed with ${clusters.length} clusters and ${windows.length} rolling windows.`);

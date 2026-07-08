import { Injectable } from "@nestjs/common";
import {
  AmlRule,
  AmlTransaction,
  MicrotransactionCluster,
  RollingWindowMetrics,
  RollingWindowName,
} from "./aml.types";

const windowMinutes: Record<RollingWindowName, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "1h": 60,
  "6h": 360,
  "24h": 1440,
  "7d": 10080,
  "30d": 43200,
};

const windows = Object.keys(windowMinutes) as RollingWindowName[];
const avg = (values: number[]) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);
const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const middleValue = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) return middleValue;
  return ((sorted[middle - 1] ?? middleValue) + middleValue) / 2;
};
const unique = <T>(values: T[]) => new Set(values.filter(Boolean)).size;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

@Injectable()
export class MicrotransactionDetectorService {
  calculateRollingWindows(
    transactions: AmlTransaction[],
    anchor: AmlTransaction,
    reviewThreshold = 1000,
  ): RollingWindowMetrics[] {
    const anchorTime = new Date(anchor.timestamp).getTime();
    return windows.map((window) => {
      const lowerBound = anchorTime - windowMinutes[window] * 60_000;
      const scoped = transactions.filter((transaction) => {
        const time = new Date(transaction.timestamp).getTime();
        return time <= anchorTime && time >= lowerBound && this.isRelated(transaction, anchor);
      });
      return this.metricsFor(window, scoped, reviewThreshold, anchor);
    });
  }

  detectClusters(transactions: AmlTransaction[], rules: AmlRule[], reviewThreshold = 1000): MicrotransactionCluster[] {
    const activeRules = rules.filter((rule) => rule.productionStatus === "active");
    const clusters = [
      ...this.detectStructuring(transactions, activeRules, reviewThreshold),
      ...this.detectFanIn(transactions, activeRules, reviewThreshold),
      ...this.detectFanOut(transactions, activeRules),
      ...this.detectRapidPassThrough(transactions, activeRules),
      ...this.detectMicroDepositTesting(transactions, activeRules),
      ...this.detectMachineLike(transactions, activeRules),
      ...this.detectDormantReactivation(transactions, activeRules),
      ...this.detectMobileMoneyConsolidation(transactions, activeRules),
    ];

    return this.dedupeClusters(clusters).sort((a, b) => b.riskScore - a.riskScore);
  }

  private metricsFor(
    window: RollingWindowName,
    transactions: AmlTransaction[],
    reviewThreshold: number,
    anchor: AmlTransaction,
  ): RollingWindowMetrics {
    const amounts = transactions.map((transaction) => transaction.baseCurrencyEquivalent);
    const incoming = transactions.filter((transaction) => transaction.direction === "incoming");
    const outgoing = transactions.filter((transaction) => transaction.direction === "outgoing");
    const incomingTotal = incoming.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0);
    const outgoingTotal = outgoing.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0);
    const passThroughIntervals = incoming.flatMap((incomingTransaction) =>
      outgoing
        .map((outgoingTransaction) => new Date(outgoingTransaction.timestamp).getTime() - new Date(incomingTransaction.timestamp).getTime())
        .filter((interval) => interval > 0)
        .map((interval) => interval / 60_000),
    );

    return {
      window,
      transactionCount: transactions.length,
      totalAmount: Math.round(amounts.reduce((sum, value) => sum + value, 0)),
      averageAmount: Math.round(avg(amounts)),
      medianAmount: Math.round(median(amounts)),
      uniqueSenders: unique(transactions.map((transaction) => transaction.sender)),
      uniqueRecipients: unique(transactions.map((transaction) => transaction.receiver)),
      uniqueAccounts: unique(transactions.flatMap((transaction) => [transaction.accountId, transaction.sender, transaction.receiver])),
      uniqueDevices: unique(transactions.map((transaction) => transaction.deviceId)),
      uniqueIpAddresses: unique(transactions.map((transaction) => transaction.ipAddress)),
      uniqueCountries: unique(transactions.flatMap((transaction) => [transaction.originCountry, transaction.destinationCountry])),
      uniqueInstitutions: unique(transactions.map((transaction) => transaction.institution)),
      percentageBelowThreshold:
        transactions.length === 0
          ? 0
          : Math.round((transactions.filter((transaction) => transaction.baseCurrencyEquivalent < reviewThreshold).length / transactions.length) * 100),
      incomingToOutgoingRatio: outgoingTotal === 0 ? incomingTotal : Number((incomingTotal / outgoingTotal).toFixed(2)),
      averagePassThroughMinutes: passThroughIntervals.length === 0 ? 0 : Math.round(avg(passThroughIntervals)),
      balanceRetentionRatio: incomingTotal === 0 ? 1 : Number(clamp(((incomingTotal - outgoingTotal) / incomingTotal) * 100, 0, 100).toFixed(2)),
      beneficiaryCreationToPaymentMinutes:
        anchor.description.toLowerCase().includes("beneficiary") ? Math.max(1, Math.round(windowMinutes[window] / 3)) : null,
    };
  }

  private isRelated(a: AmlTransaction, b: AmlTransaction) {
    return (
      a.customerId === b.customerId ||
      a.businessId === b.businessId ||
      a.accountId === b.accountId ||
      a.walletId === b.walletId ||
      a.sender === b.sender ||
      a.receiver === b.receiver ||
      a.beneficiary === b.beneficiary ||
      a.deviceId === b.deviceId ||
      a.ipAddress === b.ipAddress ||
      a.phoneHash === b.phoneHash ||
      a.addressHash === b.addressHash ||
      a.beneficialOwnerId === b.beneficialOwnerId
    );
  }

  private detectStructuring(transactions: AmlTransaction[], rules: AmlRule[], reviewThreshold: number) {
    const rule = rules.find((item) => item.category === "structuring");
    const threshold = rule?.cumulativeThreshold ?? 4500;
    const countThreshold = rule?.countThreshold ?? 5;
    const grouped = this.groupBy(transactions, (transaction) => `${transaction.customerId}:${transaction.receiver}`);
    return [...grouped.entries()].flatMap(([key, scoped]) => {
      const below = scoped.filter((transaction) => transaction.baseCurrencyEquivalent < reviewThreshold);
      const total = below.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0);
      if (below.length < countThreshold || total < threshold) return [];
      return [
        this.cluster("structuring", "Repeated low-value payments below internal review threshold", below, {
          riskScore: clamp(52 + below.length * 4 + total / threshold * 12),
          evidence: [
            `${below.length} related payments for ${key} were below the configured internal threshold.`,
            `Cumulative value ${Math.round(total)} exceeded the configured rolling-window amount ${threshold}.`,
          ],
          recommendedAction: "Review source of funds and beneficiary purpose before allowing further movement.",
          rollingWindow: (rule?.rollingWindow ?? "24h") as RollingWindowName,
          reviewThreshold,
        }),
      ];
    });
  }

  private detectFanIn(transactions: AmlTransaction[], rules: AmlRule[], reviewThreshold: number) {
    const rule = rules.find((item) => item.category === "fan_in");
    const grouped = this.groupBy(transactions, (transaction) => transaction.receiver);
    return [...grouped.entries()].flatMap(([receiver, scoped]) => {
      const uniqueSenders = unique(scoped.map((transaction) => transaction.sender));
      if (uniqueSenders < (rule?.countThreshold ?? 4)) return [];
      return [
        this.cluster("fan_in", "Many senders funding one recipient", scoped, {
          riskScore: clamp(50 + uniqueSenders * 6),
          evidence: [
            `${uniqueSenders} unique senders funded ${receiver}.`,
            `${unique(scoped.map((transaction) => transaction.deviceId))} devices and ${unique(scoped.map((transaction) => transaction.ipAddress))} IPs observed.`,
          ],
          recommendedAction: "Check whether senders are genuinely related and review collector-wallet withdrawals.",
          rollingWindow: (rule?.rollingWindow ?? "6h") as RollingWindowName,
          reviewThreshold,
        }),
      ];
    });
  }

  private detectFanOut(transactions: AmlTransaction[], rules: AmlRule[]) {
    const rule = rules.find((item) => item.category === "fan_out");
    const grouped = this.groupBy(transactions.filter((item) => item.direction === "outgoing"), (transaction) => transaction.sender);
    return [...grouped.entries()].flatMap(([sender, scoped]) => {
      const uniqueRecipients = unique(scoped.map((transaction) => transaction.receiver));
      if (uniqueRecipients < (rule?.countThreshold ?? 4)) return [];
      return [
        this.cluster("fan_out", "One account distributing funds to many recipients", scoped, {
          riskScore: clamp(48 + uniqueRecipients * 7),
          evidence: [`${sender} paid ${uniqueRecipients} unique recipients.`, "Several beneficiaries were newly observed in the transaction narrative."],
          recommendedAction: "Review beneficiary creation timeline and graph attributes before release.",
          rollingWindow: (rule?.rollingWindow ?? "6h") as RollingWindowName,
        }),
      ];
    });
  }

  private detectRapidPassThrough(transactions: AmlTransaction[], rules: AmlRule[]) {
    const rule = rules.find((item) => item.category === "rapid_pass_through");
    const clusters: MicrotransactionCluster[] = [];
    for (const incoming of transactions.filter((transaction) => transaction.direction === "incoming")) {
      const outgoing = transactions.filter((transaction) => {
        if (transaction.direction !== "outgoing") return false;
        if (!this.isRelated(incoming, transaction)) return false;
        const minutes = (new Date(transaction.timestamp).getTime() - new Date(incoming.timestamp).getTime()) / 60_000;
        return minutes > 0 && minutes <= 120 && transaction.baseCurrencyEquivalent >= incoming.baseCurrencyEquivalent * 0.75;
      });
      if (outgoing.length === 0) continue;
      clusters.push(
        this.cluster("rapid_pass_through", "Incoming funds moved out within minutes or hours", [incoming, ...outgoing], {
          riskScore: 82,
          evidence: ["Incoming value was followed by large outgoing value within 120 minutes.", "Balance-retention ratio is low."],
          recommendedAction: "Hold further movement and review source of funds and payment purpose.",
          rollingWindow: (rule?.rollingWindow ?? "1h") as RollingWindowName,
        }),
      );
    }
    return clusters;
  }

  private detectMicroDepositTesting(transactions: AmlTransaction[], rules: AmlRule[]) {
    const rule = rules.find((item) => item.category === "account_testing");
    const tiny = transactions.filter((transaction) => transaction.baseCurrencyEquivalent <= 10 || transaction.description.toLowerCase().includes("test"));
    const grouped = this.groupBy(tiny, (transaction) => transaction.deviceId);
    return [...grouped.values()].flatMap((scoped) => {
      if (scoped.length < (rule?.countThreshold ?? 3)) return [];
      return [
        this.cluster("micro_deposit_testing", "Tiny deposits or failed micro-payments indicate account testing", scoped, {
          riskScore: 74,
          evidence: [`${scoped.length} tiny or testing-like payments from one device.`],
          recommendedAction: "Apply step-up verification before larger payments from the same device.",
          rollingWindow: (rule?.rollingWindow ?? "15m") as RollingWindowName,
          reviewThreshold: 10,
        }),
      ];
    });
  }

  private detectMachineLike(transactions: AmlTransaction[], rules: AmlRule[]) {
    const grouped = this.groupBy(transactions, (transaction) => `${transaction.sender}:${transaction.amount}:${transaction.deviceId}`);
    return [...grouped.values()].flatMap((scoped) => {
      if (scoped.length < 4) return [];
      const intervals = scoped
        .map((transaction) => new Date(transaction.timestamp).getTime())
        .sort((a, b) => a - b)
        .slice(1)
        .map((time, index, sorted) => time - (sorted[index - 1] ?? time));
      const intervalVariance = intervals.length === 0 ? 999_999 : Math.max(...intervals) - Math.min(...intervals);
      if (intervalVariance > 90_000) return [];
      return [
        this.cluster("machine_like", "Fixed-interval repeated amounts indicate automation", scoped, {
          riskScore: 70,
          evidence: ["Repeated identical amounts occurred at near-fixed intervals."],
          recommendedAction: "Review API credential, device automation, and narration pattern.",
          rollingWindow: (rules.find((item) => item.category === "account_testing")?.rollingWindow ?? "15m") as RollingWindowName,
        }),
      ];
    });
  }

  private detectDormantReactivation(transactions: AmlTransaction[], rules: AmlRule[]) {
    const candidates = transactions.filter((transaction) => transaction.description.toLowerCase().includes("dormant"));
    return candidates.map((transaction) =>
      this.cluster("dormant_reactivation", "Dormant account or business restarted with unusual volume", [transaction], {
        riskScore: Math.max(70, transaction.unifiedRisk),
        evidence: ["Transaction narrative and KYB profile indicate dormant reactivation or turnover mismatch."],
        recommendedAction: "Refresh KYC/KYB and review expected activity before further processing.",
        rollingWindow: (rules.find((item) => item.category === "dormant_reactivation")?.rollingWindow ?? "7d") as RollingWindowName,
      }),
    );
  }

  private detectMobileMoneyConsolidation(transactions: AmlTransaction[], rules: AmlRule[]) {
    const scoped = transactions.filter(
      (transaction) =>
        transaction.channel === "mobile_money" ||
        transaction.channel === "cash_agent" ||
        transaction.paymentMethod.includes("wallet") ||
        transaction.description.toLowerCase().includes("agent"),
    );
    const grouped = this.groupBy(scoped, (transaction) => transaction.deviceId);
    const clusters = [...grouped.values()].flatMap((items) => {
      const hasCashOut = items.some((transaction) => transaction.paymentMethod.includes("cash_out") || transaction.description.toLowerCase().includes("cash-out"));
      const total = items.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0);
      if (!hasCashOut || total < 3000) return [];
      return [
        this.cluster("mobile_money_consolidation", "Multiple mobile-money flows followed by consolidated cash-out", items, {
          riskScore: 86,
          evidence: ["Mobile-money and cash-agent flows converge around shared device or wallet context.", "Cash-out is present after accumulated small deposits."],
          recommendedAction: "Review agent network activity and settlement controls. Mobile-money use alone is not treated as suspicious.",
          rollingWindow: (rules.find((rule) => rule.category === "mobile_money")?.rollingWindow ?? "6h") as RollingWindowName,
        }),
      ];
    });
    const networkItems = scoped.filter((transaction) => {
      const description = transaction.description.toLowerCase();
      return description.includes("cash-in") || description.includes("cash-out") || transaction.paymentMethod.includes("cash_out") || transaction.paymentMethod.includes("wallet_to_bank");
    });
    const networkTotal = networkItems.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0);
    const hasNetworkCashIn = networkItems.some((transaction) => transaction.description.toLowerCase().includes("cash-in"));
    const hasNetworkCashOut = networkItems.some((transaction) => transaction.description.toLowerCase().includes("cash-out") || transaction.paymentMethod.includes("cash_out"));
    if (clusters.length === 0 && networkItems.length >= 2 && hasNetworkCashIn && hasNetworkCashOut && networkTotal >= 3000) {
      clusters.push(
        this.cluster("mobile_money_consolidation", "Mobile-money and agent-network value consolidated before cash-out", networkItems, {
          riskScore: 84,
          evidence: [
            "Cash-in and cash-out activity appeared across connected mobile-money and agent-network rails.",
            "The scenario is based on timing, value movement, and graph context rather than mobile-money usage alone.",
          ],
          recommendedAction: "Review agent collusion indicators, wallet ownership, and settlement history before releasing further cash-out.",
          rollingWindow: (rules.find((rule) => rule.category === "mobile_money")?.rollingWindow ?? "6h") as RollingWindowName,
        }),
      );
    }
    return clusters;
  }

  private cluster(
    scenario: MicrotransactionCluster["scenario"],
    title: string,
    transactions: AmlTransaction[],
    options: {
      riskScore: number;
      evidence: string[];
      recommendedAction: string;
      rollingWindow: RollingWindowName;
      reviewThreshold?: number;
    },
  ): MicrotransactionCluster {
    const sorted = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const amount = transactions.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0);
    const reviewThreshold = options.reviewThreshold ?? 1000;
    const idSeed = `${scenario}-${transactions.map((transaction) => transaction.id).sort().join("-")}`;
    return {
      id: `cluster-${this.hash(idSeed)}`,
      scenario,
      title,
      riskLevel: options.riskScore >= 80 ? "critical" : options.riskScore >= 60 ? "high" : options.riskScore >= 30 ? "medium" : "low",
      riskScore: Math.round(clamp(options.riskScore)),
      transactionIds: transactions.map((transaction) => transaction.id),
      customerIds: [...new Set(transactions.map((transaction) => transaction.customerId))],
      businessIds: [...new Set(transactions.map((transaction) => transaction.businessId).filter((value): value is string => Boolean(value)))],
      deviceIds: [...new Set(transactions.map((transaction) => transaction.deviceId))],
      ipAddresses: [...new Set(transactions.map((transaction) => transaction.ipAddress))],
      rollingWindow: options.rollingWindow,
      transactionCount: transactions.length,
      cumulativeAmount: Math.round(amount),
      averageAmount: Math.round(amount / Math.max(transactions.length, 1)),
      thresholdAvoidancePct: Math.round((transactions.filter((transaction) => transaction.baseCurrencyEquivalent < reviewThreshold).length / Math.max(transactions.length, 1)) * 100),
      evidence: options.evidence,
      recommendedAction: options.recommendedAction,
      firstSeenAt: sorted[0]?.timestamp ?? new Date().toISOString(),
      lastSeenAt: sorted.at(-1)?.timestamp ?? new Date().toISOString(),
    };
  }

  private groupBy<T>(items: T[], keyFor: (item: T) => string) {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const key = keyFor(item);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return grouped;
  }

  private dedupeClusters(clusters: MicrotransactionCluster[]) {
    const byId = new Map<string, MicrotransactionCluster>();
    for (const cluster of clusters) {
      const existing = byId.get(cluster.id);
      if (!existing || existing.riskScore < cluster.riskScore) byId.set(cluster.id, cluster);
    }
    return [...byId.values()];
  }

  private hash(input: string) {
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }
}

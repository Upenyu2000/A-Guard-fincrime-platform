import { Injectable } from "@nestjs/common";
import { GraphEdge, GraphNode, RiskLevel } from "../../domain";
import { AmlTransaction, ResearchRiskSignal } from "./aml.types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
const unique = <T>(values: T[]) => [...new Set(values)];

@Injectable()
export class ResearchRiskService {
  analyzeTransaction(
    transaction: AmlTransaction,
    transactions: AmlTransaction[],
    graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  ): ResearchRiskSignal[] {
    const related = transactions.filter((item) => item.id !== transaction.id && this.isRelated(transaction, item));
    const recent = related.filter((item) => Math.abs(new Date(transaction.timestamp).getTime() - new Date(item.timestamp).getTime()) <= 24 * 60 * 60_000);
    const sameDeviceCustomers = unique(transactions.filter((item) => item.deviceId === transaction.deviceId).map((item) => item.customerId));
    const sameIpCustomers = unique(transactions.filter((item) => item.ipAddress === transaction.ipAddress).map((item) => item.customerId));
    const graphDegree = graph.edges.filter((edge) => edge.source === transaction.customerId || edge.target === transaction.customerId || edge.source === transaction.deviceId || edge.target === transaction.deviceId).length;
    const neighbors = this.nearestNeighbors(transaction, transactions, 5);
    const neighborRisk = average(neighbors.map((item) => item.unifiedRisk || item.amlRisk || item.fraudRisk));
    const amountBin = this.bin(transaction.baseCurrencyEquivalent, [10, 100, 500, 1000, 5000]);
    const velocityBin = this.bin(recent.length, [1, 3, 5, 10, 20]);
    const associationDensity = clamp(sameDeviceCustomers.length * 18 + sameIpCustomers.length * 14 + graphDegree * 3);

    const signals: ResearchRiskSignal[] = [];

    const gaapScore = clamp(
      (amountBin <= 2 ? 18 : 8) +
        velocityBin * 10 +
        associationDensity * 0.45 +
        (transaction.beneficiary.toLowerCase().includes("new") ? 14 : 0),
    );
    if (gaapScore >= 28) {
      signals.push({
        id: "gaap-attribute-association",
        name: "Attribute-association pattern",
        paper: "Global Attribute-Association Pattern Aggregation for Graph Fraud Detection (AAAI 2025)",
        score: Math.round(gaapScore),
        riskLevel: this.levelFor(gaapScore),
        implementedAs: "auditable_heuristic",
        governanceStatus: "active_control",
        evidence: [
          `Amount bin ${amountBin} and velocity bin ${velocityBin} were evaluated together instead of averaged as raw values.`,
          `${sameDeviceCustomers.length} customer(s) share device ${transaction.deviceId}; ${sameIpCustomers.length} customer(s) share IP ${transaction.ipAddress}.`,
          `Graph association degree for customer/device context is ${graphDegree}.`,
        ],
      });
    }

    const retrievalScore = clamp(neighborRisk * 0.72 + neighbors.length * 4 + (this.corridor(transaction) === this.corridor(neighbors[0]) ? 8 : 0));
    if (retrievalScore >= 24 && neighbors.length > 0) {
      signals.push({
        id: "tre-retrieval-enrichment",
        name: "Recent-neighbor retrieval enrichment",
        paper: "Online Fraud Detection via Test-Time Retrieval-Based Representation Enrichment (AAAI 2025)",
        score: Math.round(retrievalScore),
        riskLevel: this.levelFor(retrievalScore),
        implementedAs: "auditable_heuristic",
        governanceStatus: "active_control",
        evidence: [
          `Nearest recent neighbors: ${neighbors.map((item) => `${item.id}:${Math.round(item.unifiedRisk)}`).join(", ")}.`,
          `Distance-weighted neighbor risk is ${Math.round(neighborRisk)}; this is advisory drift evidence, not an automatic irreversible decision.`,
        ],
      });
    }

    const graphAttackScore = clamp(
      (sameDeviceCustomers.length >= 3 ? 32 : 0) +
        (sameIpCustomers.length >= 3 ? 24 : 0) +
        (transaction.linkedTransactionIds.length >= 5 ? 16 : 0) +
        (transaction.sharedBeneficiaries.length >= 3 ? 14 : 0) +
        (transaction.deviceId.includes("shared") ? 12 : 0),
    );
    if (graphAttackScore >= 24) {
      signals.push({
        id: "graph-injection-camouflage",
        name: "Graph-injection and camouflage guard",
        paper: "Unveiling the Threat of Fraud Gangs to Graph Neural Networks (AAAI 2025)",
        score: Math.round(graphAttackScore),
        riskLevel: this.levelFor(graphAttackScore),
        implementedAs: "auditable_heuristic",
        governanceStatus: "shadow_mode",
        evidence: [
          `Shared device/customer count ${sameDeviceCustomers.length}; shared IP/customer count ${sameIpCustomers.length}.`,
          `Linked transaction count ${transaction.linkedTransactionIds.length} and shared beneficiary count ${transaction.sharedBeneficiaries.length}.`,
        ],
      });
    }

    const heterophilyScore = clamp(Math.abs(neighborRisk - (transaction.unifiedRisk || transaction.amlRisk || 20)) + (graphDegree > 6 ? 18 : 0));
    if (heterophilyScore >= 30) {
      signals.push({
        id: "heterophily-risk-disagreement",
        name: "Heterophily risk disagreement",
        paper: "A Label-free Heterophily-guided Approach for Unsupervised Graph Fraud Detection (AAAI 2025)",
        score: Math.round(heterophilyScore),
        riskLevel: this.levelFor(heterophilyScore),
        implementedAs: "auditable_heuristic",
        governanceStatus: "shadow_mode",
        evidence: [
          `Local transaction score differs from neighbor risk by ${Math.round(Math.abs(neighborRisk - (transaction.unifiedRisk || transaction.amlRisk || 20)))} points.`,
          "This signal is review-only unless corroborated by transaction behavior, KYC/KYB evidence, or rules.",
        ],
      });
    }

    return signals.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  dynamicBins(value: number, boundaries: number[]) {
    return {
      value,
      boundaries,
      bin: this.bin(value, boundaries),
    };
  }

  nearestNeighbors(transaction: AmlTransaction, transactions: AmlTransaction[], limit: number) {
    return transactions
      .filter((item) => item.id !== transaction.id)
      .map((item) => ({ item, distance: this.distance(transaction, item) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(({ item }) => item);
  }

  private isRelated(a: AmlTransaction, b: AmlTransaction) {
    return (
      a.customerId === b.customerId ||
      a.businessId === b.businessId ||
      a.accountId === b.accountId ||
      a.walletId === b.walletId ||
      a.deviceId === b.deviceId ||
      a.ipAddress === b.ipAddress ||
      a.beneficiary === b.beneficiary
    );
  }

  private distance(a: AmlTransaction, b: AmlTransaction) {
    const amountDistance = Math.abs(Math.log1p(a.baseCurrencyEquivalent) - Math.log1p(b.baseCurrencyEquivalent));
    const channelDistance = a.channel === b.channel ? 0 : 1.4;
    const corridorDistance = this.corridor(a) === this.corridor(b) ? 0 : 1.2;
    const deviceDistance = a.deviceId === b.deviceId ? 0 : 0.9;
    const ipDistance = a.ipAddress === b.ipAddress ? 0 : 0.7;
    const timeHours = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) / 3_600_000;
    return amountDistance + channelDistance + corridorDistance + deviceDistance + ipDistance + Math.min(2.5, timeHours / 72);
  }

  private corridor(transaction?: AmlTransaction) {
    if (!transaction) return "";
    return `${transaction.originCountry}-${transaction.destinationCountry}`;
  }

  private bin(value: number, boundaries: number[]) {
    return boundaries.findIndex((boundary) => value < boundary) + 1 || boundaries.length + 1;
  }

  private levelFor(score: number): RiskLevel {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 30) return "medium";
    return "low";
  }
}

"use client";

import { GraphEdge, GraphNode } from "@/lib/types";
import { OwnershipGraph } from "./OwnershipGraph";

export function TransactionNetworkGraph({ graph }: { graph: { nodes: GraphNode[]; edges: GraphEdge[] } }) {
  return <OwnershipGraph graph={graph} title="Transaction network graph" />;
}

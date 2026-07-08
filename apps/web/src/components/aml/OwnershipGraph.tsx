"use client";

import { GraphEdge, GraphNode } from "@/lib/types";
import { EmptyState } from "./aml-ui";

export function OwnershipGraph({ graph, title = "Ownership graph" }: { graph: { nodes: GraphNode[]; edges: GraphEdge[] }; title?: string }) {
  if (graph.nodes.length === 0) return <EmptyState title="No graph data" detail="No ownership or relationship graph is available for this record." />;
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-white/38">{title}</p>
      <div className="grid-surface relative h-[260px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0c19]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {graph.edges.map((edge) => {
            const source = nodesById.get(edge.source);
            const target = nodesById.get(edge.target);
            if (!source || !target) return null;
            return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(45,212,191,0.58)" strokeWidth={Math.max(0.6, edge.weight * 2)} />;
          })}
        </svg>
        {graph.nodes.map((node) => (
          <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/14 bg-black/56 px-2 py-1 shadow-glass" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <p className="max-w-[118px] truncate text-xs text-white/85">{node.label}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/35">{node.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { create } from "zustand";
import { Alert, GraphEdge, GraphNode, OperatingPicture } from "./types";

interface GuardStore {
  picture: OperatingPicture | null;
  connected: boolean;
  selectedCaseId: string | null;
  lastDecisionScore: number | null;
  setPicture: (picture: OperatingPicture) => void;
  setConnected: (connected: boolean) => void;
  pushAlert: (alert: Alert) => void;
  selectCase: (caseId: string) => void;
  setLastDecisionScore: (score: number) => void;
}

const graphDisplayKey = (node: Pick<GraphNode, "type" | "label">) =>
  `${node.type}:${node.label.trim().toLowerCase()}`;

function dedupeGraph(picture: OperatingPicture): OperatingPicture {
  const nodesByKey = new Map<string, GraphNode>();
  const retainedIdById = new Map<string, string>();

  for (const node of picture.graph.nodes) {
    const key = graphDisplayKey(node);
    const existing = nodesByKey.get(key);
    if (!existing) {
      nodesByKey.set(key, { ...node });
      retainedIdById.set(node.id, node.id);
      continue;
    }

    existing.risk = Math.max(existing.risk, node.risk);
    retainedIdById.set(node.id, existing.id);
  }

  const edgesByKey = new Map<string, GraphEdge>();
  for (const edge of picture.graph.edges) {
    const source = retainedIdById.get(edge.source);
    const target = retainedIdById.get(edge.target);
    if (!source || !target || source === target) continue;

    const key = `${source}:${target}:${edge.relationship}`;
    const existing = edgesByKey.get(key);
    if (existing) {
      existing.weight = Math.max(existing.weight, edge.weight);
      continue;
    }

    edgesByKey.set(key, { ...edge, source, target });
  }

  return {
    ...picture,
    graph: {
      nodes: [...nodesByKey.values()],
      edges: [...edgesByKey.values()],
    },
  };
}

export const useGuardStore = create<GuardStore>((set) => ({
  picture: null,
  connected: false,
  selectedCaseId: null,
  lastDecisionScore: null,
  setPicture: (picture) =>
    set((state) => {
      const nextPicture = dedupeGraph(picture);
      return {
        picture: nextPicture,
        selectedCaseId: state.selectedCaseId ?? nextPicture.cases[0]?.id ?? null,
      };
    }),
  setConnected: (connected) => set({ connected }),
  pushAlert: (alert) =>
    set((state) => {
      if (!state.picture) return state;
      return {
        picture: {
          ...state.picture,
          alerts: [alert, ...state.picture.alerts].slice(0, 20),
        },
      };
    }),
  selectCase: (caseId) => set({ selectedCaseId: caseId }),
  setLastDecisionScore: (score) => set({ lastDecisionScore: score }),
}));

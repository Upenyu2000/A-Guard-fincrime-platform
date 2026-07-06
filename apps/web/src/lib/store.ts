import { create } from "zustand";
import { Alert, OperatingPicture } from "./types";

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

export const useGuardStore = create<GuardStore>((set) => ({
  picture: null,
  connected: false,
  selectedCaseId: null,
  lastDecisionScore: null,
  setPicture: (picture) =>
    set((state) => ({
      picture,
      selectedCaseId: state.selectedCaseId ?? picture.cases[0]?.id ?? null,
    })),
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

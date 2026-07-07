"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { getAccessToken, WS_URL } from "@/lib/api";
import { useGuardStore } from "@/lib/store";
import type { Alert, OperatingPicture } from "@/lib/types";

export function AuthenticatedRealtimeBridge() {
  const { setPicture, setConnected, pushAlert, setLastDecisionScore } = useGuardStore();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setConnected(false);
      return;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 10_000,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("connect_error", () => setConnected(false));
    socket.on("disconnect", () => setConnected(false));
    socket.on("operating.picture", (incoming: OperatingPicture) => setPicture(incoming));
    socket.on("fraud.alert", (incoming: Alert) => pushAlert(incoming));
    socket.on("fraud.event.scored", (payload: { decision?: { risk_score?: number } }) => {
      if (typeof payload.decision?.risk_score === "number") {
        setLastDecisionScore(payload.decision.risk_score);
      }
    });

    return () => socket.close();
  }, [pushAlert, setConnected, setLastDecisionScore, setPicture]);

  return null;
}

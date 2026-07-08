"use client";

import { AuditEvent } from "@/lib/types";
import { Panel, timeAgo } from "./aml-ui";

export function AmlAuditWorkspace({ audit }: { audit: AuditEvent[] }) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold text-white">Audit and governance</h2>
      <p className="mt-1 text-sm text-white/48">Immutable decision history for rules, assessments, alerts, cases, SAR drafts, overrides, exports, and permission-sensitive actions.</p>
      <div className="mt-4 grid gap-2">
        {audit.map((event) => (
          <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-white">{event.action}</p>
              <p className="text-xs text-white/38">{timeAgo(event.createdAt)} ago</p>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-white/52 sm:grid-cols-4">
              <p>Actor: {event.actor}</p>
              <p>Role: {event.role}</p>
              <p>Target: {event.target}</p>
              <p>Correlation: {String(event.metadata?.correlationId ?? event.id)}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/42">Reason: {String(event.metadata?.reason ?? "Recorded by AML governance service.")}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

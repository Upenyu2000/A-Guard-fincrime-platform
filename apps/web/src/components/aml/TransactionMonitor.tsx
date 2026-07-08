"use client";

import { Download, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AmlTransaction } from "@/lib/aml-types";
import { RiskLevel } from "@/lib/types";
import { money, Panel, StatusPill, timeAgo } from "./aml-ui";

function level(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function TransactionMonitor({
  transactions,
  onSelect,
  onEvaluate,
}: {
  transactions: AmlTransaction[];
  onSelect: (id: string) => void;
  onEvaluate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("risk");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...transactions]
      .filter((tx) => {
        const haystack = [tx.id, tx.eventId, tx.institution, tx.customerId, tx.businessId, tx.sender, tx.receiver, tx.beneficiary, tx.currency, tx.originCountry, tx.destinationCountry, tx.channel, tx.alertStatus].join(" ").toLowerCase();
        return (!q || haystack.includes(q)) && (risk === "all" || level(tx.unifiedRisk) === risk) && (status === "all" || tx.status === status || tx.alertStatus === status);
      })
      .sort((a, b) => {
        if (sort === "amount") return b.baseCurrencyEquivalent - a.baseCurrencyEquivalent;
        if (sort === "time") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (sort === "country") return `${a.originCountry}-${a.destinationCountry}`.localeCompare(`${b.originCountry}-${b.destinationCountry}`);
        return b.unifiedRisk - a.unifiedRisk;
      });
  }, [query, risk, sort, status, transactions]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);

  function exportCsv() {
    const rows = [["id", "institution", "customer", "amount", "currency", "origin", "destination", "channel", "fraudRisk", "amlRisk", "unifiedRisk", "decision"], ...filtered.map((tx) => [tx.id, tx.institution, tx.customerId, `${tx.baseCurrencyEquivalent}`, tx.currency, tx.originCountry, tx.destinationCountry, tx.channel, `${tx.fraudRisk}`, `${tx.amlRisk}`, `${tx.unifiedRisk}`, tx.decision])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "african-guard-aml-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Transaction monitoring</h2>
          <p className="mt-1 text-sm text-white/48">Search, sort, filter, export, and open fully explained risk evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-guard-violet to-guard-purple px-3 text-xs font-medium text-white shadow-glow" onClick={onEvaluate}>
            <Play className="h-3.5 w-3.5" />
            Evaluate event
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3">
          <Search className="h-4 w-4 text-white/35" />
          <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" placeholder="Search transactions" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
        </label>
        <select className="rounded-lg border border-white/10 bg-[#121222] px-3 text-sm text-white/70" value={risk} onChange={(event) => { setRisk(event.target.value); setPage(0); }}>
          <option value="all">All risk</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="rounded-lg border border-white/10 bg-[#121222] px-3 text-sm text-white/70" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
          <option value="all">All status</option>
          <option value="approved">Approved</option>
          <option value="review">Review</option>
          <option value="held">Held</option>
          <option value="blocked">Blocked</option>
          <option value="new">New alert</option>
          <option value="escalated">Escalated</option>
        </select>
        <select className="rounded-lg border border-white/10 bg-[#121222] px-3 text-sm text-white/70" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="risk">Sort by risk</option>
          <option value="amount">Sort by value</option>
          <option value="time">Sort by time</option>
          <option value="country">Sort by corridor</option>
        </select>
        <select className="rounded-lg border border-white/10 bg-[#121222] px-3 text-sm text-white/70" onChange={(event) => {
          if (event.target.value === "mlro") { setRisk("critical"); setStatus("escalated"); }
          if (event.target.value === "mobile") { setQuery("mobile_money"); setRisk("all"); }
          if (event.target.value === "clear") { setQuery(""); setRisk("all"); setStatus("all"); }
          setPage(0);
        }} defaultValue="clear" aria-label="Saved transaction views">
          <option value="clear">Saved view: all</option>
          <option value="mlro">MLRO queue</option>
          <option value="mobile">Mobile money</option>
        </select>
      </div>

      <div className="thin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[1060px] border-separate border-spacing-0 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-white/35">
            <tr>
              <th className="pb-3 pr-3"><span className="sr-only">Select</span></th>
              <th className="pb-3 pr-3">Transaction</th>
              <th className="pb-3 pr-3">Parties</th>
              <th className="pb-3 pr-3">Amount</th>
              <th className="pb-3 pr-3">Corridor</th>
              <th className="pb-3 pr-3">Channel</th>
              <th className="pb-3 pr-3">Risk</th>
              <th className="pb-3 pr-3">Decision</th>
              <th className="pb-3 pr-3">Alert</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((tx) => (
              <tr key={tx.id} className="border-t border-white/10">
                <td className="border-t border-white/10 py-3 pr-3 align-top">
                  <input aria-label={`Select ${tx.id}`} type="checkbox" checked={selected.has(tx.id)} onChange={(event) => setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(tx.id); else next.delete(tx.id);
                    return next;
                  })} />
                </td>
                <td className="border-t border-white/10 py-3 pr-3 align-top">
                  <button className="text-left" onClick={() => onSelect(tx.id)}>
                    <p className="font-medium text-white hover:text-guard-teal">{tx.id}</p>
                    <p className="mt-1 text-xs text-white/42">{tx.institution} · {timeAgo(tx.timestamp)} ago</p>
                  </button>
                </td>
                <td className="border-t border-white/10 py-3 pr-3 align-top text-xs text-white/58">
                  <p>{tx.sender} to {tx.receiver}</p>
                  <p className="mt-1 text-white/38">{tx.beneficiary}</p>
                </td>
                <td className="border-t border-white/10 py-3 pr-3 align-top text-white/70">{money.format(tx.baseCurrencyEquivalent)}</td>
                <td className="border-t border-white/10 py-3 pr-3 align-top text-white/58">{tx.originCountry} to {tx.destinationCountry}</td>
                <td className="border-t border-white/10 py-3 pr-3 align-top text-white/58">{tx.channel.replaceAll("_", " ")}</td>
                <td className="border-t border-white/10 py-3 pr-3 align-top"><StatusPill tone={level(tx.unifiedRisk)}>{Math.round(tx.unifiedRisk)}</StatusPill></td>
                <td className="border-t border-white/10 py-3 pr-3 align-top text-xs capitalize text-white/58">{tx.decision.replaceAll("_", " ")}</td>
                <td className="border-t border-white/10 py-3 pr-3 align-top text-xs capitalize text-white/58">{tx.alertStatus.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between">
        <span>{filtered.length} matching transactions · {selected.size} selected</span>
        <div className="flex gap-2">
          <button className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
          <span className="rounded-lg border border-white/10 px-3 py-2">{page + 1} / {pages}</span>
          <button className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-40" disabled={page >= pages - 1} onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}>Next</button>
        </div>
      </div>
    </Panel>
  );
}

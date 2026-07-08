"use client";

import { ExternalLink, FlaskConical, GitBranch, Microscope, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { RepositoryIntegrationReview, ResearchImplementationModule, ResearchPaperReview } from "@/lib/aml-types";
import { EmptyState, MiniBar, Panel, StatusPill } from "./aml-ui";

const statusTone: Record<string, "low" | "medium" | "high" | "critical"> = {
  active_control: "low",
  active: "low",
  shadow_mode: "medium",
  reviewed: "medium",
  review_only: "medium",
  backlog: "high",
  provider_required: "high",
  implemented: "low",
  reviewed_not_imported: "medium",
};

export function ResearchModelWorkspace({
  papers,
  implementations,
  repositories,
}: {
  papers: ResearchPaperReview[];
  implementations: ResearchImplementationModule[];
  repositories: RepositoryIntegrationReview[];
}) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("all");
  const themes = useMemo(() => ["all", ...Array.from(new Set(papers.map((paper) => paper.theme))).sort()], [papers]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return papers.filter((paper) => {
      const matchesTheme = theme === "all" || paper.theme === theme;
      const haystack = `${paper.title} ${paper.authors} ${paper.venue} ${paper.theme} ${paper.review}`.toLowerCase();
      return matchesTheme && (!normalized || haystack.includes(normalized));
    });
  }, [papers, query, theme]);

  const activeCount = implementations.filter((item) => item.status === "active").length;
  const reviewedCount = papers.filter((paper) => paper.implementationStatus !== "backlog").length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Panel>
          <p className="text-xs text-white/45">Papers reviewed</p>
          <p className="mt-2 text-3xl font-semibold text-white">{papers.length}</p>
          <p className="mt-1 text-xs text-white/45">{reviewedCount} mapped to governance</p>
        </Panel>
        <Panel>
          <p className="text-xs text-white/45">Active controls</p>
          <p className="mt-2 text-3xl font-semibold text-white">{activeCount}</p>
          <p className="mt-1 text-xs text-white/45">Auditable scoring modules</p>
        </Panel>
        <Panel>
          <p className="text-xs text-white/45">External repos reviewed</p>
          <p className="mt-2 text-3xl font-semibold text-white">{repositories.length}</p>
          <p className="mt-1 text-xs text-white/45">No code imported into app</p>
        </Panel>
        <Panel>
          <p className="text-xs text-white/45">Provider/model limits</p>
          <p className="mt-2 text-3xl font-semibold text-white">{implementations.filter((item) => item.status === "provider_required").length}</p>
          <p className="mt-1 text-xs text-white/45">Require credentials or validation</p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-cyan-200" />
            <h3 className="text-sm font-semibold text-white">Implemented research modules</h3>
          </div>
          <div className="grid gap-3">
            {implementations.map((module) => (
              <div key={module.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{module.name}</p>
                    <p className="mt-1 text-xs text-white/45">{module.sourcePapers.join(", ")}</p>
                  </div>
                  <StatusPill tone={statusTone[module.status] ?? "medium"}>{module.status.replaceAll("_", " ")}</StatusPill>
                </div>
                <div className="mt-3 grid gap-2">
                  {module.riskSignals.map((signal) => (
                    <div key={signal} className="rounded-md border border-cyan-300/15 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">{signal}</div>
                  ))}
                </div>
                <div className="mt-3">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/32">Fairness controls</p>
                  <p className="text-xs leading-5 text-white/52">{module.fairnessControls.join(" ")}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-fuchsia-200" />
            <h3 className="text-sm font-semibold text-white">Repository integration review</h3>
          </div>
          <div className="grid gap-3">
            {repositories.map((repo) => (
              <div key={repo.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <a href={repo.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-white hover:text-cyan-100">
                    {repo.repository}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <StatusPill tone={statusTone[repo.status] ?? "medium"}>{repo.status.replaceAll("_", " ")}</StatusPill>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/52">{repo.observedPattern}</p>
                <p className="mt-2 text-xs leading-5 text-white/68">{repo.integratedFeature}</p>
                <p className="mt-2 text-xs leading-5 text-white/40">{repo.notes}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-fuchsia-300/45"
              placeholder="Search paper, author, venue, or implementation notes"
            />
          </label>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="h-11 rounded-lg border border-white/10 bg-[#11111d] px-3 text-sm text-white outline-none focus:border-fuchsia-300/45"
            aria-label="Filter papers by research theme"
          >
            {themes.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All research themes" : item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState title="No papers match the current filters" detail="Adjust the search text or research theme filter." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((paper) => (
            <Panel key={paper.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={statusTone[paper.implementationStatus] ?? "medium"}>{paper.implementationStatus.replaceAll("_", " ")}</StatusPill>
                    <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-white/45">{paper.venue} {paper.year}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">{paper.title}</h3>
                  <p className="mt-1 text-xs text-white/42">{paper.authors}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70">
                  <Microscope className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/58">{paper.review}</p>
              <div className="mt-3">
                <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-white/32">Implemented as</p>
                <p className="text-xs leading-5 text-white/70">{paper.implementedAs}</p>
              </div>
              <div className="mt-3">
                <MiniBar value={paper.implementationStatus === "active_control" ? 92 : paper.implementationStatus === "shadow_mode" ? 62 : paper.implementationStatus === "reviewed" ? 44 : 24} tone={statusTone[paper.implementationStatus] ?? "medium"} />
                <p className="mt-2 text-xs leading-5 text-white/40">{paper.limitations}</p>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

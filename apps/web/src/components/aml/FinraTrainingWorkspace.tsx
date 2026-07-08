"use client";

import { BookOpenCheck, Clock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FinraCourse } from "@/lib/aml-types";
import { EmptyState, Panel, StatusPill } from "./aml-ui";

export function FinraTrainingWorkspace({ courses }: { courses: FinraCourse[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => ["all", ...Array.from(new Set(courses.map((course) => course.category))).sort()], [courses]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesCategory = category === "all" || course.category === category;
      const haystack = `${course.title} ${course.courseId} ${course.category} ${course.controlMappings.join(" ")}`.toLowerCase();
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, courses, query]);

  const amlCount = courses.filter((course) => course.controlMappings.some((mapping) => mapping.includes("AML") || mapping.includes("SAR"))).length;
  const totalMinutes = courses.reduce((sum, course) => sum + course.durationMinutes, 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Panel>
          <p className="text-xs text-white/45">FINRA catalog entries</p>
          <p className="mt-2 text-3xl font-semibold text-white">{courses.length}</p>
          <p className="mt-1 text-xs text-white/45">2026 course catalog mapped to controls</p>
        </Panel>
        <Panel>
          <p className="text-xs text-white/45">AML/SAR mapped</p>
          <p className="mt-2 text-3xl font-semibold text-white">{amlCount}</p>
          <p className="mt-1 text-xs text-white/45">Training mapped to AML workflows</p>
        </Panel>
        <Panel>
          <p className="text-xs text-white/45">Training time</p>
          <p className="mt-2 text-3xl font-semibold text-white">{Math.round(totalMinutes / 60)}h</p>
          <p className="mt-1 text-xs text-white/45">Across active WBT records</p>
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
              placeholder="Search course ID, title, category, or mapped control"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-lg border border-white/10 bg-[#11111d] px-3 text-sm text-white outline-none focus:border-fuchsia-300/45"
            aria-label="Filter courses by category"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All categories" : item}
              </option>
            ))}
          </select>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState title="No courses match the current filters" detail="Adjust the search text or category filter." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((course) => (
            <Panel key={course.courseId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={course.category.includes("AML") ? "high" : "low"}>{course.courseId}</StatusPill>
                    <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-white/55">{course.category}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">{course.no}. {course.title}</h3>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70">
                  <BookOpenCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/52">{course.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-md border border-cyan-300/15 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">
                  <Clock className="h-3 w-3" />
                  {course.durationMinutes}m
                </span>
                <span className="rounded-md border border-emerald-300/15 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-100">
                  {course.ceCategory} {course.ceCredit}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-white/45">
                  CFP {course.cfpProgramId}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {course.controlMappings.map((mapping) => (
                  <div key={mapping} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/62">
                    {mapping}
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

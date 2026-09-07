import type { Metadata } from "next";
import Link from "next/link";
import React from "react";

import { AutoRefresh } from "@/components/AutoRefresh";
import { getPersona } from "@/lib/personas";
import { listCases } from "@/lib/store";
import { toSummary, type CaseSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public docket | The Smaller Claims Court",
  description: "Every case filed before this court, and the people who keep losing them.",
};

function tally(cases: CaseSummary[], pick: (c: CaseSummary) => string) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const c of cases) {
    const name = pick(c).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { name, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
}

export default async function DocketPage() {
  const cases = (await listCases()).map(toSummary);
  const judged = cases.filter((c) => c.status === "judged");
  const mostSued = tally(cases, (c) => c.defendant);
  const mostLitigious = tally(cases, (c) => c.plaintiff);

  return (
    <div className="space-y-10">
      <AutoRefresh />

      <header className="text-center">
        <p className="eyebrow">Public record</p>
        <h1 className="mt-4 font-display text-3xl text-brass-200 sm:text-4xl">The docket</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-oak-200/80">
          Every matter brought before this court. Justice is public, and so is the fact that you
          have been sued four times.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Cases filed" value={cases.length} />
        <Stat label="Judgments entered" value={judged.length} />
        <Stat label="Appeals taken" value={cases.filter((c) => c.appealed).length} />
      </section>

      {cases.length === 0 ? (
        <section className="paper px-8 py-14 text-center">
          <h2 className="font-display text-xl text-oak-950">The docket is empty</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-oak-800">
            No one has been wronged yet today. Statistically improbable. Be the first.
          </p>
          <div className="mt-7">
            <Link href="/file" className="btn-primary !py-2.5 !text-[11px]">
              File the first case
            </Link>
          </div>
        </section>
      ) : (
        <>
          {mostSued.length > 0 ? (
            <section className="grid gap-5 sm:grid-cols-2">
              <Leaderboard
                title="Most sued"
                rows={mostSued}
                unit={(n) => (n === 1 ? "once a defendant" : `${n} times a defendant`)}
              />
              <Leaderboard
                title="Most litigious"
                rows={mostLitigious}
                unit={(n) => `${n} ${n === 1 ? "case" : "cases"} filed`}
              />
            </section>
          ) : null}

          <section>
            <h2 className="eyebrow mb-4">Cases of record</h2>
            <ul className="space-y-3">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/case/${c.id}`}
                    className="panel block p-5 transition hover:border-brass-400/60"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-display text-base text-brass-200">
                        {c.plaintiff} <span className="text-oak-400">v.</span> {c.defendant}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-oak-300/70">
                        {c.caseNumber}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-oak-200/75">
                      {c.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em]">
                      <span
                        className={
                          c.status === "judged" ? "text-emerald-300/80" : "text-brass-300/80"
                        }
                      >
                        {c.status === "judged" ? "Decided" : "Awaiting judgment"}
                      </span>
                      <span className="text-oak-400/70">{getPersona(c.personaId).name}</span>
                      {c.evidenceCount > 0 ? (
                        <span className="text-oak-400/70">
                          {c.evidenceCount} {c.evidenceCount === 1 ? "exhibit" : "exhibits"}
                        </span>
                      ) : null}
                      {c.appealed ? <span className="text-fuchsia-300/80">Appealed</span> : null}
                    </div>

                    {c.damagesAwarded ? (
                      <p className="mt-3 border-l-2 border-brass-500/40 pl-3 text-sm text-brass-100/90">
                        {c.damagesAwarded}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel px-5 py-6 text-center">
      <p className="font-display text-4xl text-brass-200">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-oak-300/70">
        {label}
      </p>
    </div>
  );
}

function Leaderboard({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: { name: string; count: number }[];
  unit: (count: number) => string;
}) {
  return (
    <div className="panel p-5">
      <h3 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">{title}</h3>
      <ol className="mt-4 space-y-2">
        {rows.map((row, i) => (
          <li key={row.name} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">
              <span className="mr-2 font-mono text-[10px] text-oak-400">{i + 1}.</span>
              {row.name}
            </span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-oak-300/70">
              {unit(row.count)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

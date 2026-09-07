import { NextResponse } from "next/server";

import { listCases } from "@/lib/store";
import { toSummary, type CaseSummary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Tally {
  name: string;
  count: number;
}

function leaderboard(pick: (c: CaseSummary) => string, cases: CaseSummary[]): Tally[] {
  const counts = new Map<string, Tally>();
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

/** GET /api/docket - the public record, plus the standings nobody asked for. */
export async function GET() {
  const cases = (await listCases()).map(toSummary);
  const judged = cases.filter((c) => c.status === "judged");

  return NextResponse.json({
    cases,
    stats: {
      filed: cases.length,
      judged: judged.length,
      appealed: cases.filter((c) => c.appealed).length,
      mostSued: leaderboard((c) => c.defendant, cases),
      mostLitigious: leaderboard((c) => c.plaintiff, cases),
    },
  });
}

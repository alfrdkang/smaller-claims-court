import { NextResponse } from "next/server";

import { badRequest, readJson } from "@/lib/http";
import { recordStatement } from "@/lib/statement-voice";
import { createCase, listCases } from "@/lib/store";
import { toSummary } from "@/lib/types";
import { firstIssue, NewCaseSchema } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases - file a new case. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const parsed = NewCaseSchema.safeParse(body);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));

  const record = await createCase(parsed.data);
  const spoken = await recordStatement(record.id, "plaintiff", record.description);
  return NextResponse.json(spoken ?? record, { status: 201 });
}

/** GET /api/cases - every case on the docket, newest first. */
export async function GET() {
  const cases = await listCases();
  return NextResponse.json({ cases: cases.map(toSummary) });
}

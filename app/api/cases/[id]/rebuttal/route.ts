import { NextResponse } from "next/server";

import { badRequest, notFound, readJson } from "@/lib/http";
import { recordStatement } from "@/lib/statement-voice";
import { updateCase } from "@/lib/store";
import { firstIssue, RebuttalSchema } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/rebuttal - the defendant's answer, filed before judgment. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  const parsed = RebuttalSchema.safeParse(body);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));

  const updated = await updateCase(id, (draft) => {
    draft.rebuttal = parsed.data.rebuttal;
  });

  if (!updated) return notFound();
  const spoken = await recordStatement(id, "defendant", parsed.data.rebuttal);
  return NextResponse.json(spoken ?? updated);
}

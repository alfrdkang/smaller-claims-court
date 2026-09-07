import { NextResponse } from "next/server";

import { badRequest, notFound, readJson } from "@/lib/http";
import { newId, updateCase } from "@/lib/store";
import { EvidenceSchema, firstIssue, MAX_EVIDENCE_ITEMS } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/evidence - tender an exhibit. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  const parsed = EvidenceSchema.safeParse(body);
  if (!parsed.success) return badRequest(firstIssue(parsed.error));

  let rejection: string | null = null;
  const updated = await updateCase(id, (draft) => {
    if (draft.evidence.length >= MAX_EVIDENCE_ITEMS) {
      rejection = `This court accepts no more than ${MAX_EVIDENCE_ITEMS} exhibits per case.`;
      return;
    }
    draft.evidence.push({
      id: newId(6),
      uploadedBy: parsed.data.uploadedBy,
      imageUrl: parsed.data.imageUrl,
      caption: parsed.data.caption || undefined,
      createdAt: Date.now(),
    });
  });

  if (!updated) return notFound();
  if (rejection) return badRequest(rejection);
  return NextResponse.json(updated, { status: 201 });
}

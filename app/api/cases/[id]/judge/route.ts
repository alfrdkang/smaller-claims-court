import { NextResponse } from "next/server";

import { JudgeError, renderJudgment, spokenRuling } from "@/lib/judge";
import { badRequest, notFound, readJson, serverError } from "@/lib/http";
import { APPELLATE, getPersona } from "@/lib/personas";
import { getCase, putAudio, updateCase } from "@/lib/store";
import type { Verdict } from "@/lib/types";
import { firstIssue, JudgeRequestSchema } from "@/lib/validate";
import { AUDIO_CONTENT_TYPE, speakRuling } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Judgment plus synthesis can run long on a cold start; give it room. */
export const maxDuration = 60;

/**
 * POST /api/cases/:id/judge
 *
 * Body: { appeal?: boolean }
 *
 * Runs the LLM judge, synthesises the audio, stores both, and returns the case.
 * Judging an already-judged case is a no-op unless `appeal` is set, in which case
 * the standing verdict is moved to the case history and the appellate bench sits.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(req);
  const parsed = JudgeRequestSchema.safeParse(body ?? {});
  if (!parsed.success) return badRequest(firstIssue(parsed.error));
  const { appeal } = parsed.data;

  const record = await getCase(id);
  if (!record) return notFound();

  if (record.status === "judged" && !appeal) {
    // Already ruled on. Don't burn tokens re-deciding settled law.
    return NextResponse.json(record);
  }
  if (appeal && record.status !== "judged") {
    return badRequest("There is nothing to appeal: this case has not yet been heard.");
  }

  let fields;
  try {
    fields = await renderJudgment(record, appeal);
  } catch (err) {
    if (err instanceof JudgeError) {
      const status = err.code === "no_api_key" ? 503 : err.code === "refused" ? 422 : 502;
      return serverError(err.message, status);
    }
    console.error("[judge] unexpected failure:", err);
    return serverError("The bench encountered an unexpected difficulty.");
  }

  const voiceId = appeal ? APPELLATE.voiceId : getPersona(record.personaId).voiceId;
  const audio = await speakRuling(spokenRuling(fields, record, appeal), voiceId);

  const deliveredAt = Date.now();
  if (audio) await putAudio(id, audio, AUDIO_CONTENT_TYPE);

  const verdict: Verdict = {
    ...fields,
    // The query string busts the browser cache when an appeal replaces the audio.
    audioUrl: audio ? `/api/cases/${id}/audio?v=${deliveredAt}` : null,
    personaId: record.personaId,
    appeal,
    deliveredAt,
  };

  const updated = await updateCase(id, (draft) => {
    if (appeal && draft.verdict) draft.history.push(draft.verdict);
    draft.verdict = verdict;
    draft.status = "judged";
  });

  if (!updated) return notFound();
  return NextResponse.json(updated);
}

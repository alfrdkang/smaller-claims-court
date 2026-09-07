import { NextResponse } from "next/server";

import { getPersona } from "@/lib/personas";
import { recordStatement } from "@/lib/statement-voice";
import { createCase, putAudio, updateCase } from "@/lib/store";
import type { Case, EvidenceItem, PersonaId, Verdict } from "@/lib/types";
import { AUDIO_CONTENT_TYPE, speakRuling } from "@/lib/voice";
import { spokenRuling } from "@/lib/spoken-ruling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Audio synthesis can run long on a cold start; give it room. */
export const maxDuration = 60;

const SAMPLE_PERSONA: PersonaId = "vex";

const SAMPLE = {
  plaintiff: "Ada",
  plaintiffCharacter: "c",
  defendant: "Grace",
  defendantCharacter: "k",
  description:
    "I labelled my pad thai with my name and the date. Grace ate it. When confronted she said the label 'must have fallen off'. The label was still on the container, in the bin, under her fork.",
  requestedDamages: "$14 and a public apology in the group chat",
  rebuttal:
    "The label said DO NOT EAT. It did not say whose. Also the pad thai was eleven days old.",
};

const SAMPLE_VERDICT = {
  caseCitation: "Ferreira v. Unattended Leftovers, 412 Petty 88 (2019)",
  reasoning:
    "The court finds the plaintiff's labelling clear, contemporaneous, and cruelly specific. The defendant's claim that the label 'fell off' is contradicted by the label itself, recovered from the bin. The age of the pad thai, while regrettable, does not entitle the defendant to consume it.",
  ruling: "Judgment for the plaintiff. The defendant's fork-based defence is overruled.",
  damagesAwarded:
    "$14, one (1) group-chat apology of no fewer than twelve words, and a written commitment never to 'help finish' labelled food again.",
};

/** A 1x1 transparent PNG as a placeholder exhibit. */
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function POST() {
  const record = await createCase({
    plaintiff: SAMPLE.plaintiff,
    defendant: SAMPLE.defendant,
    description: SAMPLE.description,
    requestedDamages: SAMPLE.requestedDamages,
    personaId: SAMPLE_PERSONA,
    plaintiffCharacter: SAMPLE.plaintiffCharacter,
    defendantCharacter: SAMPLE.defendantCharacter,
  });

  await updateCase(record.id, (draft) => {
    draft.rebuttal = SAMPLE.rebuttal;
  });

  const exhibit: EvidenceItem = {
    id: "exh01",
    uploadedBy: SAMPLE.plaintiff,
    imageUrl: TINY_PNG,
    caption: "The container, labelled and then discarded.",
    createdAt: Date.now(),
  };
  await updateCase(record.id, (draft) => {
    draft.evidence.push(exhibit);
  });

  // Best-effort statement recordings; the hearing falls back to captions if TTS is unavailable.
  await recordStatement(record.id, "plaintiff", SAMPLE.description);
  await recordStatement(record.id, "defendant", SAMPLE.rebuttal);

  const deliveredAt = Date.now();
  const verdict: Verdict = {
    ...SAMPLE_VERDICT,
    audioUrl: null,
    personaId: SAMPLE_PERSONA,
    appeal: false,
    deliveredAt,
  };

  const audio = await speakRuling(
    spokenRuling(verdict, record),
    getPersona(record.personaId).voiceId,
  );
  if (audio) {
    await putAudio(record.id, audio, AUDIO_CONTENT_TYPE, deliveredAt);
    verdict.audioUrl = `/api/cases/${record.id}/audio?v=${deliveredAt}`;
  }

  const judged = await updateCase(record.id, (draft) => {
    draft.verdict = verdict;
    draft.status = "judged";
  });

  return NextResponse.json(judged, { status: 201 });
}

import { NextResponse } from "next/server";

import { badRequest, serverError } from "@/lib/http";
import { transcribe, transcriptionAvailable } from "@/lib/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 25MB is far more than a spoken grievance needs. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** POST /api/transcribe - multipart body with an `audio` file. */
export async function POST(req: Request) {
  if (!transcriptionAvailable()) {
    return serverError("Voice testimony is unavailable: ELEVENLABS_API_KEY is not set.", 503);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Expected a multipart form with an `audio` file.");
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) return badRequest("No audio was submitted.");
  if (audio.size === 0) return badRequest("The recording was empty.");
  if (audio.size > MAX_AUDIO_BYTES) return badRequest("That recording is too long to transcribe.");

  try {
    const text = await transcribe(audio);
    if (!text) return badRequest("The court reporter could not make out any words.");
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[transcribe] failed:", err);
    return serverError("The court reporter could not transcribe that recording.", 502);
  }
}

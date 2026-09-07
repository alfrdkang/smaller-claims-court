import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/** ElevenLabs Scribe. Override with ELEVENLABS_STT_MODEL_ID. */
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL_ID || "scribe_v1";

let cached: ElevenLabsClient | null = null;

export function transcriptionAvailable(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/**
 * Turn a recorded statement into text so litigants can testify out loud instead
 * of typing. Returns null when transcription is unconfigured or produced nothing.
 */
export async function transcribe(audio: File): Promise<string | null> {
  if (!transcriptionAvailable()) return null;
  cached ??= new ElevenLabsClient();

  const result = await cached.speechToText.convert({
    file: audio,
    modelId: STT_MODEL,
    tagAudioEvents: false,
  });

  // The response is a union; only the direct transcription carries `text`.
  if ("text" in result && typeof result.text === "string") {
    const text = result.text.trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

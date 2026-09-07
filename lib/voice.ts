import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * `eleven_flash_v2_5` is the low-latency flash model - the right trade for a
 * verdict read aloud in front of a room. Override with ELEVENLABS_MODEL_ID.
 */
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";
const OUTPUT_FORMAT = "mp3_44100_128";

export const AUDIO_CONTENT_TYPE = "audio/mpeg";

let cached: ElevenLabsClient | null = null;

export function voiceAvailable(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function client(): ElevenLabsClient {
  cached ??= new ElevenLabsClient(); // reads ELEVENLABS_API_KEY from the env
  return cached;
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const DELIVERY = {
  // Steady and slightly slow: this is a judge, not a podcast host.
  bench: { stability: 0.5, similarityBoost: 0.75, style: 0.35, speed: 0.92, useSpeakerBoost: true },
  // A friend explaining themselves to a court. Looser and a touch quicker.
  party: { stability: 0.4, similarityBoost: 0.75, style: 0.5, speed: 1, useSpeakerBoost: true },
} as const;

/** Library voices for the two disputants. Both are overridable from the env. */
export const PARTY_VOICES = {
  plaintiff: process.env.ELEVENLABS_VOICE_PLAINTIFF || "EXAVITQu4vr4xnSDxMaL",
  defendant: process.env.ELEVENLABS_VOICE_DEFENDANT || "IKne3meq5aSn9XLyUdCD",
} as const;

/**
 * Render a line of the hearing aloud.
 *
 * Returns null - rather than throwing - when TTS is unconfigured or the API
 * fails. A silent page is a far better demo than a 500, and the caller
 * surfaces the text either way.
 */
async function speak(
  text: string,
  voiceId: string,
  delivery: keyof typeof DELIVERY,
): Promise<Buffer | null> {
  if (!voiceAvailable()) {
    console.warn("[voice] ELEVENLABS_API_KEY not set - this will be delivered in silence.");
    return null;
  }

  try {
    const stream = await client().textToSpeech.convert(voiceId, {
      text,
      modelId: MODEL_ID,
      outputFormat: OUTPUT_FORMAT,
      voiceSettings: DELIVERY[delivery],
    });
    const audio = await collect(stream);
    return audio.length > 0 ? audio : null;
  } catch (err) {
    console.error("[voice] ElevenLabs synthesis failed:", err);
    return null;
  }
}

export function speakRuling(text: string, voiceId: string): Promise<Buffer | null> {
  return speak(text, voiceId, "bench");
}

/** The plaintiff's claim or the defendant's rebuttal, read in their own voice. */
export function speakStatement(text: string, voiceId: string): Promise<Buffer | null> {
  return speak(text, voiceId, "party");
}

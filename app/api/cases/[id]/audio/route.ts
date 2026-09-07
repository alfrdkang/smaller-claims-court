import { statementAudioKey, type PartyRole } from "@/lib/statement-voice";
import { getAudio } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/:id/audio - the ElevenLabs recording of the ruling, or of a party's statement. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(req.url).searchParams;
  const version = query.get("v") ?? undefined;
  const asked = query.get("role");
  if (asked && asked !== "plaintiff" && asked !== "defendant") {
    return new Response("No such speaker sits in this court.", { status: 400 });
  }
  const audio = await getAudio(asked ? statementAudioKey(id, asked as PartyRole) : id, version);
  if (!audio) {
    return new Response("No recording of this exists.", { status: 404 });
  }

  const bytes = Buffer.from(audio.base64, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": audio.contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

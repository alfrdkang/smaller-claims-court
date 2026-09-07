import { getAudio } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/:id/audio - the ElevenLabs recording of the ruling. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audio = await getAudio(id);
  if (!audio) {
    return new Response("No recording of this ruling exists.", { status: 404 });
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

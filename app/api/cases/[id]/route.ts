import { NextResponse } from "next/server";

import { notFound } from "@/lib/http";
import { getCase } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/:id - the full case file, verdict included once judged. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getCase(id);
  if (!record) return notFound();
  return NextResponse.json(record);
}

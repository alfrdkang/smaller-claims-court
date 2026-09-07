import { NextResponse } from "next/server";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No such case appears on this court's docket.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

/** Parse a JSON body without throwing on malformed input. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

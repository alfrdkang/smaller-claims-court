import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

import { APPELLATE, getPersona } from "./personas";
import type { Case, Verdict } from "./types";

export const JUDGE_MODEL = process.env.JUDGE_MODEL || "claude-opus-5";

/**
 * Effort trades ruling quality against latency. `low` keeps a live demo snappy
 * (typically a handful of seconds); `medium`/`high` produce more elaborate
 * reasoning and more baroque precedent at the cost of a longer wait.
 */
const JUDGE_EFFORT = (process.env.JUDGE_EFFORT || "low") as
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

/** Claude reads the evidence, but a fistful of photos is plenty for a ruling. */
const MAX_EVIDENCE_IMAGES = 4;

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export const VerdictSchema = z.object({
  caseCitation: z
    .string()
    .describe(
      "A fabricated but official-sounding precedent the court relies on, with a year. " +
        'Example: "Ferreira v. Unattended Leftovers, 412 Petty 88 (2019)".',
    ),
  reasoning: z
    .string()
    .describe(
      "Two to four sentences of mock-legal analysis. Reference the evidence, the cited precedent, " +
        "and the totality of the circumstances. Utterly serious in tone.",
    ),
  ruling: z
    .string()
    .describe(
      "Who prevails, stated formally in one or two sentences. Name the parties as given.",
    ),
  damagesAwarded: z
    .string()
    .describe(
      "The award. Usually part monetary, part absurdly specific non-monetary obligation with a deadline. " +
        'Example: "three (3) dollars, plus one (1) sincerely worded apology text within 48 hours".',
    ),
});

export type VerdictFields = z.infer<typeof VerdictSchema>;

export class JudgeError extends Error {
  constructor(
    message: string,
    readonly code: "no_api_key" | "refused" | "unparsable" | "upstream",
  ) {
    super(message);
    this.name = "JudgeError";
  }
}

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new JudgeError(
      "ANTHROPIC_API_KEY is not set - the bench cannot be seated.",
      "no_api_key",
    );
  }
  cached ??= new Anthropic();
  return cached;
}

export function judgeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const BASE_SYSTEM = `You are a judge of the Smaller Claims Court, a court of record that hears only the pettiest disputes between friends, roommates and colleagues.

You take every case with total, unbroken sincerity. The humour of this court comes entirely from the mismatch between the gravity of your language and the triviality of the matter before you - never from you acknowledging that the case is silly. You never break character, never wink at the reader, never use emoji, and never mention that you are an AI.

House rules of the bench:
- Cite the fabricated precedent you invent as though it were binding authority, and reason from it.
- Weigh whatever evidence has been tendered explicitly, including photographs, by describing what the court observes in them.
- Where a party has filed a rebuttal, address it directly and say what weight the court gives it.
- Rule decisively for one party. Split decisions are permitted only when both parties have plainly disgraced themselves.
- Damages should be mostly non-monetary, oddly specific, enforceable-sounding, and time-bound.
- Both parties are consenting friends who filed this case for fun. Be witheringly formal about their conduct in the dispute, but never cruel about their appearance, identity, or anything outside the four corners of the case.
- Total output across all four fields must stay under 150 words. This ruling is read aloud; brevity is a virtue of the bench.`;

function personaSystem(c: Case, appeal: boolean): string {
  if (appeal) {
    const below = getPersona(c.personaId);
    return `${BASE_SYSTEM}

You are ${APPELLATE.name}, sitting on appeal. ${APPELLATE.temperament}

The court below was presided over by ${below.name}, whose ruling is reproduced for your review.`;
  }
  const persona = getPersona(c.personaId);
  return `${BASE_SYSTEM}

You are ${persona.name}, "${persona.title}". ${persona.temperament}`;
}

function parseDataUri(uri: string): { mediaType: SupportedImageType; data: string } | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(uri);
  if (!match) return null;
  const mediaType = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.includes(mediaType as SupportedImageType)) return null;
  return { mediaType: mediaType as SupportedImageType, data: match[2] };
}

function caseBrief(c: Case, appeal: boolean): string {
  const lines = [
    `CASE NUMBER: ${c.caseNumber}`,
    `PLAINTIFF: ${c.plaintiff}`,
    `DEFENDANT: ${c.defendant}`,
    "",
    "STATEMENT OF CLAIM:",
    c.description,
    "",
    `RELIEF REQUESTED BY PLAINTIFF: ${c.requestedDamages || "unspecified"}`,
  ];

  if (c.rebuttal?.trim()) {
    lines.push("", `REBUTTAL FILED BY THE DEFENDANT, ${c.defendant}:`, c.rebuttal.trim());
  }

  if (c.evidence.length) {
    lines.push("", "EVIDENCE TENDERED:");
    c.evidence.slice(0, MAX_EVIDENCE_IMAGES).forEach((item, i) => {
      lines.push(
        `  Exhibit ${String.fromCharCode(65 + i)} - filed by ${item.uploadedBy}` +
          (item.caption ? `: "${item.caption}"` : ""),
      );
    });
    lines.push("(The exhibits are attached below in order.)");
  } else {
    lines.push("", "EVIDENCE TENDERED: none. The parties rely on assertion alone.");
  }

  if (appeal && c.verdict) {
    lines.push(
      "",
      "RULING OF THE COURT BELOW, NOW ON APPEAL:",
      `  Citation: ${c.verdict.caseCitation}`,
      `  Reasoning: ${c.verdict.reasoning}`,
      `  Ruling: ${c.verdict.ruling}`,
      `  Damages: ${c.verdict.damagesAwarded}`,
      "",
      "Review this ruling and issue your own, harsher, disposition.",
    );
  }

  lines.push(
    "",
    appeal
      ? "Issue the judgment of the appellate court."
      : "Issue the judgment of this court.",
  );

  return lines.join("\n");
}

function userContent(c: Case, appeal: boolean): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: caseBrief(c, appeal) },
  ];

  c.evidence.slice(0, MAX_EVIDENCE_IMAGES).forEach((item, i) => {
    const parsed = parseDataUri(item.imageUrl);
    if (!parsed) return;
    blocks.push({ type: "text", text: `Exhibit ${String.fromCharCode(65 + i)}:` });
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: parsed.mediaType, data: parsed.data },
    });
  });

  return blocks;
}

/**
 * Ask Claude for a ruling. Tries the request with server-side refusal fallbacks
 * enabled and retries once without them if the account has not been granted that
 * beta, so a missing entitlement never costs us the demo.
 */
export async function renderJudgment(c: Case, appeal = false): Promise<VerdictFields> {
  const anthropic = client();

  const request = {
    model: JUDGE_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text" as const,
        text: personaSystem(c, appeal),
        // The persona prompt is identical for every case heard by this judge.
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user" as const, content: userContent(c, appeal) }],
    output_config: {
      effort: JUDGE_EFFORT,
      format: betaZodOutputFormat(VerdictSchema),
    },
  };

  let response;
  try {
    response = await anthropic.beta.messages.parse({
      ...request,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      // Most likely the fallback beta is not enabled for this key; proceed plainly.
      console.warn("[judge] retrying without server-side fallbacks:", err.message);
      response = await anthropic.beta.messages.parse(request);
    } else if (err instanceof Anthropic.APIError) {
      throw new JudgeError(`The bench is unreachable (${err.status}): ${err.message}`, "upstream");
    } else {
      throw err;
    }
  }

  if (response.stop_reason === "refusal") {
    throw new JudgeError(
      "The court declined to hear this matter. Try rephrasing the complaint.",
      "refused",
    );
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new JudgeError("The court's ruling was illegible.", "unparsable");
  }
  return parsed;
}

/** The text actually sent to ElevenLabs. Kept short so the clip lands in a demo. */
export function spokenRuling(v: Pick<Verdict, "caseCitation" | "reasoning" | "ruling" | "damagesAwarded">, c: Case, appeal = false): string {
  const bench = appeal ? APPELLATE.name : getPersona(c.personaId).name;
  return [
    `${appeal ? "On appeal in" : "In"} the matter of ${c.plaintiff} versus ${c.defendant}, case number ${c.caseNumber}.`,
    `This court is guided by ${v.caseCitation}.`,
    v.reasoning,
    v.ruling,
    `Damages are awarded as follows: ${v.damagesAwarded}.`,
    `So ordered. ${bench}.`,
  ].join(" ");
}

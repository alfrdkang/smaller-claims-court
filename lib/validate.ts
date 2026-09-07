import * as z from "zod/v4";

import { DEFAULT_PERSONA, PERSONAS } from "./personas";

export const MAX_EVIDENCE_ITEMS = 6;
/** Roughly 4MB of decoded image, expressed as base64 characters. */
export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;

const personaId = z
  .string()
  .optional()
  .transform((v) => (v && v in PERSONAS ? v : DEFAULT_PERSONA))
  .pipe(z.enum(["grimsby", "vex", "calloway"]));

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(min, `${label} must be at least ${min} character${min === 1 ? "" : "s"}.`)
        .max(max, `${label} must be under ${max} characters.`),
    );

export const NewCaseSchema = z.object({
  plaintiff: trimmed(1, 60, "The plaintiff's name"),
  defendant: trimmed(1, 60, "The defendant's name"),
  description: trimmed(15, 2000, "The statement of claim"),
  requestedDamages: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim().slice(0, 200)),
  personaId,
});

export const EvidenceSchema = z.object({
  uploadedBy: trimmed(1, 60, "The filing party"),
  imageUrl: z
    .string()
    .refine(
      (s) => /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(s),
      "Evidence must be a base64 PNG, JPEG, GIF or WebP data URI.",
    )
    .refine(
      (s) => s.length <= MAX_EVIDENCE_BYTES * 1.4,
      "That exhibit is too large. Please file something under 4MB.",
    ),
  caption: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim().slice(0, 160)),
});

export const RebuttalSchema = z.object({
  rebuttal: trimmed(5, 1500, "The rebuttal"),
});

export const JudgeRequestSchema = z.object({
  appeal: z.boolean().optional().default(false),
});

/** Collapse a Zod failure into one sentence a courtroom clerk could read out. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "The filing was rejected on a technicality.";
}

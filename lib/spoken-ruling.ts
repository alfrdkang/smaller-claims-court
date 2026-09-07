import { APPELLATE, getPersona } from "./personas";
import type { Case, Verdict } from "./types";

export function spokenRuling(
  v: Pick<Verdict, "caseCitation" | "reasoning" | "ruling" | "damagesAwarded">,
  c: Case,
  appeal = false,
): string {
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

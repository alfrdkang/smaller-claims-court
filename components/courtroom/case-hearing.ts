import type { Case } from "../../lib/types";
import { spokenRuling } from "../../lib/spoken-ruling";
import type { HearingBeat } from "./hearing";

export type HearingStage = "opening" | "waiting" | "verdict" | "closing" | "settled";
export type HearingChapter = "full" | "statements" | "verdict";

export function splitSpeech(text: string): string[] {
  const chunks: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    if (line && line.length + word.length + 1 > 180) {
      chunks.push(line);
      line = "";
    }
    line += `${line ? " " : ""}${word}`;
  }
  if (line) chunks.push(line);
  return chunks;
}

function beat(id: string, caption: string, overrides: Partial<HearingBeat>): HearingBeat {
  return { id, caption, duration: 4, view: "judge", speaker: null, judge: "idle", plaintiff: "listen", defendant: "listen", ...overrides };
}

/** Measured length, in seconds, of each party's recorded statement. */
export type SpokenLengths = Partial<Record<"plaintiff" | "defendant", number>>;

export function openingBeats(record: Case, variant: number, spoken: SpokenLengths = {}): HearingBeat[] {
  const statements = (text: string, role: "plaintiff" | "defendant") => {
    const lines = splitSpeech(text).map((line, i) =>
      beat(`${role}-${i}`, role === "plaintiff" ? "Statement of claim" : "The defendant answers", {
        line, speaker: role, view: variant % 3 === 1 && i % 3 === 2 ? "wide" : role,
        duration: Math.max(4, line.split(/\s+/).length / 2.7 + 1),
        judge: role === "plaintiff" ? "listen-left" : "listen-right",
        [role]: variant % 3 === 2 && i % 3 === 1 ? "object" : "speak",
      }));
    // When the statement has been recorded, the captions run to the recording.
    const clip = spoken[role];
    if (clip && clip > 0) {
      const scale = clip / lines.reduce((sum, item) => sum + item.duration, 0);
      for (const item of lines) item.duration *= scale;
    }
    return lines;
  };
  return [
    beat("call-to-order", "All rise. Court is in session.", { duration: 3.5, view: "wide", speaker: "judge", line: "The court is now in session. Both parties will be heard.", judge: "gavel" }),
    ...statements(record.description, "plaintiff"),
    ...(record.rebuttal?.trim() ? statements(record.rebuttal, "defendant") : [
      beat("no-rebuttal", "No rebuttal filed", { line: "No rebuttal has been entered into the record.", speaker: "judge", judge: "speak" }),
    ]),
    ...(record.evidence.length ? [beat("exhibits", "Exhibits entered into evidence", { speaker: "judge", line: `${record.evidence.length} exhibit${record.evidence.length === 1 ? " is" : "s are"} before the court. The bench will consider the evidence.`, judge: "nod" })] : []),
  ];
}

export function verdictBeats(record: Case): HearingBeat[] {
  if (!record.verdict) return [];
  return splitSpeech(spokenRuling(record.verdict, record, record.verdict.appeal)).map((line, i) =>
    beat(`verdict-${i}`, record.verdict?.appeal ? "Opinion on appeal" : "The opinion of the court", {
      line, speaker: "judge", judge: "speak", duration: Math.max(4, line.split(/\s+/).length / 2.7 + 1),
    }));
}

export const CLOSING_BEATS: HearingBeat[] = [
  beat("adjourned", "So ordered. This court is adjourned.", { duration: 3, judge: "gavel", speaker: "judge", line: "So ordered. This court is adjourned." }),
  beat("reactions", "The order has been entered into the record.", { duration: 3, view: "wide", judge: "nod", plaintiff: "agree", defendant: "agree" }),
];

export function beatAt(beats: HearingBeat[], elapsed: number) {
  let start = 0;
  for (let index = 0; index < beats.length; index++) {
    const beat = beats[index];
    if (elapsed < start + beat.duration || index === beats.length - 1) {
      return { beat, index, offset: Math.max(0, elapsed - start) };
    }
    start += beat.duration;
  }
  return { beat: undefined, index: 0, offset: 0 };
}

export function advanceStage(stage: HearingStage, pending: boolean, hasVerdict: boolean, chapter: HearingChapter): HearingStage {
  if (stage === "opening") return chapter === "statements" ? "settled" : "waiting";
  if (stage === "waiting") return !pending && hasVerdict ? "verdict" : "waiting";
  if (stage === "verdict") return "closing";
  return "settled";
}

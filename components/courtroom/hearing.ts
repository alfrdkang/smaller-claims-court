import type { CharacterMotion } from "./character-motion";
import type { JudgeMotion } from "./judge-motion";
import type { CourtroomView, HearingRole } from "./views";

export type HearingBeat = {
  id: string;
  duration: number;
  view: CourtroomView;
  speaker: HearingRole | null;
  line?: string;
  caption: string;
  judge: JudgeMotion;
  plaintiff: CharacterMotion;
  defendant: CharacterMotion;
};

export const HEARING: HearingBeat[] = [
  {
    id: "call-to-order",
    duration: 6.5,
    view: "wide",
    speaker: "judge",
    line: "The Smaller Claims Court is now in session. Sit down. Be brief. Be ashamed.",
    caption: "Call to order",
    judge: "gavel",
    plaintiff: "idle",
    defendant: "idle",
  },
  {
    id: "plaintiff-opening",
    duration: 7,
    view: "plaintiff",
    speaker: "plaintiff",
    line: "The defendant ate my leftovers. The container had my name on it. In capitals.",
    caption: "The plaintiff states the claim",
    judge: "listen-left",
    plaintiff: "speak",
    defendant: "listen",
  },
  {
    id: "objection",
    duration: 5.5,
    view: "defendant",
    speaker: "defendant",
    line: "Objection. The label said DO NOT EAT. It did not say whose.",
    caption: "The defendant objects",
    judge: "listen-right",
    plaintiff: "listen",
    defendant: "object",
  },
  {
    id: "admonishment",
    duration: 5.5,
    view: "judge",
    speaker: "judge",
    line: "Counsel will stop interrupting. Counsel will also stop eating.",
    caption: "The court is displeased",
    judge: "disapprove",
    plaintiff: "agree",
    defendant: "deny",
  },
  {
    id: "defendant-opening",
    duration: 5.5,
    view: "defendant",
    speaker: "defendant",
    line: "I ate it. I regret only that there was not more of it.",
    caption: "The defendant answers",
    judge: "listen-right",
    plaintiff: "deny",
    defendant: "speak",
  },
  {
    id: "rebuttal",
    duration: 5.5,
    view: "plaintiff",
    speaker: "plaintiff",
    line: "That was fourteen dollars of pad thai. I had plans for it.",
    caption: "The plaintiff replies",
    judge: "listen-left",
    plaintiff: "speak",
    defendant: "listen",
  },
  {
    id: "deliberation",
    duration: 5,
    view: "judge",
    speaker: null,
    caption: "The court considers the matter",
    judge: "think",
    plaintiff: "listen",
    defendant: "listen",
  },
  {
    id: "verdict",
    duration: 7.5,
    view: "judge",
    speaker: "judge",
    line: "Judgment for the plaintiff. One replacement pad thai, and a written apology. In cursive.",
    caption: "The verdict",
    judge: "speak",
    plaintiff: "listen",
    defendant: "listen",
  },
  {
    id: "adjourned",
    duration: 3.5,
    view: "judge",
    speaker: "judge",
    line: "This court is adjourned.",
    caption: "Adjourned",
    judge: "gavel",
    plaintiff: "agree",
    defendant: "deny",
  },
  {
    id: "reactions",
    duration: 6,
    view: "wide",
    speaker: null,
    caption: "One party is delighted",
    judge: "idle",
    plaintiff: "triumphant",
    defendant: "dejected",
  },
];

export const HEARING_DURATION = HEARING.reduce((total, beat) => total + beat.duration, 0);

export function hearingBeatStart(index: number) {
  return HEARING.slice(0, index).reduce((total, beat) => total + beat.duration, 0);
}

export function hearingBeatAt(elapsed: number) {
  const time = Math.max(0, elapsed);
  let start = 0;
  for (let index = 0; index < HEARING.length; index++) {
    const beat = HEARING[index];
    if (time < start + beat.duration) return { index, beat, start, offset: time - start };
    start += beat.duration;
  }
  const index = HEARING.length - 1;
  const beat = HEARING[index];
  return { index, beat, start: start - beat.duration, offset: beat.duration };
}

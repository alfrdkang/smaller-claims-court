import { Vector3 } from "three";

export const JUDGE_MOTIONS = [
  { id: "idle", label: "At ease", duration: 6 },
  { id: "listen-left", label: "Listen · plaintiff", duration: 3.6 },
  { id: "listen-right", label: "Listen · defendant", duration: 3.6 },
  { id: "think", label: "Consider", duration: 4.5 },
  { id: "speak", label: "Address the court", duration: 4.8 },
  { id: "nod", label: "Approve", duration: 2.4 },
  { id: "disapprove", label: "Disapprove", duration: 2.6 },
  { id: "gavel", label: "Order!", duration: 2.2 },
] as const;

export type JudgeMotion = (typeof JUDGE_MOTIONS)[number]["id"];
export type Point = [number, number, number];
export type JudgePose = {
  head: Point;
  leftHand: Point;
  rightHand: Point;
  gavelPitch: number;
  breath: number;
  eyes: number;
  mouth: number;
  brow: number;
};

export const GAVEL_BLOCK: Point = [0.46, 1.82, -2.48];
export const GAVEL_BLOCK_TOP = 1.925;
export const GAVEL_RADIUS = 0.1;
const RIGHT_REST: Point = [0.46, GAVEL_BLOCK_TOP + GAVEL_RADIUS, -2.86];
const LEFT_REST: Point = [-0.46, 1.98, -2.98];

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function gesture(time: number, duration: number) {
  return smooth(time / 0.55) * smooth((duration - time) / 0.6);
}

export function sampleJudgePose(motion: JudgeMotion, elapsed: number, reducedMotion: boolean): JudgePose {
  const duration = JUDGE_MOTIONS.find((item) => item.id === motion)!.duration;
  const time = reducedMotion ? (motion === "idle" ? 0 : 0.8) : Math.max(0, elapsed);
  const amount = motion === "idle" ? 0 : gesture(time, duration);
  const pose: JudgePose = {
    head: [0, 0, 0],
    leftHand: [...LEFT_REST],
    rightHand: [...RIGHT_REST],
    gavelPitch: 0,
    breath: reducedMotion ? 0 : Math.sin(time * 1.65) * 0.004,
    eyes: reducedMotion ? 1 : 1 - Math.max(0, 1 - Math.abs((time % 4.7) - 3.9) / 0.11) * 0.94,
    mouth: 0,
    brow: 0,
  };
  if (amount === 0) return pose;
  if (motion === "listen-left" || motion === "listen-right") {
    pose.head = [0.035 * amount, (motion === "listen-left" ? -0.36 : 0.36) * amount, -0.035 * amount];
  } else if (motion === "think") {
    pose.head = [0.1 * amount, -0.1 * amount, 0.04 * amount];
    pose.leftHand = LEFT_REST.map((value, i) => value + ([-0.31, 2.3, -2.84][i] - value) * amount) as Point;
    pose.brow = 0.06 * amount;
  } else if (motion === "speak") {
    pose.head = [Math.sin(time * 3.2) * 0.035 * amount, Math.sin(time * 1.8) * 0.1 * amount, 0];
    pose.leftHand[0] -= 0.1 * amount;
    pose.leftHand[1] += (0.14 + 0.06 * Math.sin(time * 4)) * amount;
    pose.leftHand[2] -= 0.04 * amount;
    pose.mouth = (0.3 + 0.7 * Math.abs(Math.sin(time * 8.5))) * amount;
  } else if (motion === "nod") {
    pose.head[0] = (0.08 + Math.sin(time * 6) * 0.13) * amount;
    pose.brow = -0.025 * amount;
  } else if (motion === "disapprove") {
    pose.head[1] = Math.sin(time * 6) * 0.19 * amount;
    pose.head[0] = -0.025 * amount;
    pose.brow = 0.12 * amount;
  } else if (motion === "gavel") {
    const keys = [
      [0, 0, 0, 0],
      [0.42, 0.3, -0.08, -0.8],
      [0.8, 0.38, -0.1, -1.05],
      [1.05, 0, 0, 0],
      [1.15, 0.09, -0.025, -0.2],
      [1.42, 0, 0, 0],
      [2.2, 0, 0, 0],
    ];
    const nextIndex = keys.findIndex((key) => key[0] > time);
    if (nextIndex > 0) {
      const previous = keys[nextIndex - 1];
      const next = keys[nextIndex];
      const progress = (time - previous[0]) / (next[0] - previous[0]);
      const blend = nextIndex === 3 ? progress * progress : smooth(progress);
      const values = previous.map((value, i) => value + (next[i] - value) * blend);
      pose.rightHand[1] += values[1];
      pose.rightHand[2] += values[2];
      pose.gavelPitch = values[3];
    }
    pose.head[0] = 0.06 * amount;
    pose.brow = 0.07 * amount;
  }
  return pose;
}

export function blendJudgePose(from: JudgePose, to: JudgePose, progress: number): JudgePose {
  const alpha = smooth(progress);
  const mix = (a: number, b: number) => a + (b - a) * alpha;
  const point = (a: Point, b: Point) => a.map((value, i) => mix(value, b[i])) as Point;
  return {
    head: point(from.head, to.head),
    leftHand: point(from.leftHand, to.leftHand),
    rightHand: point(from.rightHand, to.rightHand),
    gavelPitch: mix(from.gavelPitch, to.gavelPitch),
    breath: mix(from.breath, to.breath),
    eyes: mix(from.eyes, to.eyes),
    mouth: mix(from.mouth, to.mouth),
    brow: mix(from.brow, to.brow),
  };
}

export function solveElbow(shoulder: Vector3, hand: Vector3, side: number) {
  const direction = hand.clone().sub(shoulder);
  const distance = direction.length();
  direction.normalize();
  const along = (0.36 ** 2 - 0.37 ** 2 + distance ** 2) / (2 * distance);
  const bend = new Vector3(side * 0.65, -1, 0);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  return shoulder.clone().addScaledVector(direction, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, 0.36 ** 2 - along ** 2)));
}

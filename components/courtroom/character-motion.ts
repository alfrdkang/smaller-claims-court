import { Euler, Quaternion, Vector3 } from "three";

export const CHARACTER_MOTIONS = [
  { id: "idle", label: "At ease", duration: 6, loop: true },
  { id: "listen", label: "Listening", duration: 5, loop: true },
  { id: "speak", label: "Speaking", duration: 5, loop: true },
  { id: "object", label: "Objection", duration: 2.4, loop: false },
  { id: "agree", label: "Agreeing", duration: 2.2, loop: false },
  { id: "deny", label: "Denying", duration: 2.4, loop: false },
  { id: "dejected", label: "Dejected", duration: 5, loop: true },
  { id: "triumphant", label: "Vindicated", duration: 4, loop: true },
] as const;

export type CharacterMotion = (typeof CHARACTER_MOTIONS)[number]["id"];
export type Point = [number, number, number];
export type CharacterPose = {
  root: Point;
  torso: Point;
  head: Point;
  armLeft: Point;
  armRight: Point;
  legLeft: Point;
  legRight: Point;
};

export const CHARACTER_RIG = {
  height: 2.7,
  headSize: 0.8,
  torsoPivot: [0, 0.7, 0] as Point,
  headPivot: [0, 1.2, 0] as Point,
  armPivot: [0.4, 1.1, -0.1] as Point,
  legPivot: [0.2, 1, 0] as Point,
  armLength: 1,
  legLength: 1,
  torsoHalf: [0.4, 0.45, 0.3] as Point,
};

const REST: CharacterPose = {
  root: [0, 0, 0],
  torso: [0, 0, 0],
  head: [0, 0, 0],
  armLeft: [0, 0, 0],
  armRight: [0, 0, 0],
  legLeft: [0, 0, 0],
  legRight: [0, 0, 0],
};

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function gesture(time: number, duration: number) {
  return smooth(time / 0.4) * smooth((duration - time) / 0.5);
}

function rest(): CharacterPose {
  return {
    root: [...REST.root],
    torso: [...REST.torso],
    head: [...REST.head],
    armLeft: [...REST.armLeft],
    armRight: [...REST.armRight],
    legLeft: [...REST.legLeft],
    legRight: [...REST.legRight],
  };
}

export function sampleCharacterPose(
  motion: CharacterMotion,
  elapsed: number,
  reducedMotion: boolean,
  side: -1 | 1,
): CharacterPose {
  const entry = CHARACTER_MOTIONS.find((item) => item.id === motion)!;
  const time = reducedMotion ? 1 : Math.max(0, elapsed);
  const amount = entry.loop ? smooth(time / 0.4) : gesture(time, entry.duration);
  const pose = rest();
  const breath = reducedMotion ? 0 : Math.sin(time * 1.7) * 0.014;
  const inward = -side;
  pose.torso[0] = breath;
  pose.armLeft[2] = 0.07;
  pose.armRight[2] = -0.07;
  if (amount === 0) return pose;
  if (motion === "idle") {
    const sway = reducedMotion ? 0 : Math.sin(time * 0.62);
    pose.torso[1] = sway * 0.06 * amount;
    pose.head[1] = sway * 0.16 * amount;
    pose.head[0] = (reducedMotion ? 0 : Math.sin(time * 0.9)) * 0.03 * amount;
    pose.armLeft[0] = (reducedMotion ? 0 : Math.sin(time * 0.62)) * 0.05 * amount;
    pose.armRight[0] = -pose.armLeft[0];
  } else if (motion === "listen") {
    pose.torso[1] = inward * 0.1 * amount;
    pose.head[1] = inward * 0.34 * amount;
    pose.head[0] = 0.06 * amount;
    pose.armLeft[0] = -0.12 * amount;
    pose.armRight[0] = -0.12 * amount;
    pose.armLeft[2] = 0.07 + 0.05 * amount;
    pose.armRight[2] = -0.07 - 0.05 * amount;
  } else if (motion === "speak") {
    const beat = reducedMotion ? 0 : Math.sin(time * 2.6);
    const lift = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 2.2);
    pose.torso[1] = inward * 0.06 * amount;
    pose.head[1] = (inward * 0.12 + beat * 0.1) * amount;
    pose.head[0] = beat * 0.06 * amount;
    const gesturing = side === -1 ? "armLeft" : "armRight";
    pose[gesturing][0] = -(0.55 + lift * 0.5) * amount;
    pose[gesturing][2] = side === -1 ? (0.07 + 0.32 * lift) * amount : -(0.07 + 0.32 * lift) * amount;
    pose[gesturing][1] = -side * 0.25 * amount;
    const resting = side === -1 ? "armRight" : "armLeft";
    pose[resting][0] = -0.16 * amount;
  } else if (motion === "object") {
    const raised = side === -1 ? "armLeft" : "armRight";
    pose[raised][0] = -2.35 * amount;
    pose[raised][2] = side === -1 ? 0.3 * amount : -0.3 * amount;
    pose.torso[0] = breath - 0.1 * amount;
    pose.torso[1] = inward * 0.14 * amount;
    pose.head[0] = -0.16 * amount;
    pose.head[1] = inward * 0.2 * amount;
  } else if (motion === "agree") {
    pose.head[0] = (0.1 + Math.sin(time * 6.4) * 0.16) * amount;
    pose.torso[0] = breath + 0.04 * amount;
  } else if (motion === "deny") {
    pose.head[1] = Math.sin(time * 6.8) * 0.34 * amount;
    pose.head[0] = -0.05 * amount;
    pose.armLeft[2] = 0.07 + 0.12 * amount;
    pose.armRight[2] = -0.07 - 0.12 * amount;
  } else if (motion === "dejected") {
    const sag = reducedMotion ? 0 : Math.sin(time * 0.8) * 0.02;
    pose.torso[0] = breath + (0.13 + sag) * amount;
    pose.head[0] = (0.2 + sag) * amount;
    pose.head[1] = inward * 0.12 * amount;
    pose.armLeft[0] = -0.1 * amount;
    pose.armRight[0] = -0.1 * amount;
    pose.armLeft[2] = 0.07 - 0.05 * amount;
    pose.armRight[2] = -0.07 + 0.05 * amount;
    pose.root[1] = -0.03 * amount;
  } else if (motion === "triumphant") {
    const bounce = reducedMotion ? 0 : Math.abs(Math.sin(time * 3.1));
    pose.armLeft[2] = (0.07 + 2.9 * amount) + bounce * 0.08 * amount;
    pose.armRight[2] = (-0.07 - 2.9 * amount) - bounce * 0.08 * amount;
    pose.head[0] = -0.2 * amount;
    pose.torso[0] = breath - 0.08 * amount;
    pose.root[1] = bounce * 0.09 * amount;
  }
  return pose;
}

export function blendCharacterPose(
  from: CharacterPose,
  to: CharacterPose,
  progress: number,
): CharacterPose {
  const alpha = smooth(progress);
  const mix = (a: number, b: number) => a + (b - a) * alpha;
  const point = (a: Point, b: Point) => a.map((value, i) => mix(value, b[i])) as Point;
  return {
    root: point(from.root, to.root),
    torso: point(from.torso, to.torso),
    head: point(from.head, to.head),
    armLeft: point(from.armLeft, to.armLeft),
    armRight: point(from.armRight, to.armRight),
    legLeft: point(from.legLeft, to.legLeft),
    legRight: point(from.legRight, to.legRight),
  };
}

function turn(euler: Point) {
  return new Quaternion().setFromEuler(new Euler(...euler));
}

export function characterJoints(pose: CharacterPose) {
  const root = new Vector3(...pose.root);
  const torsoQ = turn(pose.torso);
  const torsoPivot = new Vector3(...CHARACTER_RIG.torsoPivot).add(root);
  const headQ = torsoQ.clone().multiply(turn(pose.head));
  const headPivot = new Vector3(...CHARACTER_RIG.headPivot).applyQuaternion(torsoQ).add(torsoPivot);
  const arm = (offset: Point, rotation: Point) => {
    const pivot = new Vector3(...offset).applyQuaternion(torsoQ).add(torsoPivot);
    const direction = new Vector3(0, -CHARACTER_RIG.armLength, 0)
      .applyQuaternion(torsoQ.clone().multiply(turn(rotation)));
    return { pivot, hand: pivot.clone().add(direction) };
  };
  const leg = (offset: Point, rotation: Point) => {
    const pivot = new Vector3(...offset).add(root);
    return pivot.clone().add(new Vector3(0, -CHARACTER_RIG.legLength, 0).applyQuaternion(turn(rotation)));
  };
  const [ax, ay, az] = CHARACTER_RIG.armPivot;
  const [lx, ly, lz] = CHARACTER_RIG.legPivot;
  return {
    torsoPivot,
    headPivot,
    headTop: headPivot.clone().add(new Vector3(0, CHARACTER_RIG.headSize, 0).applyQuaternion(headQ)),
    left: arm([ax, ay, az], pose.armLeft),
    right: arm([-ax, ay, az], pose.armRight),
    footLeft: leg([lx, ly, lz], pose.legLeft),
    footRight: leg([-lx, ly, lz], pose.legRight),
  };
}

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHARACTER_MOTIONS,
  CHARACTER_RIG,
  characterJoints,
  sampleCharacterPose,
  type CharacterPose,
} from "./character-motion";

const SIDES = [-1, 1] as const;

test("one-shot motions start and finish in the resting stance", () => {
  for (const side of SIDES) {
    const rest = sampleCharacterPose("idle", 0, false, side);
    for (const motion of CHARACTER_MOTIONS.filter((item) => !item.loop)) {
      for (const time of [0, motion.duration + 1]) {
        const pose = sampleCharacterPose(motion.id, time, false, side);
        assert.deepEqual(pose.head, rest.head, `${motion.id} head at ${time}`);
        assert.deepEqual(pose.armLeft, rest.armLeft, `${motion.id} left arm at ${time}`);
        assert.deepEqual(pose.armRight, rest.armRight, `${motion.id} right arm at ${time}`);
      }
    }
  }
});

test("reduced motion holds one still pose whatever the elapsed time", () => {
  for (const side of SIDES) {
    for (const motion of CHARACTER_MOTIONS) {
      assert.deepEqual(
        sampleCharacterPose(motion.id, 0, true, side),
        sampleCharacterPose(motion.id, 100, true, side),
        motion.id,
      );
    }
  }
});

test("both feet stay on the floor in every motion", () => {
  for (const side of SIDES) {
    for (const motion of CHARACTER_MOTIONS) {
      for (let time = 0; time <= motion.duration; time += 0.05) {
        const joints = characterJoints(sampleCharacterPose(motion.id, time, false, side));
        for (const foot of [joints.footLeft, joints.footRight]) {
          assert.ok(
            Math.abs(foot.y) < 0.12,
            `${motion.id} foot left the floor at ${time.toFixed(2)}s: ${foot.y.toFixed(3)}`,
          );
        }
      }
    }
  }
});

test("hands never enter the torso", () => {
  const [hx, hy, hz] = CHARACTER_RIG.torsoHalf;
  for (const side of SIDES) {
    for (const motion of CHARACTER_MOTIONS) {
      for (let time = 0; time <= motion.duration; time += 0.05) {
        const pose = sampleCharacterPose(motion.id, time, false, side);
        const joints = characterJoints(pose);
        const centre = joints.torsoPivot.clone().setY(joints.torsoPivot.y + 0.75);
        for (const hand of [joints.left.hand, joints.right.hand]) {
          const inside =
            Math.abs(hand.x - centre.x) < hx &&
            Math.abs(hand.y - centre.y) < hy &&
            Math.abs(hand.z - centre.z) < hz;
          assert.ok(!inside, `${motion.id} hand inside the torso at ${time.toFixed(2)}s`);
        }
      }
    }
  }
});

test("listening turns the head toward the middle of the room", () => {
  assert.ok(sampleCharacterPose("listen", 2, false, -1).head[1] > 0.2);
  assert.ok(sampleCharacterPose("listen", 2, false, 1).head[1] < -0.2);
});

test("the raised arm in an objection goes above the shoulder", () => {
  for (const side of SIDES) {
    const joints = characterJoints(sampleCharacterPose("object", 1.2, false, side));
    const arm = side === -1 ? joints.left : joints.right;
    assert.ok(arm.hand.y > arm.pivot.y + 0.5, `objection arm stayed low on side ${side}`);
  }
});

test("a vindicated character raises both hands over the head", () => {
  for (const side of SIDES) {
    const pose = sampleCharacterPose("triumphant", 2, false, side);
    const joints = characterJoints(pose);
    for (const hand of [joints.left.hand, joints.right.hand]) {
      assert.ok(hand.y > joints.headPivot.y, "hand stayed below the head");
    }
  }
});

test("a dejected character drops the head below the standing height", () => {
  const upright = characterJoints(sampleCharacterPose("idle", 0, true, -1));
  const slumped = characterJoints(sampleCharacterPose("dejected", 2.5, false, -1));
  assert.ok(slumped.headTop.y < upright.headTop.y - 0.06);
});

test("no motion twists a joint past a believable angle", () => {
  const limits: Record<keyof CharacterPose, number> = {
    root: 0.2,
    torso: 0.5,
    head: 0.6,
    armLeft: 3.05,
    armRight: 3.05,
    legLeft: 0.5,
    legRight: 0.5,
  };
  for (const side of SIDES) {
    for (const motion of CHARACTER_MOTIONS) {
      for (let time = 0; time <= motion.duration; time += 0.05) {
        const pose = sampleCharacterPose(motion.id, time, false, side);
        for (const joint of Object.keys(limits) as (keyof CharacterPose)[]) {
          for (const value of pose[joint]) {
            assert.ok(
              Math.abs(value) <= limits[joint],
              `${motion.id} ${joint} reached ${value.toFixed(2)} at ${time.toFixed(2)}s`,
            );
          }
        }
      }
    }
  }
});

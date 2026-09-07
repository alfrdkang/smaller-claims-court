import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, Mesh, Vector3 } from "three";
import { JUDGE_MOTIONS, sampleJudgePose, solveElbow } from "./judge-motion";
import { createJudgeModel, applyJudgePose, disposeJudgeModel } from "./judge-model";

test("finite gestures return hands and head to the seated rest pose", () => {
  const rest = sampleJudgePose("idle", 0, false);
  for (const motion of JUDGE_MOTIONS.filter((item) => item.id !== "idle")) {
    const end = sampleJudgePose(motion.id, motion.duration + 1, false);
    assert.deepEqual(end.rightHand, rest.rightHand);
    assert.deepEqual(end.leftHand, rest.leftHand);
    assert.deepEqual(end.head, rest.head);
    assert.equal(end.gavelPitch, 0);
  }
});

test("listening turns toward the respective lectern", () => {
  assert.ok(sampleJudgePose("listen-left", 1, false).head[1] < -0.15);
  assert.ok(sampleJudgePose("listen-right", 1, false).head[1] > 0.15);
});

test("reduced motion produces a static pose regardless of elapsed time", () => {
  for (const motion of JUDGE_MOTIONS) {
    assert.deepEqual(sampleJudgePose(motion.id, 0, true), sampleJudgePose(motion.id, 100, true));
  }
});

test("gavel has anticipation, an exact impact pose, recoil and a settled finish", () => {
  const rest = sampleJudgePose("idle", 0, false);
  assert.ok(sampleJudgePose("gavel", 0.8, false).rightHand[1] > rest.rightHand[1] + 0.25);
  assert.deepEqual(sampleJudgePose("gavel", 1.05, false).rightHand, rest.rightHand);
  assert.equal(sampleJudgePose("gavel", 1.05, false).gavelPitch, 0);
  assert.ok(sampleJudgePose("gavel", 1.15, false).rightHand[1] > rest.rightHand[1]);
});

test("arm solver preserves segment lengths throughout every gesture", () => {
  for (const motion of JUDGE_MOTIONS) {
    for (let time = 0; time <= motion.duration; time += 0.025) {
      const pose = sampleJudgePose(motion.id, time, false);
      for (const side of [-1, 1]) {
        const shoulder = new Vector3(side * 0.43, 2.24 + pose.breath, -3.43);
        const hand = new Vector3(...(side === 1 ? pose.rightHand : pose.leftHand));
        const elbow = solveElbow(shoulder, hand, side);
        assert.ok(Math.abs(shoulder.distanceTo(elbow) - 0.36) < 0.00001);
        assert.ok(Math.abs(hand.distanceTo(elbow) - 0.37) < 0.00001);
        assert.ok(elbow.toArray().every(Number.isFinite));
      }
    }
  }
});

test("rendered gavel touches the block at impact without penetrating it along the strike", () => {
  const model = createJudgeModel();
  try {
    for (let frame = 0; frame <= 220; frame++) {
      applyJudgePose(model, sampleJudgePose("gavel", frame / 100, false));
      model.root.updateMatrixWorld(true);
      const head = new Box3().setFromObject(model.gavelHead);
      assert.ok(head.min.y >= 1.925 - 0.00001, `penetration at ${frame / 100}`);
      if (frame === 105) {
        assert.ok(Math.abs(head.min.y - 1.925) < 0.00001);
        const center = head.getCenter(new Vector3());
        assert.ok(Math.abs(center.x - 0.46) < 0.00001);
        assert.ok(Math.abs(center.z + 2.48) < 0.00001);
      }
    }
  } finally {
    disposeJudgeModel(model);
  }
});

test("judge stays seated with planted feet and knees behind the solid bench", () => {
  const model = createJudgeModel();
  try {
    for (const motion of JUDGE_MOTIONS) {
      applyJudgePose(model, sampleJudgePose(motion.id, 0.8, false));
      model.root.updateMatrixWorld(true);
      const lap = new Box3().setFromObject(model.lap);
      assert.ok(lap.min.y >= 1.46 - 0.00001);
      assert.ok(lap.max.z < -2.755);
      for (const foot of model.feet) {
        const bounds = new Box3().setFromObject(foot);
        assert.ok(Math.abs(bounds.min.y - 0.49) < 0.00001);
        assert.ok(bounds.max.z < -2.755);
      }
    }
  } finally {
    disposeJudgeModel(model);
  }
});

test("blink closes the whole eye, not just its pupil", () => {
  const model = createJudgeModel();
  try {
    applyJudgePose(model, sampleJudgePose("idle", 0, false));
    model.root.updateMatrixWorld(true);
    const open = new Box3().setFromObject(model.eyes[0]).getSize(new Vector3()).y;
    applyJudgePose(model, sampleJudgePose("idle", 3.9, false));
    model.root.updateMatrixWorld(true);
    const closed = new Box3().setFromObject(model.eyes[0]).getSize(new Vector3()).y;
    assert.ok(closed < open * 0.1);
    assert.ok(model.eyes[0].children.length >= 2, "eye closure must include sclera and pupil");
  } finally {
    disposeJudgeModel(model);
  }
});

test("thinking hand remains in front of the face instead of entering the cheek", () => {
  const model = createJudgeModel();
  try {
    applyJudgePose(model, sampleJudgePose("think", 0.8, false));
    model.root.updateMatrixWorld(true);
    const hand = new Box3().setFromObject(model.arms[0].hand);
    const face = new Box3().setFromObject(model.head.children[0]);
    assert.ok(!hand.intersectsBox(face));
  } finally {
    disposeJudgeModel(model);
  }
});

test("no arm bone passes through the head during any motion", () => {
  const model = createJudgeModel();
  try {
    model.root.updateMatrixWorld(true);
    const skull = model.head.children[0] as Mesh;
    skull.geometry.computeBoundingBox();
    const face = skull.geometry.boundingBox!.clone().applyMatrix4(skull.matrix);
    for (const motion of JUDGE_MOTIONS) {
      for (let time = 0; time <= motion.duration; time += 0.02) {
        const pose = sampleJudgePose(motion.id, time, false);
        applyJudgePose(model, pose);
        model.root.updateMatrixWorld(true);
        const toHead = model.head.matrixWorld.clone().invert();
        for (const side of [-1, 1]) {
          const shoulder = new Vector3(side * 0.43, 2.24 + pose.breath, -3.43);
          const hand = new Vector3(...(side === 1 ? pose.rightHand : pose.leftHand));
          const elbow = solveElbow(shoulder, hand, side);
          for (let step = 0; step <= 40; step++) {
            for (const bone of [shoulder.clone().lerp(elbow, step / 40), elbow.clone().lerp(hand, step / 40)]) {
              const point = bone.applyMatrix4(toHead);
              assert.ok(
                face.clampPoint(point, new Vector3()).distanceTo(point) >= 0.1,
                `${motion.id} arm ${side} enters the head at ${time.toFixed(2)}s`,
              );
            }
          }
        }
      }
    }
  } finally {
    disposeJudgeModel(model);
  }
});

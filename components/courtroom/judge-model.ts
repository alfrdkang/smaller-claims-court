import * as THREE from "three";
import { type JudgePose, type Point, GAVEL_RADIUS, sampleJudgePose, solveElbow } from "./judge-motion";

const ROBE = "#292d32";
const FOLD = "#383d43";
const SKIN = "#bb825e";
const HAIR = "#c8c5b9";
const IVORY = "#f3e8d1";
const BRASS = "#ac8547";

export function createJudgeModel() {
  const root = new THREE.Group();
  root.name = "CanonJudge";
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string) {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshStandardMaterial({
        color, roughness: color === BRASS ? 0.4 : 0.82, metalness: color === BRASS ? 0.5 : 0,
      }));
    }
    return materials.get(color)!;
  }
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, position: Point) {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent: THREE.Object3D, size: Point, position: Point, color: string) {
    return mesh(parent, new THREE.BoxGeometry(...size), color, position);
  }

  const lap = box(root, [0.66, 0.2, 0.67], [0, 1.56, -3.32], ROBE);
  const feet = [-1, 1].map((side) => {
    box(root, [0.25, 0.96, 0.23], [side * 0.185, 1.08, -3.08], ROBE);
    box(root, [0.032, 0.79, 0.015], [side * 0.185, 1.09, -2.957], FOLD);
    return box(root, [0.27, 0.15, 0.38], [side * 0.185, 0.565, -3.035], "#242323");
  });
  const torso = new THREE.Group();
  root.add(torso);
  torso.position.set(0, 1.91, -3.4);
  box(torso, [0.68, 0.68, 0.48], [0, 0, 0], ROBE);
  box(torso, [0.56, 0.06, 0.5], [0, 0.32, 0], FOLD);
  for (const side of [-1, 1]) {
    box(torso, [0.085, 0.57, 0.025], [side * 0.25, -0.025, 0.25], FOLD);
    const lapel = box(torso, [0.125, 0.34, 0.04], [side * 0.115, 0.165, 0.257], "#202429");
    lapel.rotation.z = side * -0.14;
    const tab = box(torso, [0.085, 0.23, 0.025], [side * 0.049, 0.18, 0.287], IVORY);
    tab.rotation.z = side * 0.055;
  }
  box(torso, [0.23, 0.1, 0.25], [0, 0.37, 0.02], SKIN);
  box(torso, [0.29, 0.07, 0.29], [0, 0.335, 0.025], IVORY);

  const head = new THREE.Group();
  root.add(head);
  head.position.set(0, 2.29, -3.3);
  box(head, [0.6, 0.62, 0.53], [0, 0.35, 0], SKIN);
  box(head, [0.63, 0.13, 0.56], [0, 0.65, -0.005], HAIR);
  box(head, [0.48, 0.045, 0.5], [-0.045, 0.734, -0.03], "#d8d4c8");
  box(head, [0.58, 0.38, 0.035], [0, 0.4, -0.28], HAIR);
  const eyes: THREE.Group[] = [];
  const brows: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    box(head, [0.065, 0.3, 0.42], [side * 0.29, 0.45, -0.065], HAIR);
    box(head, [0.06, 0.12, 0.1], [side * 0.318, 0.3, 0.02], SKIN);
    const eye = new THREE.Group();
    eye.position.set(side * 0.14, 0.395, 0.273);
    head.add(eye);
    box(eye, [0.115, 0.074, 0.014], [0, 0, 0], IVORY);
    box(eye, [0.038, 0.057, 0.02], [0, -0.002, 0.012], "#34302c");
    eyes.push(eye);
    const brow = box(head, [0.13, 0.032, 0.028], [side * 0.14, 0.5, 0.283], HAIR);
    brows.push(brow);
    mesh(head, new THREE.TorusGeometry(0.099, 0.012, 6, 16), BRASS, [side * 0.14, 0.39, 0.308]);
    box(head, [0.012, 0.018, 0.26], [side * 0.247, 0.413, 0.16], BRASS);
    box(head, [0.07, 0.014, 0.015], [side * 0.19, 0.26, 0.274], "#a66e50");
  }
  box(head, [0.08, 0.095, 0.055], [0, 0.31, 0.29], "#c48e68");
  box(head, [0.07, 0.017, 0.015], [0, 0.395, 0.313], BRASS);
  const mouth = box(head, [0.115, 0.018, 0.016], [0, 0.185, 0.274], "#6b4638");
  box(head, [0.11, 0.02, 0.02], [0, 0.135, 0.275], "#ca9470");

  const arms = [-1, 1].map((side) => {
    const upper = box(root, [0.23, 1, 0.24], [0, 0, 0], ROBE);
    const lower = box(root, [0.22, 1, 0.23], [0, 0, 0], FOLD);
    const cuff = box(root, [0.18, 0.07, 0.18], [0, 0, 0], IVORY);
    const hand = new THREE.Group();
    root.add(hand);
    box(hand, [0.145, 0.135, 0.17], [0, 0, 0], SKIN);
    box(hand, [0.055, 0.075, 0.09], [side * -0.079, -0.012, 0.025], "#c48e68");
    return { side, upper, lower, cuff, hand };
  });
  const gavel = new THREE.Group();
  gavel.name = "HeldGavel";
  arms[1].hand.add(gavel);
  const handle = mesh(gavel, new THREE.CylinderGeometry(0.028, 0.034, 0.48, 12), "#65412e", [0, 0, 0.14]);
  handle.rotation.x = Math.PI / 2;
  const gavelHead = mesh(gavel, new THREE.CylinderGeometry(GAVEL_RADIUS, GAVEL_RADIUS, 0.28, 16), "#7f4f32", [0, 0, 0.38]);
  gavelHead.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const band = mesh(gavel, new THREE.CylinderGeometry(0.099, 0.099, 0.023, 16), BRASS, [side * 0.097, 0, 0.38]);
    band.rotation.z = Math.PI / 2;
  }
  const model = { root, torso, head, lap, feet, eyes, brows, mouth, arms, gavelHead };
  applyJudgePose(model, sampleJudgePose("idle", 0, true));
  return model;
}

export type JudgeModel = ReturnType<typeof createJudgeModel>;
const UP = new THREE.Vector3(0, 1, 0);

export function applyJudgePose(model: JudgeModel, pose: JudgePose) {
  model.torso.position.y = 1.91 + pose.breath;
  model.head.position.y = 2.29 + pose.breath;
  model.head.rotation.set(...pose.head);
  model.eyes.forEach((eye) => { eye.scale.y = pose.eyes; });
  model.brows.forEach((brow, index) => { brow.rotation.z = (index === 0 ? -1 : 1) * pose.brow; });
  model.mouth.scale.y = 1 + pose.mouth * 3;
  for (const arm of model.arms) {
    const shoulder = new THREE.Vector3(arm.side * 0.43, 2.24 + pose.breath, -3.43);
    const hand = new THREE.Vector3(...(arm.side === 1 ? pose.rightHand : pose.leftHand));
    const elbow = solveElbow(shoulder, hand, arm.side);
    for (const [segment, start, end] of [
      [arm.upper, shoulder, elbow], [arm.lower, elbow, hand],
    ] as const) {
      const direction = end.clone().sub(start);
      segment.position.copy(start).add(end).multiplyScalar(0.5);
      segment.scale.y = direction.length();
      segment.quaternion.setFromUnitVectors(UP, direction.normalize());
    }
    arm.cuff.position.copy(hand).lerp(elbow, 0.16);
    arm.cuff.quaternion.copy(arm.lower.quaternion);
    arm.hand.position.copy(hand);
    arm.hand.rotation.x = arm.side === 1 ? pose.gavelPitch : -0.2;
  }
}

export function disposeJudgeModel(model: JudgeModel) {
  const materials = new Set<THREE.Material>();
  model.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((item) => materials.add(item));
    }
  });
  materials.forEach((material) => material.dispose());
}

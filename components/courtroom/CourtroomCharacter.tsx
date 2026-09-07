"use client";

import React from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  blendCharacterPose,
  sampleCharacterPose,
  type CharacterMotion,
  type CharacterPose,
  type Point,
} from "./character-motion";

export const CHARACTER_IDS = "abcdefghijklmnopqr".split("");
export type CharacterId = string;

export const CHARACTER_SCALE = 0.75;

export function characterUrl(id: CharacterId) {
  return `/characters/character-${id}.glb`;
}

const JOINTS = {
  torso: "torso",
  head: "head",
  armLeft: "arm-left",
  armRight: "arm-right",
  legLeft: "leg-left",
  legRight: "leg-right",
} as const;

type Joints = Record<keyof typeof JOINTS, THREE.Object3D>;

export function CourtroomCharacter({
  id,
  position,
  rotation,
  side,
  motion,
  take,
  paused,
  reducedMotion,
}: {
  id: CharacterId;
  position: Point;
  rotation: number;
  side: -1 | 1;
  motion: CharacterMotion;
  take: number;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const { scene } = useGLTF(characterUrl(id));
  const { invalidate } = useThree();
  const elapsed = React.useRef(0);
  const current = React.useRef<CharacterPose>(sampleCharacterPose("idle", 0, true, side));
  const previous = React.useRef(current.current);

  const model = React.useMemo(() => {
    const clone = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const source = object.material as THREE.MeshStandardMaterial;
      if (!materials.has(source)) {
        if (source.map) {
          source.map.magFilter = THREE.NearestFilter;
          source.map.minFilter = THREE.LinearMipmapLinearFilter;
        }
        materials.set(
          source,
          new THREE.MeshStandardMaterial({
            map: source.map,
            color: source.color,
            roughness: 0.86,
            metalness: 0,
          }),
        );
      }
      object.material = materials.get(source)!;
    });
    return { clone, materials: [...materials.values()] };
  }, [scene]);

  const joints = React.useMemo(() => {
    const found = {} as Joints;
    for (const [key, name] of Object.entries(JOINTS) as [keyof typeof JOINTS, string][]) {
      const node = model.clone.getObjectByName(name);
      if (node) found[key] = node;
    }
    return found;
  }, [model]);

  React.useEffect(() => () => model.materials.forEach((material) => material.dispose()), [model]);

  React.useLayoutEffect(() => {
    previous.current = current.current;
    elapsed.current = 0;
    invalidate();
  }, [motion, take, reducedMotion, invalidate]);

  React.useEffect(() => {
    invalidate();
  }, [paused, model, invalidate]);

  useFrame((_, delta) => {
    if (!joints.torso) return;
    if (!paused && !reducedMotion) elapsed.current += Math.min(delta, 0.05);
    const target = sampleCharacterPose(motion, elapsed.current, reducedMotion, side);
    const pose = reducedMotion
      ? target
      : blendCharacterPose(previous.current, target, elapsed.current / 0.3);
    current.current = pose;
    model.clone.position.set(...pose.root);
    joints.torso.rotation.set(...pose.torso);
    joints.head?.rotation.set(...pose.head);
    joints.armLeft?.rotation.set(...pose.armLeft);
    joints.armRight?.rotation.set(...pose.armRight);
    joints.legLeft?.rotation.set(...pose.legLeft);
    joints.legRight?.rotation.set(...pose.legRight);
    if (!paused && !reducedMotion) invalidate();
  });

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={CHARACTER_SCALE}>
      <primitive object={model.clone} dispose={null} />
    </group>
  );
}

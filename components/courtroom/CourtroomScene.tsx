"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox, useProgress } from "@react-three/drei";
import React from "react";
import * as THREE from "three";
import { CourtroomJudge, type JudgePerformance } from "./CourtroomJudge";
import { CourtroomCharacter, type CharacterId } from "./CourtroomCharacter";
import { GAVEL_BLOCK } from "./judge-motion";
import type { CharacterMotion } from "./character-motion";
import type { CourtroomView, HearingRole } from "./views";
import styles from "./courtroom.module.css";

export type { CourtroomView };
export type CastMember = { id: CharacterId; motion: CharacterMotion; take: number };
export type CourtroomCast = {
  plaintiff: CastMember;
  defendant: CastMember;
  paused: boolean;
  reducedMotion: boolean;
};
export type CourtroomSpeech = { role: HearingRole; text: string } | null;
export type LightingPreset = "day" | "golden" | "night";
type Point = [number, number, number];

const WOOD = "#865032";
const TRIM = "#b57b4b";
const DARK_WOOD = "#543b2d";
const GREEN = "#425c48";
const BRASS = "#c6a05d";
const PAPER = "#f5e9cb";

const LIGHTING = {
  day: {
    background: "#e9dfcf",
    ambient: 1.5,
    sun: "#fff0d5",
    intensity: 3.5,
    position: [-5, 10, 4] as Point,
    glass: "#d7e8d3",
  },
  golden: {
    background: "#e5c6a2",
    ambient: 1.1,
    sun: "#ffc080",
    intensity: 4,
    position: [-8, 6, 1] as Point,
    glass: "#f9cc8e",
  },
  night: {
    background: "#293b43",
    ambient: 0.65,
    sun: "#a9cbe6",
    intensity: 1.4,
    position: [4, 8, -2] as Point,
    glass: "#415e77",
  },
};

function Box({
  position,
  size,
  color = WOOD,
  rotation,
  rounded = false,
}: {
  position: Point;
  size: Point;
  color?: string;
  rotation?: Point;
  rounded?: boolean;
}) {
  const material = <meshStandardMaterial color={color} roughness={0.78} />;
  return rounded ? (
    <RoundedBox
      args={size}
      radius={0.04}
      smoothness={2}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      {material}
    </RoundedBox>
  ) : (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      {material}
    </mesh>
  );
}

function Cylinder({
  position,
  radius,
  height,
  color = BRASS,
  rotation,
  bottomRadius = radius,
}: {
  position: Point;
  radius: number;
  height: number;
  color?: string;
  rotation?: Point;
  bottomRadius?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[radius, bottomRadius, height, 24]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={color === BRASS ? 0.35 : 0} />
    </mesh>
  );
}

function Lettering({
  text,
  position,
  width,
  height,
  color = PAPER,
  background,
  fontSize = 54,
  rotation,
}: {
  text: string;
  position: Point;
  width: number;
  height: number;
  color?: string;
  background?: string;
  fontSize?: number;
  rotation?: Point;
}) {
  const texture = React.useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.max(64, Math.round((1024 * height) / width));
    const ctx = canvas.getContext("2d")!;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = color;
    ctx.font = `${Math.min(fontSize * 2, canvas.height * 0.65)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, canvas.height / 2, 980);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [text, color, background, fontSize, width, height]);
  React.useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Window({ x, lighting }: { x: number; lighting: LightingPreset }) {
  const arch = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.77, 0);
    shape.lineTo(0.77, 0);
    shape.lineTo(0.77, 1.5);
    shape.absarc(0, 1.5, 0.77, 0, Math.PI, false);
    shape.lineTo(-0.77, 0);
    return shape;
  }, []);
  return (
    <group position={[x, 2.05, -4.23]}>
      <mesh position={[0, -0.08, 0]} castShadow>
        <extrudeGeometry
          args={[
            arch,
            {
              depth: 0.1,
              bevelEnabled: true,
              bevelSize: 0.08,
              bevelThickness: 0.04,
              bevelSegments: 2,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh position={[0, 0, 0.19]} scale={[0.87, 0.93, 1]}>
        <shapeGeometry args={[arch]} />
        <meshStandardMaterial
          color={LIGHTING[lighting].glass}
          emissive={LIGHTING[lighting].glass}
          emissiveIntensity={lighting === "night" ? 0.25 : 0.5}
          roughness={0.3}
        />
      </mesh>
      <Box position={[0, 1.07, 0.23]} size={[0.055, 2.12, 0.07]} color={PAPER} />
      <Box position={[0, 0.7, 0.23]} size={[1.37, 0.055, 0.07]} color={PAPER} />
      <Box position={[0, 1.44, 0.23]} size={[1.37, 0.055, 0.07]} color={PAPER} />
      <Box position={[0, -0.03, 0.23]} size={[1.84, 0.14, 0.44]} color={PAPER} rounded />
    </group>
  );
}

function Seal() {
  return (
    <group position={[0, 3.67, -4.08]}>
      <Cylinder position={[0, 0, 0]} radius={0.85} height={0.12} rotation={[Math.PI / 2, 0, 0]} />
      <Cylinder
        position={[0, 0, 0.08]}
        radius={0.75}
        height={0.08}
        color={GREEN}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh position={[0, 0, 0.13]}>
        <torusGeometry args={[0.66, 0.012, 6, 64]} />
        <meshStandardMaterial color={BRASS} metalness={0.4} roughness={0.4} />
      </mesh>
      <Box position={[0, 0.03, 0.17]} size={[0.045, 0.64, 0.045]} color={BRASS} />
      <Box position={[0, 0.24, 0.17]} size={[0.75, 0.035, 0.035]} color={BRASS} />
      <Box position={[0, -0.33, 0.17]} size={[0.35, 0.04, 0.055]} color={BRASS} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box position={[side * 0.32, 0.06, 0.17]} size={[0.015, 0.32, 0.015]} color={BRASS} />
          <mesh position={[side * 0.32, -0.12, 0.18]} rotation={[0, 0, Math.PI]}>
            <sphereGeometry args={[0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={BRASS}
              metalness={0.3}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      <Lettering
        text="EST. 2026"
        position={[0, -0.52, 0.18]}
        width={0.75}
        height={0.18}
        fontSize={65}
      />
    </group>
  );
}

function Chair({
  position,
  judge = false,
  rotation = 0,
}: {
  position: Point;
  judge?: boolean;
  rotation?: number;
}) {
  const width = judge ? 1.25 : 0.9;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            position={[x * (width / 2 - 0.1), 0.37, z * 0.33]}
            size={[0.12, 0.74, 0.12]}
            color={DARK_WOOD}
          />
        )),
      )}
      <Box position={[0, 0.77, 0]} size={[width, 0.17, 0.89]} color={DARK_WOOD} rounded />
      <Box position={[0, 0.89, 0]} size={[width - 0.1, 0.16, 0.79]} color={GREEN} rounded />
      <Box
        position={[0, judge ? 1.52 : 1.33, -0.39]}
        size={[width, judge ? 1.38 : 0.94, 0.17]}
        color={DARK_WOOD}
        rounded
      />
      <Box
        position={[0, judge ? 1.52 : 1.33, -0.28]}
        size={[width - 0.2, judge ? 1.13 : 0.69, 0.13]}
        color={GREEN}
        rounded
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            position={[side * (width / 2 - 0.02), 1.02, 0.22]}
            size={[0.08, 0.45, 0.08]}
            color={DARK_WOOD}
          />
          <Box
            position={[side * (width / 2 - 0.02), 1.22, 0]}
            size={[0.15, 0.1, 0.9]}
            color={TRIM}
            rounded
          />
        </group>
      ))}
      {judge && (
        <>
          <Box position={[0, 2.24, -0.39]} size={[width + 0.12, 0.13, 0.23]} color={TRIM} rounded />
          <Cylinder
            position={[0, 1.86, -0.2]}
            radius={0.09}
            height={0.02}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </>
      )}
    </group>
  );
}

function Papers({
  position,
  rotation = 0,
  count = 3,
}: {
  position: Point;
  rotation?: number;
  count?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          position={[i * 0.014, i * 0.015, 0]}
          size={[0.43, 0.012, 0.6]}
          color={i % 2 ? "#e1d5b7" : PAPER}
          rotation={[0, i * 0.045, 0]}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          position={[0.03, count * 0.015, -0.15 + i * 0.075]}
          size={[i === 0 ? 0.17 : 0.28, 0.003, 0.012]}
          color={i === 0 ? "#716551" : "#b5aa90"}
        />
      ))}
    </group>
  );
}

function Lamp({ position, night }: { position: Point; night: boolean }) {
  return (
    <group position={position}>
      <Cylinder position={[0, 0.035, 0]} radius={0.17} height={0.07} />
      <Cylinder position={[0, 0.27, 0]} radius={0.025} height={0.48} />
      <Box position={[0, 0.49, 0.035]} size={[0.12, 0.035, 0.16]} color={BRASS} />
      <mesh position={[0, 0.52, 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.48, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color={GREEN}
          emissive="#f7c16e"
          emissiveIntensity={night ? 0.15 : 0}
          side={THREE.DoubleSide}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.48, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.22]} />
        <meshStandardMaterial
          color="#ffdfa0"
          emissive="#ffbd60"
          emissiveIntensity={night ? 3 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {night && (
        <pointLight
          position={[0, 0.42, 0.12]}
          intensity={4}
          color="#ffbb65"
          distance={3.5}
          decay={2}
        />
      )}
    </group>
  );
}

function GavelBlock() {
  return (
    <group position={GAVEL_BLOCK}>
      <Cylinder position={[0, 0.035, 0]} radius={0.24} height={0.07} color={DARK_WOOD} />
      <Cylinder position={[0, 0.0875, 0]} radius={0.2} height={0.035} color={TRIM} />
    </group>
  );
}

function JudgeBench({ night }: { night: boolean }) {
  return (
    <group>
      <Box position={[0, 0.2, -2.9]} size={[5.8, 0.4, 2.65]} color={DARK_WOOD} rounded />
      <Box position={[0, 0.43, -2.9]} size={[5.9, 0.1, 2.7]} color={TRIM} />
      <Box position={[0, 0.1, -1.28]} size={[3, 0.2, 0.62]} color={TRIM} rounded />
      <Box position={[0, 0.27, -1.48]} size={[2.75, 0.16, 0.4]} color={WOOD} rounded />
      <Chair position={[0, 0.49, -3.5]} judge />
      <Box position={[0, 1.08, -2.32]} size={[4.9, 1.18, 0.87]} />
      <Box position={[0, 1.73, -2.32]} size={[5.15, 0.18, 1.16]} color={DARK_WOOD} rounded />
      <Box position={[0, 1.58, -1.86]} size={[5, 0.11, 0.1]} color={TRIM} />
      <Box position={[0, 0.56, -1.85]} size={[5, 0.14, 0.13]} color={TRIM} />
      {[-1.8, -0.9, 0, 0.9, 1.8].map((x) => (
        <group key={x}>
          <Box position={[x, 1.07, -1.871]} size={[0.74, 0.76, 0.045]} color={DARK_WOOD} />
          <Box position={[x, 1.07, -1.835]} size={[0.62, 0.65, 0.04]} color={WOOD} />
        </group>
      ))}
      <Box position={[0, 1.32, -1.76]} size={[1.45, 0.28, 0.04]} color={BRASS} rounded />
      <Lettering
        text="THE HONOURABLE BENCH"
        position={[0, 1.32, -1.73]}
        width={1.36}
        height={0.27}
        color={DARK_WOOD}
        fontSize={65}
      />
      <Papers position={[-0.5, 1.83, -2.35]} rotation={-0.13} count={5} />
      <Lamp position={[-1.8, 1.83, -2.5]} night={night} />
      <GavelBlock />
      <Box position={[1.9, 1.88, -2.55]} size={[0.43, 0.1, 0.6]} color={GREEN} />
      <Box
        position={[1.9, 1.97, -2.53]}
        size={[0.4, 0.08, 0.56]}
        color="#9c563e"
        rotation={[0, -0.08, 0]}
      />
    </group>
  );
}

function Lectern({ x, label, night }: { x: number; label: string; night: boolean }) {
  return (
    <group position={[x, 0, 0.65]} rotation={[0, x < 0 ? -0.12 : 0.12, 0]}>
      <Box position={[0, 0.08, 0]} size={[1.6, 0.16, 1.05]} color={DARK_WOOD} rounded />
      <Box position={[0, 0.69, 0]} size={[1.34, 1.12, 0.83]} />
      <Box position={[0, 0.71, 0.429]} size={[1.04, 0.82, 0.04]} color={TRIM} />
      <Box position={[0, 0.71, 0.457]} size={[0.91, 0.69, 0.025]} color={WOOD} />
      <Box
        position={[0, 1.3, 0]}
        size={[1.65, 0.13, 1.08]}
        color={DARK_WOOD}
        rotation={[0.09, 0, 0]}
        rounded
      />
      <Box position={[0, 1.31, 0.49]} size={[1.58, 0.08, 0.07]} color={TRIM} />
      <Box position={[0, 1.03, 0.466]} size={[0.93, 0.2, 0.035]} color={BRASS} />
      <Lettering
        text={label}
        position={[0, 1.03, 0.49]}
        width={0.86}
        height={0.2}
        color={DARK_WOOD}
        fontSize={88}
      />
      <Papers position={[-0.22, 1.41, -0.04]} rotation={x < 0 ? 0.12 : -0.17} />
      <Cylinder position={[0.48, 1.41, -0.22]} radius={0.085} height={0.035} color={DARK_WOOD} />
      <Cylinder
        position={[0.48, 1.63, -0.22]}
        radius={0.013}
        height={0.43}
        color={DARK_WOOD}
        rotation={[-0.25, 0, 0]}
      />
      <mesh position={[0.48, 1.84, -0.16]} rotation={[0.45, 0, 0]}>
        <capsuleGeometry args={[0.035, 0.08, 4, 8]} />
        <meshStandardMaterial color="#2c302b" />
      </mesh>
      <Chair position={[0, 0, -1.62]} />
      {night && (
        <pointLight position={[0, 2.8, 0.6]} intensity={1.5} color="#ffce91" distance={4} />
      )}
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: Point; scale?: number }) {
  const rim = React.useMemo(
    () =>
      [
        [0.275, 0.48],
        [0.32, 0.48],
        [0.335, 0.5],
        [0.335, 0.54],
        [0.32, 0.56],
        [0.275, 0.56],
        [0.275, 0.48],
      ].map(([radius, height]) => new THREE.Vector2(radius, height)),
    [],
  );

  return (
    <group position={position} scale={scale}>
      <Cylinder
        position={[0, 0.25, 0]}
        radius={0.32}
        bottomRadius={0.23}
        height={0.5}
        color="#b67855"
      />
      <mesh castShadow receiveShadow>
        <latheGeometry args={[rim, 24]} />
        <meshStandardMaterial color="#cc9570" roughness={0.8} />
      </mesh>
      <Cylinder position={[0, 0.51, 0]} radius={0.275} height={0.02} color="#403c28" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const angle = i * 2.4;
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <Cylinder
              position={[0.13, 0.93 + (i % 3) * 0.13, 0]}
              radius={0.015}
              height={0.85 + (i % 3) * 0.26}
              color="#526142"
              rotation={[0, 0, -0.22]}
            />
            <mesh
              position={[0.25, 1.26 + (i % 3) * 0.14, 0]}
              rotation={[0, 0, -0.5]}
              scale={[0.2, 0.46, 0.09]}
              castShadow
            >
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial
                color={i % 2 ? "#627b4b" : "#405f45"}
                roughness={0.9}
                flatShading
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function GalleryBench({ x }: { x: number }) {
  return (
    <group position={[x, 0, 3.5]}>
      {[-0.85, 0.85].map((side) => (
        <Box key={side} position={[side, 0.33, 0]} size={[0.15, 0.65, 0.72]} color={DARK_WOOD} />
      ))}
      <Box position={[0, 0.64, 0]} size={[2.3, 0.17, 0.87]} color={TRIM} rounded />
      <Box position={[0, 0.76, 0]} size={[2.12, 0.11, 0.71]} color={GREEN} rounded />
      <Box position={[0, 1.05, 0.37]} size={[2.3, 0.72, 0.13]} color={WOOD} rounded />
      <Box position={[0, 1.07, 0.285]} size={[2.06, 0.43, 0.07]} color={GREEN} />
      <Box position={[0, 1.44, 0.37]} size={[2.4, 0.1, 0.19]} color={TRIM} rounded />
    </group>
  );
}

function EvidenceBoard({ night }: { night: boolean }) {
  return (
    <group position={[4.25, 0, -1.85]} rotation={[0, -0.25, 0]}>
      {[-0.52, 0.52].map((x) => (
        <Box key={x} position={[x, 0.86, 0]} size={[0.07, 1.7, 0.09]} color={DARK_WOOD} />
      ))}
      <Box position={[0, 1.86, 0]} size={[1.48, 1.55, 0.12]} color={TRIM} rounded />
      <Box position={[0, 1.86, 0.075]} size={[1.31, 1.38, 0.03]} color="#ab8d62" />
      <Lettering
        text="EXHIBIT A"
        position={[0, 2.4, 0.105]}
        width={1.1}
        height={0.18}
        fontSize={78}
        color={DARK_WOOD}
      />
      <Box
        position={[-0.19, 1.91, 0.12]}
        size={[0.55, 0.64, 0.012]}
        color={PAPER}
        rotation={[0, 0, -0.09]}
      />
      <Box
        position={[0.31, 1.64, 0.14]}
        size={[0.47, 0.48, 0.012]}
        color={night ? "#cfb77f" : "#ddd8b1"}
        rotation={[0, 0, 0.08]}
      />
      <Lettering
        text={night ? "PAST DUE" : "$3.00"}
        position={[-0.2, 1.93, 0.14]}
        width={0.45}
        height={0.3}
        color={DARK_WOOD}
        fontSize={95}
      />
      {[-0.2, 0.32].map((x, i) => (
        <mesh key={x} position={[x, i ? 1.83 : 2.17, 0.17]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color="#974a36" />
        </mesh>
      ))}
    </group>
  );
}

function Courtroom({ lighting }: { lighting: LightingPreset }) {
  const night = lighting === "night";
  return (
    <group>
      <Box position={[0, -0.35, 0]} size={[11.6, 0.62, 9.7]} color={DARK_WOOD} rounded />
      <Box position={[0, -0.06, 0]} size={[11.65, 0.12, 9.75]} color={TRIM} />
      {Array.from({ length: 20 }, (_, i) => (
        <Box
          key={i}
          position={[-5.47 + i * 0.575, 0.015, 0]}
          size={[0.56, 0.04, 9.48]}
          color={["#bd9162", "#c79c6b", "#b98958", "#c39666"][i % 4]}
        />
      ))}
      {[-3.2, 0, 3.2].flatMap((z, row) =>
        Array.from({ length: 10 }, (_, i) => (
          <Box
            key={`${row}-${i}`}
            position={[-5.18 + i * 1.15, 0.038, z + (i % 2) * 0.5]}
            size={[0.55, 0.002, 0.016]}
            color="#977449"
          />
        )),
      )}
      <Box position={[0, 2.6, -4.48]} size={[11.5, 5.2, 0.25]} color="#e5d4b5" />
      <Box position={[-5.58, 1.75, -2.2]} size={[0.22, 3.5, 4.6]} color="#dbc8a5" />
      <Box position={[5.58, 0.72, -0.1]} size={[0.22, 1.44, 8.6]} color={WOOD} />
      <Box position={[-5.58, 0.72, 2.3]} size={[0.22, 1.44, 4.4]} color={WOOD} />
      <Box position={[0, 0.71, -4.29]} size={[11.25, 1.42, 0.14]} color={WOOD} />
      <Box position={[0, 1.45, -4.24]} size={[11.38, 0.12, 0.22]} color={TRIM} />
      <Box position={[0, 0.14, -4.2]} size={[11.35, 0.22, 0.18]} color={DARK_WOOD} />
      <Box position={[0, 5.17, -4.43]} size={[11.75, 0.22, 0.48]} color={PAPER} rounded />
      <Box position={[0, 4.97, -4.27]} size={[11.45, 0.09, 0.17]} color={TRIM} />
      {[-5.42, 5.42].map((x) => (
        <group key={x}>
          <Box position={[x, 1.46, 0]} size={[0.39, 0.13, 9]} color={TRIM} />
          <Box position={[x, 0.13, 0]} size={[0.28, 0.18, 9]} color={DARK_WOOD} />
          {[-3.7, -2.4, -1.1, 0.2, 1.5, 2.8, 4.1].map((z) => (
            <Box key={z} position={[x, 0.77, z]} size={[0.25, 1.2, 0.085]} color={TRIM} />
          ))}
        </group>
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <Box
          key={i}
          position={[-5.35 + i * 0.89, 0.79, -4.18]}
          size={[0.07, 1.2, 0.08]}
          color={TRIM}
        />
      ))}
      {[-5.28, -1.96, 1.96, 5.28].map((x) => (
        <group key={x}>
          <Box position={[x, 3.2, -4.22]} size={[0.2, 3.35, 0.18]} color={PAPER} />
          <Box position={[x, 4.83, -4.17]} size={[0.36, 0.12, 0.29]} color={PAPER} />
        </group>
      ))}
      <Window x={-3.62} lighting={lighting} />
      <Window x={3.62} lighting={lighting} />
      <Seal />
      <Lettering
        text="SMALLER CLAIMS COURT"
        position={[0, 4.75, -4.05]}
        width={3.8}
        height={0.35}
        color={DARK_WOOD}
        fontSize={68}
      />
      <JudgeBench night={night} />
      <Box position={[0, 0.046, 0.85]} size={[1.85, 0.025, 5.9]} color={GREEN} />
      {[-0.84, 0.84].map((x) => (
        <Box key={x} position={[x, 0.061, 0.85]} size={[0.025, 0.002, 5.65]} color={BRASS} />
      ))}
      <Lectern x={-2.65} label="PLAINTIFF" night={night} />
      <Lectern x={2.65} label="DEFENDANT" night={night} />
      <GalleryBench x={-3.25} />
      <GalleryBench x={3.25} />
      <Plant position={[-4.58, 0.04, -2.63]} scale={1.1} />
      <Plant position={[4.78, 0.04, 2.07]} scale={0.8} />
      <EvidenceBoard night={night} />
      <group position={[-5.42, 2.45, -1.7]} rotation={[0, Math.PI / 2, 0]}>
        <Box position={[0, 0, 0]} size={[1.15, 1.25, 0.09]} color={DARK_WOOD} rounded />
        <Box position={[0, 0, 0.055]} size={[0.97, 1.07, 0.02]} color={PAPER} />
        <Lettering
          text="ORDER"
          position={[0, 0.22, 0.074]}
          width={0.85}
          height={0.25}
          color={DARK_WOOD}
          fontSize={110}
        />
        <Lettering
          text="PLEASE."
          position={[0, -0.1, 0.074]}
          width={0.85}
          height={0.24}
          color={DARK_WOOD}
          fontSize={100}
        />
      </group>
      <group position={[-5.425, 2.66, -0.65]} rotation={[0, Math.PI / 2, 0]}>
        <Cylinder
          position={[0, 0, 0]}
          radius={0.34}
          height={0.08}
          color={DARK_WOOD}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Cylinder
          position={[0, 0, 0.05]}
          radius={0.29}
          height={0.02}
          color={PAPER}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Box position={[0, 0.08, 0.075]} size={[0.02, 0.17, 0.01]} color={DARK_WOOD} />
        <Box
          position={[0.08, 0, 0.076]}
          size={[0.18, 0.022, 0.01]}
          color={DARK_WOOD}
          rotation={[0, 0, -0.3]}
        />
      </group>
      <Lettering
        text="COURTROOM No. 01"
        position={[0, -0.32, 4.871]}
        width={2.45}
        height={0.25}
        color={PAPER}
        fontSize={76}
      />
    </group>
  );
}


const STANDS: Record<
  "plaintiff" | "defendant",
  { position: Point; spin: number; turn: number; side: -1 | 1; bubble: Point }
> = {
  plaintiff: {
    position: [-2.65, 0, 0.65],
    spin: -0.12,
    turn: 0.28,
    side: -1,
    bubble: [0.62, 2.42, -0.78],
  },
  defendant: {
    position: [2.65, 0, 0.65],
    spin: 0.12,
    turn: -0.28,
    side: 1,
    bubble: [-0.62, 2.42, -0.78],
  },
};

const STAND_SPOT: Point = [0, 0, -0.78];
const JUDGE_BUBBLE: Point = [0, 3.32, -3.3];

function Bubble({ position, text }: { position: Point; text: string }) {
  return (
    <Html position={position} center zIndexRange={[8, 0]} className={styles.bubbleAnchor}>
      <p className={styles.bubble}>{text}</p>
    </Html>
  );
}

function Cast({ cast, speech }: { cast: CourtroomCast; speech: CourtroomSpeech }) {
  return (
    <group>
      {(["plaintiff", "defendant"] as const).map((role) => {
        const stand = STANDS[role];
        const member = cast[role];
        return (
          <group key={role} position={stand.position} rotation={[0, stand.spin, 0]}>
            <React.Suspense fallback={null}>
              <CourtroomCharacter
                id={member.id}
                position={STAND_SPOT}
                rotation={stand.turn}
                side={stand.side}
                motion={member.motion}
                take={member.take}
                paused={cast.paused}
                reducedMotion={cast.reducedMotion}
              />
            </React.Suspense>
            {speech?.role === role && <Bubble position={stand.bubble} text={speech.text} />}
          </group>
        );
      })}
      {speech?.role === "judge" && <Bubble position={JUDGE_BUBBLE} text={speech.text} />}
    </group>
  );
}

const SHOTS: Record<CourtroomView, { position: Point; target: Point; zoom: number }> = {
  wide: { position: [11, 10, 15], target: [0, 2, 0], zoom: 1 },
  plaintiff: { position: [4, 5.5, 10], target: [-2.62, 1.72, -0.05], zoom: 2.3 },
  defendant: { position: [-4, 5.5, 10], target: [2.62, 1.72, -0.05], zoom: 2.3 },
  judge: { position: [3, 4.6, 8], target: [0, 2.1, -2.95], zoom: 2.5 },
};

function CameraRig({ view, reset }: { view: CourtroomView; reset: number }) {
  const controls = React.useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, invalidate } = useThree();
  const moving = React.useRef(true);
  const reducedMotion = React.useRef(false);
  const destination = React.useRef(new THREE.Vector3());
  const target = React.useRef(new THREE.Vector3());
  const framing = React.useRef(1);
  const shotZoom = React.useRef(1);
  const initialized = React.useRef(false);
  // The viewport fit is applied straight to the camera every frame so the room
  // tracks a resizing pane exactly. Only the shot's own framing is eased.
  const fit = Math.min(size.width / 17.5, size.height / 12.8);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotion.current = media.matches;
      invalidate();
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [invalidate]);

  React.useLayoutEffect(() => {
    const shot = SHOTS[view];
    destination.current.set(...shot.position);
    target.current.set(...shot.target);
    shotZoom.current = shot.zoom;
    if (!initialized.current) {
      camera.position.copy(destination.current);
      framing.current = shot.zoom;
      camera.zoom = shot.zoom * fit;
      camera.lookAt(target.current);
      camera.updateProjectionMatrix();
      controls.current?.target.copy(target.current);
      initialized.current = true;
    }
    moving.current = true;
    invalidate();
  }, [camera, view, reset, fit, invalidate]);

  useFrame((_, delta) => {
    if (!moving.current || !controls.current) return;
    const alpha = reducedMotion.current ? 1 : 1 - Math.exp(-5 * Math.min(delta, 0.1));
    camera.position.lerp(destination.current, alpha);
    controls.current.target.lerp(target.current, alpha);
    framing.current = THREE.MathUtils.lerp(framing.current, shotZoom.current, alpha);
    camera.zoom = framing.current * fit;
    camera.updateProjectionMatrix();
    controls.current.update();
    if (
      camera.position.distanceToSquared(destination.current) < 0.00001 &&
      Math.abs(framing.current - shotZoom.current) < 0.0005
    ) {
      moving.current = false;
    } else invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={false}
      minPolarAngle={0.4}
      maxPolarAngle={1.42}
      minAzimuthAngle={-1.25}
      maxAzimuthAngle={1.25}
      minZoom={Math.min(size.width / 25, size.height / 18)}
      maxZoom={130}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}

function ContextMonitor() {
  const { gl, invalidate } = useThree();
  const [lost, setLost] = React.useState(false);
  React.useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault();
      setLost(true);
    };
    const handleRestored = () => {
      setLost(false);
      invalidate();
    };
    gl.domElement.addEventListener("webglcontextlost", handleLost);
    gl.domElement.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", handleLost);
      gl.domElement.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, invalidate]);
  if (lost) throw new Error("The WebGL context was lost.");
  return null;
}

function SceneReady({ onReady }: { onReady?: () => void }) {
  const { active } = useProgress();
  React.useEffect(() => { if (!active) onReady?.(); }, [active, onReady]);
  return null;
}

export default function CourtroomScene({
  view,
  lighting,
  reset,
  judge,
  cast,
  speech,
  onReady,
}: {
  view: CourtroomView;
  lighting: LightingPreset;
  reset: number;
  judge: JudgePerformance;
  cast: CourtroomCast;
  speech: CourtroomSpeech;
  onReady?: () => void;
}) {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      setSupported(Boolean(context));
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setSupported(false);
    }
  }, []);
  if (supported === false) throw new Error("WebGL 2 is unavailable.");
  if (supported === null) return null;

  const light = LIGHTING[lighting];
  return (
    <Canvas
      orthographic
      shadows="percentage"
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [11, 10, 15], zoom: 45, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: false }}
      role="img"
      aria-label="A miniature courtroom. A silver-haired judge sits behind the bench. A plaintiff and a defendant stand at their lecterns. Use the controls below to run the hearing, change the cast, and move the camera."
    >
      <color attach="background" args={[light.background]} />
      <ambientLight
        intensity={light.ambient}
        color={lighting === "night" ? "#c0d2e0" : "#fff2d9"}
      />
      <hemisphereLight args={[lighting === "night" ? "#8faabe" : "#fff4dd", "#8d7761", 0.7]} />
      <directionalLight
        position={light.position}
        intensity={light.intensity}
        color={light.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
      <directionalLight
        position={[5, 6, 8]}
        intensity={lighting === "night" ? 0.4 : 0.8}
        color="#dae4de"
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.69, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={light.background} roughness={1} />
      </mesh>
      <Courtroom lighting={lighting} />
      <CourtroomJudge {...judge} />
      <Cast cast={cast} speech={speech} />
      <CameraRig view={view} reset={reset} />
      <ContextMonitor />
      <SceneReady onReady={onReady} />
    </Canvas>
  );
}

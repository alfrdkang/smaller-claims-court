"use client";

import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { JUDGE_MOTIONS, blendJudgePose, sampleJudgePose, type JudgeMotion } from "./judge-motion";
import { applyJudgePose, createJudgeModel, disposeJudgeModel, type JudgeModel } from "./judge-model";

export type JudgePerformance = {
  motion: JudgeMotion;
  take: number;
  paused: boolean;
  reducedMotion: boolean;
  onComplete: () => void;
};

export function CourtroomJudge({ motion, take, paused, reducedMotion, onComplete }: JudgePerformance) {
  const [model, setModel] = React.useState<JudgeModel | null>(null);
  const { invalidate } = useThree();
  const elapsed = React.useRef(0);
  const current = React.useRef(sampleJudgePose("idle", 0, true));
  const previous = React.useRef(current.current);
  const completed = React.useRef(false);
  const visible = React.useRef(true);

  React.useEffect(() => {
    const judge = createJudgeModel();
    setModel(judge);
    return () => disposeJudgeModel(judge);
  }, []);

  React.useEffect(() => {
    const update = () => {
      visible.current = !document.hidden;
      invalidate();
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [invalidate]);

  React.useLayoutEffect(() => {
    previous.current = current.current;
    elapsed.current = 0;
    completed.current = false;
    invalidate();
  }, [motion, take, reducedMotion, invalidate]);

  React.useEffect(() => { invalidate(); }, [model, paused, invalidate]);

  useFrame((_, delta) => {
    if (!model || !visible.current) return;
    if (!paused && !reducedMotion) elapsed.current += Math.min(delta, 0.05);
    const target = sampleJudgePose(motion, elapsed.current, reducedMotion);
    current.current = reducedMotion ? target : blendJudgePose(previous.current, target, elapsed.current / 0.25);
    applyJudgePose(model, current.current);
    if (paused || reducedMotion) return;
    const duration = JUDGE_MOTIONS.find((item) => item.id === motion)!.duration;
    if (motion !== "idle" && elapsed.current >= duration && !completed.current) {
      completed.current = true;
      onComplete();
    }
    invalidate();
  });

  return model ? <primitive object={model.root} dispose={null} /> : null;
}

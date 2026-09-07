"use client";

import React from "react";
import type { Case } from "@/lib/types";
import { gavelBang } from "@/lib/client/sound";
import type { HearingBeat } from "./hearing";
import { advanceStage, beatAt, CLOSING_BEATS, openingBeats, verdictBeats, type HearingChapter, type HearingStage, type SpokenLengths } from "./case-hearing";

type AudioMode = "text" | "loading" | "playing" | "blocked";
const duration = (beats: HearingBeat[]) => beats.reduce((sum, beat) => sum + beat.duration, 0);

export function useCaseHearing(record: Case, pending: boolean, active: boolean) {
  const [stage, setStage] = React.useState<HearingStage>("settled");
  const [chapter, setChapter] = React.useState<HearingChapter>("full");
  const [elapsed, setElapsed] = React.useState(0);
  const [run, setRun] = React.useState(0);
  const [variant, setVariant] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const [audioMode, setAudioMode] = React.useState<AudioMode>("text");
  const [audioProgress, setAudioProgress] = React.useState(0);
  const [audioNotice, setAudioNotice] = React.useState("");
  const [spoken, setSpoken] = React.useState<SpokenLengths>({});
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const plaintiffRef = React.useRef<HTMLAudioElement>(null);
  const defendantRef = React.useRef<HTMLAudioElement>(null);
  const struck = React.useRef("");
  const opening = React.useMemo(() => openingBeats(record, variant, spoken), [record, variant, spoken]);
  const statements = React.useMemo(
    () => [["plaintiff", plaintiffRef], ["defendant", defendantRef]] as const,
    [],
  );
  const verdict = React.useMemo(() => verdictBeats(record), [record]);
  const suspended = paused || hidden || !active;

  const go = React.useCallback((next: HearingStage) => {
    setElapsed(0);
    setStage(next);
  }, []);

  const start = React.useCallback((nextChapter: HearingChapter, nextVariant = 0) => {
    audioRef.current?.pause();
    plaintiffRef.current?.pause();
    defendantRef.current?.pause();
    setChapter(nextChapter);
    setVariant(nextVariant);
    setRun(value => value + 1);
    setPaused(false);
    setAudioNotice("");
    setAudioProgress(0);
    go(nextChapter === "verdict" ? "waiting" : "opening");
  }, [go]);

  React.useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  React.useEffect(() => {
    if (stage === "settled" || suspended || (stage === "verdict" && audioMode === "blocked")) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.3);
      last = now;
      setElapsed(value => value + delta);
    }, 100);
    return () => window.clearInterval(timer);
  }, [stage, suspended, audioMode]);

  const advance = React.useCallback(() => {
    audioRef.current?.pause();
    plaintiffRef.current?.pause();
    defendantRef.current?.pause();
    go(advanceStage(stage, pending, Boolean(record.verdict), chapter));
  }, [go, stage, pending, record.verdict, chapter]);

  React.useEffect(() => {
    if (suspended) return;
    if (stage === "opening" && elapsed >= duration(opening)) advance();
    if (stage === "waiting" && elapsed >= 1.5 && !pending && record.verdict) advance();
    if (stage === "verdict" && audioMode === "text" && elapsed >= duration(verdict)) advance();
    if (stage === "closing" && elapsed >= duration(CLOSING_BEATS)) advance();
  }, [stage, elapsed, opening, verdict, pending, record.verdict, audioMode, suspended, advance]);

  const audioUrl = record.verdict?.audioUrl;
  React.useEffect(() => {
    const audio = audioRef.current;
    if (stage !== "verdict" || !audio || !audioUrl) {
      setAudioMode("text");
      if (stage === "verdict") setAudioNotice("No recording is available. The court will proceed in writing.");
      return;
    }
    let cancelled = false;
    setAudioMode("loading");
    setAudioProgress(0);
    setAudioNotice("");
    audio.src = audioUrl;
    audio.currentTime = 0;
    const progress = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setAudioProgress(audio.currentTime / audio.duration);
    };
    const ended = () => go("closing");
    const failed = () => {
      audio.pause();
      setAudioMode("text");
      setElapsed(0);
      setAudioNotice("The recording could not play. Continuing with the written ruling.");
    };
    const playing = () => setAudioMode("playing");
    audio.addEventListener("timeupdate", progress);
    audio.addEventListener("ended", ended);
    audio.addEventListener("error", failed);
    audio.addEventListener("playing", playing);
    audio.play().catch((error: DOMException) => {
      if (cancelled || error.name === "AbortError") return;
      if (error.name === "NotAllowedError") setAudioMode("blocked");
      else failed();
    });
    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("timeupdate", progress);
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("error", failed);
      audio.removeEventListener("playing", playing);
    };
  }, [stage, run, audioUrl, go]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || stage !== "verdict" || audioMode === "text" || audioMode === "blocked") return;
    if (suspended) audio.pause();
    else if (audio.paused) audio.play().catch(() => setAudioMode("blocked"));
  }, [suspended, stage, audioMode]);

  React.useEffect(() => {
    if (stage === "verdict" && audioMode === "loading" && elapsed > 12) {
      audioRef.current?.pause();
      setAudioMode("text");
      setElapsed(0);
      setAudioNotice("The recording is taking too long. Continuing in writing.");
    }
  }, [stage, audioMode, elapsed]);

  const continueSilently = () => {
    audioRef.current?.pause();
    setAudioMode("text");
    setElapsed(0);
    setAudioNotice("Written delivery. The recording is also available in the court order.");
  };
  const playAudio = () => {
    setPaused(false);
    audioRef.current?.play().then(() => setAudioMode("playing")).catch(() => {
      setAudioMode("blocked");
      setAudioNotice("Playback was blocked. You can continue without audio.");
    });
  };

  const beats = stage === "opening" ? opening : stage === "closing" ? CLOSING_BEATS : verdict;
  const time = stage === "verdict" && audioMode !== "text" ? audioProgress * duration(verdict) : elapsed;
  const current = beatAt(beats, time);
  const waitingMotions = ["think", "listen-left", "think", "listen-right", "nod"] as const;
  const waiting: HearingBeat = { id: "waiting", duration: 5, caption: pending ? "The bench is weighing the matter…" : "The order is ready. The judge takes the bench.", speaker: null, view: "judge", judge: waitingMotions[Math.floor(elapsed / 5) % waitingMotions.length], plaintiff: "listen", defendant: "listen" };
  const beat = stage === "settled" ? null : stage === "waiting" ? waiting : current.beat ?? null;
  const segment = stage === "waiting" ? Math.floor(elapsed / 5) : current.index;
  const repeat = beat?.judge === "gavel" ? 0 : Math.floor((stage === "waiting" ? elapsed % 5 : current.offset) / 4);
  const take = run * 100000 + ["opening", "waiting", "verdict", "closing", "settled"].indexOf(stage) * 10000 + segment * 100 + repeat;

  // Statement recordings are measured once so the captions can be timed to them.
  React.useEffect(() => {
    const read = () => setSpoken(previous => {
      const next: SpokenLengths = {};
      for (const [role, ref] of statements) {
        const length = ref.current?.duration;
        if (length && Number.isFinite(length)) next[role] = length;
      }
      const same = previous.plaintiff === next.plaintiff && previous.defendant === next.defendant;
      return same ? previous : next;
    });
    read();
    const nodes = statements.map(([, ref]) => ref.current).filter(node => node !== null);
    nodes.forEach(node => node.addEventListener("loadedmetadata", read));
    return () => nodes.forEach(node => node.removeEventListener("loadedmetadata", read));
  }, [statements, active, record.plaintiffAudioUrl, record.defendantAudioUrl]);

  // Each party's recording is held to the hearing clock, so skipping and pausing carry it along.
  const speaking = stage === "opening" ? beat?.speaker : null;
  React.useEffect(() => {
    for (const [role, ref] of statements) {
      const node = ref.current;
      if (!node) continue;
      if (role !== speaking || suspended) {
        if (!node.paused) node.pause();
        continue;
      }
      const block = opening.filter(item => item.speaker === role);
      const from = opening.slice(0, opening.indexOf(block[0])).reduce((sum, item) => sum + item.duration, 0);
      const mark = Math.max(0, Math.min(elapsed - from, node.duration || 0));
      if (Math.abs(node.currentTime - mark) > 0.35) node.currentTime = mark;
      if (node.paused) node.play().catch(() => {});
    }
  }, [statements, speaking, suspended, elapsed, opening]);

  // Step to the next line, and only fall through to the next stage on the last one.
  const skip = () => {
    if (stage === "waiting" || stage === "settled" || current.index >= beats.length - 1) return advance();
    const mark = beats.slice(0, current.index + 1).reduce((sum, item) => sum + item.duration, 0);
    const audio = audioRef.current;
    if (stage === "verdict" && audioMode !== "text" && audio && Number.isFinite(audio.duration)) {
      audio.currentTime = (mark / duration(verdict)) * audio.duration;
      setAudioProgress(audio.currentTime / audio.duration);
    } else setElapsed(mark + 0.01);
  };

  React.useEffect(() => {
    const key = `${run}-${stage}-${current.index}`;
    if (!suspended && beat?.judge === "gavel" && current.offset >= 1.05 && struck.current !== key) {
      struck.current = key;
      gavelBang();
    }
  }, [beat?.judge, current.offset, current.index, suspended, run, stage]);

  return { stage, beat, take, variant, paused, suspended, audioMode, audioNotice, audioRef, plaintiffRef, defendantRef, start, skip,
    setPaused, playAudio, continueSilently, settle: () => { audioRef.current?.pause(); go("settled"); } };
}

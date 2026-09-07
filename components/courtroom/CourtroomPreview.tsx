"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

import type { CourtroomView, LightingPreset } from "./CourtroomScene";
import { CHARACTER_IDS, type CharacterId } from "./CourtroomCharacter";
import styles from "./courtroom.module.css";
import { JUDGE_MOTIONS, type JudgeMotion } from "./judge-motion";
import { HEARING, HEARING_DURATION, hearingBeatAt, hearingBeatStart } from "./hearing";

const Scene = dynamic(() => import("./CourtroomScene"), {
  ssr: false,
  loading: () => <SceneNotice>Opening the courtroom…</SceneNotice>,
});

const VIEWS: { id: CourtroomView; label: string; number: string }[] = [
  { id: "wide", label: "The courtroom", number: "01" },
  { id: "plaintiff", label: "Plaintiff", number: "02" },
  { id: "defendant", label: "Defendant", number: "03" },
  { id: "judge", label: "The bench", number: "04" },
];

const LIGHTS: { id: LightingPreset; label: string; description: string }[] = [
  {
    id: "day",
    label: "Morning session",
    description: "Sunlight through the windows. A fresh stack of grievances.",
  },
  {
    id: "golden",
    label: "Golden hour",
    description: "Long shadows. A matter that could have been a text.",
  },
  {
    id: "night",
    label: "After hours",
    description: "The lamps are on. The court is still taking this seriously.",
  },
];

const ROLES: { id: "plaintiff" | "defendant"; label: string }[] = [
  { id: "plaintiff", label: "Plaintiff" },
  { id: "defendant", label: "Defendant" },
];

function SceneNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.notice}>
      <span aria-hidden>⚖</span>
      <p role="status">{children}</p>
    </div>
  );
}

class SceneBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <SceneNotice>
        The 3D room couldn’t open. Try a browser with hardware acceleration enabled.
        <button className={styles.retry} onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </SceneNotice>
    ) : (
      this.props.children
    );
  }
}

export function CourtroomPreview() {
  const [view, setView] = React.useState<CourtroomView>("wide");
  const [lighting, setLighting] = React.useState<LightingPreset>("day");
  const [reset, setReset] = React.useState(0);
  const [motion, setMotion] = React.useState<JudgeMotion>("idle");
  const [take, setTake] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [cast, setCast] = React.useState<Record<"plaintiff" | "defendant", CharacterId>>({
    plaintiff: "b",
    defendant: "k",
  });
  const [hearing, setHearing] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const clock = React.useRef(0);
  const finishMotion = React.useCallback(() => setMotion("idle"), []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    if (!hearing || paused) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      clock.current = Math.min(clock.current + delta, HEARING_DURATION);
      setElapsed(clock.current);
      if (clock.current < HEARING_DURATION) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [hearing, paused]);

  const beat = hearing ? hearingBeatAt(elapsed) : null;
  const beatIndex = beat ? beat.index : -1;

  React.useEffect(() => {
    if (beatIndex < 0) return;
    setView(HEARING[beatIndex].view);
  }, [beatIndex]);

  const seek = React.useCallback((time: number) => {
    clock.current = Math.max(0, Math.min(time, HEARING_DURATION));
    setElapsed(clock.current);
  }, []);

  const startHearing = React.useCallback(() => {
    seek(0);
    setHearing(true);
    setPaused(false);
  }, [seek]);

  const stopHearing = React.useCallback(() => {
    seek(0);
    setHearing(false);
    setPaused(false);
    setMotion("idle");
    setTake((value) => value + 1);
    setView("wide");
  }, [seek]);

  const activeLight = LIGHTS.find((item) => item.id === lighting)!;
  const finished = hearing && elapsed >= HEARING_DURATION;
  const judgeMotion = beat ? beat.beat.judge : motion;
  const judgeTake = beat ? 1000 + beat.index : take;
  const castMember = (role: "plaintiff" | "defendant") => ({
    id: cast[role],
    motion: beat ? beat.beat[role] : ("idle" as const),
    take: beat ? beat.index : 0,
  });
  const speech =
    beat && beat.beat.speaker && beat.beat.line
      ? { role: beat.beat.speaker, text: beat.beat.line }
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            <span /> THE SMALLER CLAIMS COURT · EST. 2026
          </p>
          <h1>
            Small claims.
            <br />
            <em>Grand surroundings.</em>
          </h1>
          <p className={styles.intro}>A room for matters of enormous personal importance.</p>
        </div>
        <div className={styles.roomNumber}>
          <span>COURTROOM</span>
          <strong>01</strong>
          <span>THE PETTY DIVISION</span>
        </div>
      </header>

      <section className={styles.exhibit} aria-label="Interactive courtroom preview">
        <div className={styles.exhibitTop}>
          <span>
            <i /> {hearing ? "COURT IS IN SESSION" : "COURT IS IN RECESS"}
          </span>
          <span>PLEASE LEAVE YOUR DIGNITY AT THE DOOR</span>
        </div>
        <div className={styles.viewport} data-lighting={lighting}>
          <div className={styles.sceneCaption}>
            <span>{hearing ? "THE HEARING" : "THE CHAMBERS"}</span>
            <p>{beat ? beat.beat.caption : activeLight.label}</p>
          </div>
          <SceneBoundary>
            <Scene
              view={view}
              lighting={lighting}
              reset={reset}
              judge={{
                motion: judgeMotion,
                take: judgeTake,
                paused,
                reducedMotion,
                onComplete: hearing ? () => {} : finishMotion,
              }}
              cast={{
                plaintiff: castMember("plaintiff"),
                defendant: castMember("defendant"),
                paused,
                reducedMotion,
              }}
              speech={speech}
            />
          </SceneBoundary>
          <div className={styles.sceneBottom}>
            <span>Drag to look around · Scroll to zoom</span>
            <button
              onClick={() => {
                setView("wide");
                setReset((value) => value + 1);
              }}
              aria-label="Reset courtroom camera"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 7a6.5 6.5 0 1 1-.5 5M4 3v4h4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reset view
            </button>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.cameraControls} role="group" aria-label="Camera views">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                aria-pressed={view === item.id}
                onClick={() => {
                  setView(item.id);
                  setReset((value) => value + 1);
                }}
              >
                <span>{item.number}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.lightControls} role="group" aria-label="Courtroom lighting">
            {LIGHTS.map((item) => (
              <button
                key={item.id}
                title={item.label}
                aria-label={item.label}
                aria-pressed={lighting === item.id}
                onClick={() => setLighting(item.id)}
              >
                <span className={styles[item.id]} />
              </button>
            ))}
          </div>
        </div>

        <section className={styles.hearingControls} aria-label="The hearing">
          <div className={styles.judgeHeading}>
            <div>
              <span>THE HEARING</span>
              <p>Ten beats, one very small claim.</p>
            </div>
            <div className={styles.transport}>
              <button onClick={startHearing} data-primary="true">
                {hearing ? "Start again" : "Hold the hearing"}
              </button>
              <button
                disabled={!hearing || finished}
                onClick={() => seek(hearingBeatStart(Math.min(beatIndex + 1, HEARING.length - 1)))}
              >
                Next beat
              </button>
              <button disabled={!hearing} onClick={stopHearing}>
                Adjourn
              </button>
            </div>
          </div>
          <ol className={styles.beatList}>
            {HEARING.map((item, index) => (
              <li key={item.id}>
                <button
                  aria-current={hearing && index === beatIndex}
                  onClick={() => {
                    if (!hearing) setHearing(true);
                    setPaused(false);
                    seek(hearingBeatStart(index));
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.caption}
                </button>
              </li>
            ))}
          </ol>
          <p className={styles.motionStatus} role="status">
            {!hearing
              ? "The court is in recess. Start the hearing, or pose the judge below."
              : finished
                ? "The hearing is over. Start again, or adjourn to go back to the empty room."
                : `${beat!.beat.caption} · beat ${beatIndex + 1} of ${HEARING.length}`}
          </p>
        </section>

        <section className={styles.castControls} aria-label="Choose the cast">
          <div className={styles.judgeHeading}>
            <div>
              <span>THE PARTIES</span>
              <p>Eighteen citizens. Two of them are about to regret this.</p>
            </div>
          </div>
          {ROLES.map((role) => (
            <div key={role.id} className={styles.castRow}>
              <span className={styles.castLabel}>{role.label}</span>
              <div className={styles.castOptions} role="group" aria-label={`${role.label} character`}>
                {CHARACTER_IDS.map((id) => (
                  <button
                    key={id}
                    aria-pressed={cast[role.id] === id}
                    aria-label={`${role.label} character ${id.toUpperCase()}`}
                    onClick={() => setCast((value) => ({ ...value, [role.id]: id }))}
                  >
                    <img src={`/characters/previews/character-${id}.png`} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className={styles.castNote}>
            Characters by <a href="https://kenney.nl">Kenney</a>, released under CC0. Every one of
            them uses the same motions.
          </p>
        </section>

        <section className={styles.judgeControls} aria-label="Judge performance preview">
          <div className={styles.judgeHeading}>
            <div>
              <span>THE PRESIDING JUDGE</span>
              <p>A measured response. Usually.</p>
            </div>
            <button disabled={reducedMotion && !hearing} onClick={() => setPaused((value) => !value)}>
              {paused ? "Resume motion" : "Pause motion"}
            </button>
          </div>
          <div className={styles.motionButtons} role="group" aria-label="Judge animations">
            {JUDGE_MOTIONS.map((item) => (
              <button
                key={item.id}
                disabled={hearing}
                aria-pressed={!hearing && motion === item.id}
                onClick={() => {
                  setMotion(item.id);
                  setTake((value) => value + 1);
                  setPaused(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className={styles.motionStatus} role="status">
            {reducedMotion
              ? "Reduced motion: actions display as still poses. The hearing still runs, one beat at a time."
              : hearing
                ? "The judge is taking direction from the hearing. Adjourn to pose the judge yourself."
                : paused
                  ? "Motion paused. Choose an action to play it again."
                  : `${JUDGE_MOTIONS.find((item) => item.id === motion)!.label} · Select The bench for a closer look. Click any action to replay.`}
          </p>
        </section>
      </section>

      <div className={styles.caption}>
        <p aria-live="polite">{activeLight.description}</p>
        <span>THREE SEATS. TWO SIDES. ONE VERY SMALL CLAIM.</span>
      </div>
      <div className={styles.footer}>
        <p>
          <span aria-hidden>§</span> No grievance too small. No bench too grand.
        </p>
        <Link href="/">
          Back to the court <span aria-hidden>↗</span>
        </Link>
      </div>
    </div>
  );
}

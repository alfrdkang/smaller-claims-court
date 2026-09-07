"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";
import { caseCast } from "@/lib/characters";
import { APPELLATE, getPersona } from "@/lib/personas";
import type { Case } from "@/lib/types";
import type { CourtroomView, LightingPreset } from "./CourtroomScene";
import { JUDGE_MOTIONS, type JudgeMotion } from "./judge-motion";
import { useCaseHearing } from "./useCaseHearing";
import styles from "./case-courtroom.module.css";

const Scene = dynamic(() => import("./CourtroomScene"), { ssr: false, loading: () => <div className={styles.loading}>Opening the doors…</div> });
const VIEWS: { id: CourtroomView; label: string }[] = [{ id: "wide", label: "Whole room" }, { id: "plaintiff", label: "Plaintiff" }, { id: "defendant", label: "Defendant" }, { id: "judge", label: "The bench" }];
const LIGHTS: { id: LightingPreset; label: string }[] = [{ id: "day", label: "Morning" }, { id: "golden", label: "Golden hour" }, { id: "night", label: "After hours" }];
const noOp = () => {};

class RoomBoundary extends React.Component<{ children: React.ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() {
    return this.state.failed ? <div className={styles.loading}><strong>The written record still stands.</strong><p>The 3D room is unavailable. The hearing and court order remain accessible.</p><button onClick={() => this.setState({ failed: false })}>Retry 3D</button></div> : this.props.children;
  }
}

export function CaseCourtroom({ record, pending, request, active, onExit, onEnter, children }: {
  record: Case; pending: boolean; request: number; active: boolean; onExit: () => void; onEnter: () => void; children: React.ReactNode;
}) {
  const [ready, setReady] = React.useState(false);
  const [view, setView] = React.useState<CourtroomView>("wide");
  const [lighting, setLighting] = React.useState<LightingPreset>("day");
  const [reset, setReset] = React.useState(0);
  const [motion, setMotion] = React.useState<JudgeMotion>("idle");
  const [poseTake, setPoseTake] = React.useState(0);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [consoleHeight, setConsoleHeight] = React.useState(0);
  const paper = React.useRef<HTMLElement>(null);
  const room = React.useRef<HTMLElement>(null);
  const hearing = useCaseHearing(record, pending, active && ready);
  const { start, stage } = hearing;
  const settled = stage === "settled";
  const cast = caseCast(record);
  const markReady = React.useCallback(() => setReady(true), []);
  const finishPose = React.useCallback(() => setMotion("idle"), []);
  // The room lifts by exactly the height of the console beneath it.
  const measureConsole = React.useCallback((node: HTMLElement | null) => {
    if (!node) return setConsoleHeight(0);
    const observer = new ResizeObserver(() => setConsoleHeight(node.offsetHeight));
    observer.observe(node);
    return () => { observer.disconnect(); setConsoleHeight(0); };
  }, []);

  React.useEffect(() => { if (request > 0) start("full"); }, [request, start]);
  React.useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  React.useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const outside = [...document.querySelectorAll<HTMLElement>("body > header, body > footer")];
    const inert = outside.map(el => el.inert);
    outside.forEach(el => { el.inert = true; });
    return () => { document.body.style.overflow = previous; outside.forEach((el, i) => { el.inert = inert[i]; }); };
  }, [active]);
  React.useEffect(() => {
    if (!active) return;
    const destination = settled ? paper.current : room.current;
    destination?.focus({ preventScroll: true });
    if (settled) paper.current?.scrollTo({ top: 0 });
  }, [active, settled]);
  const directedView = hearing.beat?.view;
  React.useEffect(() => {
    if (directedView) setView(directedView);
    else if (settled) setView("wide");
  }, [directedView, settled]);

  const speaker = hearing.beat?.speaker;
  const speakerName = speaker === "plaintiff" ? record.plaintiff : speaker === "defendant" ? record.defendant : record.verdict?.appeal ? APPELLATE.name : getPersona(record.personaId).name;
  const replay = (chapter: "full" | "statements" | "verdict", alternate = false) => {
    const nextVariant = alternate ? (hearing.variant + 1) % 3 : hearing.variant;
    if (alternate) setLighting(LIGHTS[nextVariant].id);
    start(chapter, nextVariant);
  };

  return (
    <div className={active ? styles.experience : undefined} data-scene={lighting} data-courtroom-layout={active ? settled ? "split" : "full" : "document"}>
      <section ref={paper} tabIndex={-1} className={active ? styles.document : undefined} aria-label="Case documents" inert={active && !settled} aria-hidden={active && !settled}>
        {active ? <div className={styles.paperTop}><span>THE COURT RECORD</span><button onClick={onExit}>Document only ↗</button></div> : record.verdict ? <button className="btn-primary mb-6" onClick={onEnter}>Enter the courtroom</button> : null}
        {children}
      </section>

      {active && <section ref={room} tabIndex={-1} className={styles.room} aria-label="Live courtroom"
        style={{ ["--console-height" as string]: `${consoleHeight}px` }}>
        <div className={styles.canvas}>
          <RoomBoundary onUnavailable={markReady}>
            <Scene view={view} lighting={lighting} reset={reset} speech={null} onReady={markReady}
              judge={{ motion: hearing.beat?.judge ?? motion, take: settled ? poseTake : hearing.take, paused: hearing.suspended, reducedMotion, onComplete: settled ? finishPose : noOp }}
              cast={{ plaintiff: { id: cast.plaintiff, motion: hearing.beat?.plaintiff ?? "idle", take: hearing.take }, defendant: { id: cast.defendant, motion: hearing.beat?.defendant ?? "idle", take: hearing.take }, paused: hearing.suspended, reducedMotion }} />
          </RoomBoundary>
        </div>
        <header className={styles.roomTop}>
          <div><span className={styles.eyebrow}>COURTROOM NO. 01</span><p>{settled ? "Court is adjourned." : "A matter of utmost importance."}</p></div>
          <Link href="/docket" aria-label="Leave courtroom for the docket">Docket ↗</Link>
        </header>
        <div className={styles.caseLabel}>{record.plaintiff} <em>v.</em> {record.defendant}</div>
        {!settled ? <div className={styles.delivery}>
          <div className={styles.caption} role="status" aria-live="polite" aria-atomic="true">
            <div className={styles.speaker}>{speaker && speaker !== "judge" && <img src={`/characters/previews/character-${cast[speaker]}.png`} alt="" width={36} height={36} />}<span>{speaker ? speakerName : "THE BENCH IS DELIBERATING"}</span><small>{hearing.beat?.caption}</small></div>
            <p>{!ready ? "The clerk is opening the courtroom…" : hearing.beat?.line ?? (pending ? "The judge is considering the statements and preparing the order. Please remain in the room." : "The court will deliver its opinion shortly.")}</p>
          </div>
          {stage === "verdict" && hearing.audioMode === "blocked" ? <div className={styles.audioPrompt}><span>Ready to hear the judge?</span><button onClick={hearing.playAudio}>Play the ruling</button><button onClick={hearing.continueSilently}>Continue without audio</button></div> : null}
          {hearing.audioNotice && stage === "verdict" ? <p className={styles.audioNotice}>{hearing.audioNotice}</p> : null}
          <div className={styles.transport}>
            <span>{stage === "opening" ? "01 / THE STATEMENTS" : stage === "waiting" ? "02 / DELIBERATION" : stage === "verdict" ? "03 / THE RULING" : "04 / ADJOURNMENT"}</span>
            <div><button onClick={() => hearing.setPaused(value => !value)}>{hearing.paused ? "Resume hearing" : "Pause hearing"}</button><button onClick={hearing.skip} disabled={stage === "waiting" && pending}>Next line</button><button onClick={hearing.settle} disabled={pending}>View order</button></div>
          </div>
        </div> : <section ref={measureConsole} className={styles.console} aria-label="Courtroom controls">
          <div className={styles.consoleRow}>
            <span className={styles.eyebrow}>ANOTHER DAY IN COURT?</span>
            <div className={styles.group}>
              <button onClick={() => replay("full")} disabled={pending}>Replay hearing</button>
              <button onClick={() => replay("full", true)} disabled={pending}>A different take</button>
              <button onClick={() => replay("statements")} disabled={pending}>Statements only</button>
              <button onClick={() => replay("verdict")} disabled={pending}>Hear the verdict</button>
            </div>
          </div>
          <div className={styles.consoleRow}>
            <div className={styles.group} aria-label="Camera views">
              {VIEWS.map(shot => <button key={shot.id} aria-pressed={view === shot.id} onClick={() => { setView(shot.id); setReset(n => n + 1); }}>{shot.label}</button>)}
            </div>
            <div className={styles.group}>
              <label className={styles.selectLabel}>Scene<select value={lighting} onChange={e => setLighting(e.target.value as LightingPreset)}>{LIGHTS.map(light => <option key={light.id} value={light.id}>{light.label}</option>)}</select></label>
              <label className={styles.selectLabel}>Bench<select value={motion} onChange={e => { setMotion(e.target.value as JudgeMotion); setPoseTake(n => n + 1); setView("judge"); }}>{JUDGE_MOTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <button onClick={() => hearing.setPaused(value => !value)}>{hearing.paused ? "Resume movement" : "Pause movement"}</button>
            </div>
          </div>
        </section>}
        <audio ref={hearing.audioRef} preload="auto" />
        {record.plaintiffAudioUrl && <audio ref={hearing.plaintiffRef} preload="metadata" src={record.plaintiffAudioUrl} />}
        {record.defendantAudioUrl && <audio ref={hearing.defendantRef} preload="metadata" src={record.defendantAudioUrl} />}
      </section>}
    </div>
  );
}

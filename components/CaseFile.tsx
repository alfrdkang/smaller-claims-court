"use client";

import Link from "next/link";
import React from "react";

import { CaseCourtroom } from "@/components/courtroom/CaseCourtroom";
import { fileToDataUri } from "@/lib/client/images";
import { toggleAmbience } from "@/lib/client/sound";
import { APPELLATE, getPersona } from "@/lib/personas";
import type { Case, Verdict } from "@/lib/types";
import { MAX_EVIDENCE_ITEMS } from "@/lib/validate";

function benchName(record: Case, verdict: Verdict | undefined) {
  return verdict?.appeal ? APPELLATE.name : getPersona(record.personaId).name;
}

export function CaseFile({ initialCase }: { initialCase: Case }) {
  const [record, setRecord] = React.useState<Case>(initialCase);
  const [deliberating, setDeliberating] = React.useState(false);
  const [inCourtroom, setInCourtroom] = React.useState(initialCase.status === "judged");
  const [hearingRequest, setHearingRequest] = React.useState(0);
  const submitting = React.useRef(false);
  const controller = React.useRef<AbortController | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [ambient, setAmbient] = React.useState(false);
  const [audioBlocked, setAudioBlocked] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => () => controller.current?.abort(), []);

  const verdict = record.verdict;
  const judged = record.status === "judged";

  async function deliverJudgment(appeal = false) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setDeliberating(true);
    setInCourtroom(true);
    setHearingRequest(value => value + 1);
    audioRef.current?.pause();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 120000);
    try {
      const res = await fetch(`/api/cases/${record.id}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appeal }),
        signal: abort.signal,
      });
      const body = (await res.json()) as Case & { error?: string };
      if (!res.ok) throw new Error(body.error || "The bench could not reach a decision.");

      setRecord(body);
    } catch (err) {
      setError(abort.signal.aborted ? "The bench took too long to respond. Reload this case to check whether the order was saved before trying again." : err instanceof Error ? err.message : "The bench could not reach a decision.");
      setInCourtroom(false);
    } finally {
      window.clearTimeout(timeout);
      submitting.current = false;
      setDeliberating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Could not copy the link. Copy it from the address bar instead.");
    }
  }

  return (
    <CaseCourtroom record={record} pending={deliberating} request={hearingRequest} active={inCourtroom}
      onExit={() => setInCourtroom(false)} onEnter={() => setInCourtroom(true)}>
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Docket no. {record.caseNumber}</p>
          <h1 className="mt-3 font-display text-2xl leading-tight text-brass-200 sm:text-3xl">
            {record.plaintiff} <span className="text-oak-400">v.</span> {record.defendant}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-oak-300/70">
            Before {benchName(record, verdict)}
            {" · "}
            {judged ? (verdict?.appeal ? "Decided on appeal" : "Decided") : "Awaiting judgment"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copyLink} className="btn-ghost !px-3 !py-2 !text-[10px]">
            {copied ? "Link copied" : "Share case"}
          </button>
          <a
            href={`/api/cases/${record.id}/pdf`}
            className="btn-ghost !px-3 !py-2 !text-[10px]"
            download
          >
            Download order
          </a>
          <button
            onClick={() => setAmbient(toggleAmbience())}
            className="btn-ghost !px-3 !py-2 !text-[10px]"
            aria-pressed={ambient}
          >
            {ambient ? "Silence the room" : "Courtroom ambience"}
          </button>
        </div>
      </header>

      <CaseCaption record={record} />

      {!judged ? (
        <PreTrial
          record={record}
          onUpdate={setRecord}
          onJudge={() => void deliverJudgment(false)}
          busy={deliberating}
        />
      ) : null}

      {deliberating && !inCourtroom ? <p role="status">The court is deliberating. Please wait for the order.</p> : null}

      {error ? (
        <p className="rounded-sm border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {verdict ? (
        <div>
          <VerdictSheet
            record={record}
            verdict={verdict}
            revealing={false}
            audioRef={audioRef}
            audioBlocked={audioBlocked}
            onPlay={() => {
              setAudioBlocked(false);
              audioRef.current?.play().catch(() => setAudioBlocked(true));
            }}
            onAppeal={() => void deliverJudgment(true)}
            busy={deliberating}
          />
        </div>
      ) : null}

      {record.history.length > 0 ? <PriorRulings record={record} /> : null}

      <div className="flex justify-center pt-2">
        <Link href="/docket" className="btn-ghost !text-[10px]">
          See the full docket
        </Link>
      </div>
    </div>
    </CaseCourtroom>
  );
}

function CaseCaption({ record }: { record: Case }) {
  return (
    <section className="paper px-7 py-8 sm:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-oak-900/25 pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-oak-700">
          Statement of claim
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-oak-600">
          Filed {new Date(record.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-oak-950">
        {record.description}
      </p>

      {record.requestedDamages ? (
        <p className="mt-5 border-l-2 border-oak-900/30 pl-4 text-sm text-oak-800">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-oak-600">
            Relief sought
          </span>
          <br />
          {record.requestedDamages}
        </p>
      ) : null}

      {record.rebuttal ? (
        <div className="mt-7 rounded-sm bg-oak-900/5 p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-oak-600">
            Rebuttal of the defendant, {record.defendant}
          </span>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-oak-900">
            {record.rebuttal}
          </p>
        </div>
      ) : null}

      {record.evidence.length > 0 ? (
        <div className="mt-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-oak-700">
            Exhibits in evidence
          </span>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {record.evidence.map((item, i) => (
              <li key={item.id}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.caption || `Exhibit ${String.fromCharCode(65 + i)}`}
                    className="aspect-[4/3] w-full rounded-sm border border-oak-900/20 object-cover"
                  />
                  <figcaption className="mt-2 text-xs text-oak-700">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-oak-600">
                      Exhibit {String.fromCharCode(65 + i)}
                    </span>
                    {item.caption ? <> &middot; {item.caption}</> : null}
                    <span className="block text-[10px] text-oak-500">filed by {item.uploadedBy}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function PreTrial({
  record,
  onUpdate,
  onJudge,
  busy,
}: {
  record: Case;
  onUpdate: (c: Case) => void;
  onJudge: () => void;
  busy: boolean;
}) {
  const [rebuttal, setRebuttal] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [uploader, setUploader] = React.useState(record.defendant);
  const fileInput = React.useRef<HTMLInputElement>(null);

  async function submitRebuttal(event: React.FormEvent) {
    event.preventDefault();
    if (rebuttal.trim().length < 5) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/cases/${record.id}/rebuttal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rebuttal }),
      });
      const body = (await res.json()) as Case & { error?: string };
      if (!res.ok) throw new Error(body.error || "The clerk rejected the rebuttal.");
      onUpdate(body);
      setRebuttal("");
      setNotice("Rebuttal entered into the record.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The clerk rejected the rebuttal.");
    } finally {
      setSaving(false);
    }
  }

  async function addExhibit(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/cases/${record.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedBy: uploader.trim() || record.defendant,
          imageUrl: await fileToDataUri(file),
        }),
      });
      const body = (await res.json()) as Case & { error?: string };
      if (!res.ok) throw new Error(body.error || "The exhibit was refused.");
      onUpdate(body);
      setNotice("Exhibit entered into the record.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The exhibit was refused.");
    } finally {
      setSaving(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <section className="panel p-6">
      <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">
        Before judgment
      </h2>
      <p className="mt-2 text-sm text-oak-200/75">
        Send this page to {record.defendant}. They may answer the claim and file exhibits of their
        own. When both sides are done, submit the matter to the bench.
      </p>

      <form onSubmit={submitRebuttal} className="mt-6">
        <label className="label" htmlFor="rebuttal">
          Rebuttal of {record.defendant}
        </label>
        <textarea
          id="rebuttal"
          className="field min-h-[110px] resize-y leading-relaxed"
          value={rebuttal}
          onChange={(e) => setRebuttal(e.target.value)}
          placeholder="The label had, in fact, fallen off. I have witnesses."
          maxLength={1500}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn-ghost !px-4 !py-2 !text-[11px]"
            disabled={saving || rebuttal.trim().length < 5}
          >
            {record.rebuttal ? "Replace rebuttal" : "File rebuttal"}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void addExhibit(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="btn-ghost !px-4 !py-2 !text-[11px]"
            disabled={saving || record.evidence.length >= MAX_EVIDENCE_ITEMS}
          >
            Add exhibit ({record.evidence.length}/{MAX_EVIDENCE_ITEMS})
          </button>

          <input
            className="field !mt-0 !w-40 !py-2 !text-sm"
            value={uploader}
            onChange={(e) => setUploader(e.target.value)}
            placeholder="Filed by"
            maxLength={60}
            aria-label="Name of the party filing the exhibit"
          />
        </div>
        {notice ? <p className="mt-3 text-xs text-brass-200/90">{notice}</p> : null}
      </form>

      <div className="rule-brass my-6" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-oak-400/70">
          Judgment is irreversible. There is an appeal, but you will not enjoy it.
        </p>
        <button onClick={onJudge} className="btn-primary" disabled={busy || saving}>
          {busy ? "The court is deliberating..." : "Submit for judgment"}
        </button>
      </div>
    </section>
  );
}

function VerdictSheet({
  record,
  verdict,
  revealing,
  audioRef,
  audioBlocked,
  onPlay,
  onAppeal,
  busy,
}: {
  record: Case;
  verdict: Verdict;
  revealing: boolean;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioBlocked: boolean;
  onPlay: () => void;
  onAppeal: () => void;
  busy: boolean;
}) {
  return (
    <section className={`paper relative overflow-hidden px-7 py-9 sm:px-11 ${revealing ? "animate-fade-up" : ""}`}>
      <div
        className={`pointer-events-none absolute right-3 top-6 hidden select-none font-display text-[10px] uppercase tracking-[0.28em] text-red-800/70 sm:right-8 sm:block ${
          revealing ? "animate-seal-in" : "-rotate-12"
        }`}
        aria-hidden
      >
        <span className="block rounded-sm border-2 border-red-800/60 px-5 py-2">
          {verdict.appeal ? "Affirmed on appeal" : "Entered of record"}
        </span>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-oak-700">
        {verdict.appeal ? "Opinion and order on appeal" : "Findings, opinion and order"}
      </p>
      <h2 className="mt-3 max-w-md font-display text-xl leading-snug text-oak-950">
        {verdict.caseCitation}
      </h2>

      <div className="mt-7 space-y-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-oak-600">
            Opinion of the court
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-oak-950">{verdict.reasoning}</p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-oak-600">
            Disposition
          </p>
          <p className="mt-2 font-display text-lg leading-snug text-oak-950">{verdict.ruling}</p>
        </div>

        <div className="rounded-sm border border-oak-900/40 bg-oak-900/5 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-oak-600">
            Damages and obligations awarded
          </p>
          <p className="mt-2 font-display text-lg leading-snug text-oak-950">
            {verdict.damagesAwarded}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-oak-900/20 pt-6">
        <div>
          <p className="font-script text-3xl leading-none text-oak-900">
            {benchName(record, verdict)}
          </p>
          <p className="mt-2 w-56 border-t border-oak-900/40 pt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-oak-600">
            {verdict.appeal ? "Court of Petty Appeals" : "Judge, Smaller Claims Court"}
          </p>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-oak-600">
          Entered {new Date(verdict.deliveredAt).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" })}
        </p>
      </div>

      <div className="mt-7 space-y-4">
        {verdict.audioUrl ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-oak-600">
              As delivered from the bench
            </p>
            <audio
              ref={audioRef}
              src={verdict.audioUrl}
              controls
              preload="auto"
              className="mt-2 w-full"
            />
            {audioBlocked ? (
              <button onClick={onPlay} className="btn-primary mt-3 !py-2 !text-[11px]">
                Play the ruling aloud
              </button>
            ) : null}
          </div>
        ) : (
          <p className="rounded-sm bg-oak-900/5 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-oak-600">
            No recording available - set ELEVENLABS_API_KEY to have the bench read this aloud.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/cases/${record.id}/pdf`}
            download
            className="btn-primary !py-2.5 !text-[11px]"
          >
            Download the court order
          </a>
          {!verdict.appeal ? (
            <button onClick={onAppeal} className="btn-ghost !py-2.5 !text-[11px] !text-oak-800 !border-oak-900/40 hover:!text-oak-950" disabled={busy}>
              {busy ? "Appealing..." : "Appeal to a harsher judge"}
            </button>
          ) : (
            <span className="btn-ghost pointer-events-none !py-2.5 !text-[11px] !text-oak-600 !border-oak-900/20">
              No further appeal lies
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function PriorRulings({ record }: { record: Case }) {
  return (
    <section className="panel p-6">
      <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">
        Vacated below
      </h2>
      <ul className="mt-4 space-y-4">
        {record.history.map((old) => (
          <li key={old.deliveredAt} className="border-l-2 border-brass-600/30 pl-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-oak-300/70">
              {getPersona(old.personaId).name} &middot;{" "}
              {new Date(old.deliveredAt).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" })}
            </p>
            <p className="mt-1 font-display text-sm text-brass-200/90">{old.caseCitation}</p>
            <p className="mt-1 text-sm leading-relaxed text-oak-200/75">{old.ruling}</p>
            <p className="mt-1 text-xs text-oak-300/60">Damages: {old.damagesAwarded}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import React from "react";

import { VoiceTestimony } from "@/components/VoiceTestimony";
import { fileToDataUri } from "@/lib/client/images";
import { PERSONA_LIST } from "@/lib/personas";
import type { Case, PersonaId } from "@/lib/types";
import { MAX_EVIDENCE_ITEMS } from "@/lib/validate";

interface DraftExhibit {
  key: string;
  dataUri: string;
  caption: string;
  name: string;
}

const PLACEHOLDER =
  "On the evening of the 14th, the defendant ate the leftovers I had clearly labelled with my name and a date. When confronted, the defendant claimed the label had 'fallen off'. It had not.";

export function FileCaseForm() {
  const router = useRouter();

  const [plaintiff, setPlaintiff] = React.useState("");
  const [defendant, setDefendant] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [requestedDamages, setRequestedDamages] = React.useState("");
  const [personaId, setPersonaId] = React.useState<PersonaId>("grimsby");
  const [exhibits, setExhibits] = React.useState<DraftExhibit[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInput = React.useRef<HTMLInputElement>(null);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const room = MAX_EVIDENCE_ITEMS - exhibits.length;
    if (room <= 0) {
      setError(`This court accepts no more than ${MAX_EVIDENCE_ITEMS} exhibits.`);
      return;
    }

    const picked = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);

    const converted = await Promise.all(
      picked.map(async (file) => ({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        dataUri: await fileToDataUri(file),
        caption: "",
        name: file.name,
      })),
    );

    setExhibits((current) => [...current, ...converted]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function updateCaption(key: string, caption: string) {
    setExhibits((current) => current.map((e) => (e.key === key ? { ...e, caption } : e)));
  }

  function removeExhibit(key: string) {
    setExhibits((current) => current.filter((e) => e.key !== key));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaintiff, defendant, description, requestedDamages, personaId }),
      });
      const created = (await res.json()) as Case & { error?: string };
      if (!res.ok) throw new Error(created.error || "The clerk rejected the filing.");

      // Exhibits are attached one at a time so a single bad image can't sink the case.
      for (const exhibit of exhibits) {
        const evidenceRes = await fetch(`/api/cases/${created.id}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadedBy: plaintiff,
            imageUrl: exhibit.dataUri,
            caption: exhibit.caption,
          }),
        });
        if (!evidenceRes.ok) {
          const body = (await evidenceRes.json()) as { error?: string };
          console.warn(`[file] exhibit "${exhibit.name}" rejected:`, body.error);
        }
      }

      router.push(`/case/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong at the clerk's window.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="panel p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">
          I. The parties
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="plaintiff">
              Plaintiff (you)
            </label>
            <input
              id="plaintiff"
              className="field"
              value={plaintiff}
              onChange={(e) => setPlaintiff(e.target.value)}
              placeholder="Ada"
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="defendant">
              Defendant (them)
            </label>
            <input
              id="defendant"
              className="field"
              value={defendant}
              onChange={(e) => setDefendant(e.target.value)}
              placeholder="Grace"
              maxLength={60}
              required
            />
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">
          II. Statement of claim
        </h2>
        <div className="mt-5">
          <label className="label" htmlFor="description">
            What did they do
          </label>
          <textarea
            id="description"
            className="field min-h-[150px] resize-y leading-relaxed"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={PLACEHOLDER}
            maxLength={2000}
            required
          />
          <div className="mt-1 text-right font-mono text-[10px] text-oak-400/70">
            {description.length}/2000
          </div>
          <VoiceTestimony
            onTranscript={(text) =>
              setDescription((current) => (current ? `${current.trim()} ${text}` : text))
            }
          />
        </div>

        <div className="mt-5">
          <label className="label" htmlFor="damages">
            Relief sought
          </label>
          <input
            id="damages"
            className="field"
            value={requestedDamages}
            onChange={(e) => setRequestedDamages(e.target.value)}
            placeholder="$3, a formal apology, and she never does it again"
            maxLength={200}
          />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">
          III. Exhibits
        </h2>
        <p className="mt-2 text-sm text-oak-200/75">
          Screenshots, photographs, receipts. The judge examines each one and will describe what it
          sees. Optional, but juries love a visual.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="btn-ghost mt-4 !px-4 !py-2 !text-[11px]"
          disabled={exhibits.length >= MAX_EVIDENCE_ITEMS}
        >
          Attach exhibit ({exhibits.length}/{MAX_EVIDENCE_ITEMS})
        </button>

        {exhibits.length > 0 ? (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {exhibits.map((exhibit, i) => (
              <li key={exhibit.key} className="rounded-sm border border-brass-600/25 bg-oak-950/50 p-3">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={exhibit.dataUri}
                    alt={exhibit.name}
                    className="h-20 w-20 shrink-0 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass-300">
                        Exhibit {String.fromCharCode(65 + i)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExhibit(exhibit.key)}
                        className="font-mono text-[10px] uppercase tracking-[0.14em] text-oak-400 hover:text-red-300"
                      >
                        Withdraw
                      </button>
                    </div>
                    <input
                      className="field !mt-2 !py-1.5 !text-sm"
                      value={exhibit.caption}
                      onChange={(e) => updateCaption(exhibit.key, e.target.value)}
                      placeholder="Caption (optional)"
                      maxLength={160}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.2em] text-brass-200">
          IV. Assignment of the bench
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {PERSONA_LIST.map((persona) => {
            const active = persona.id === personaId;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setPersonaId(persona.id)}
                aria-pressed={active}
                className={`rounded-sm border p-4 text-left transition ${
                  active
                    ? "border-brass-400 bg-brass-400/10 shadow-[0_0_24px_-10px_rgba(212,171,69,0.9)]"
                    : "border-brass-600/25 hover:border-brass-500/60"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {persona.emoji}
                </span>
                <span className={`mt-2 block font-display text-sm ${persona.accent}`}>
                  {persona.name}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-oak-300/70">
                  {persona.title}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-oak-200/75">
                  {persona.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="rounded-sm border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oak-400/70">
          Filing is free. Dignity is not refundable.
        </p>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Filing..." : "File the case"}
        </button>
      </div>
    </form>
  );
}

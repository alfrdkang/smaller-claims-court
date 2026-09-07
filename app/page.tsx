import Link from "next/link";
import React from "react";

import { Gavel } from "@/components/Gavel";
import { SampleCaseButton } from "@/components/SampleCaseButton";
import { PERSONA_LIST } from "@/lib/personas";
import { COURT_NAME } from "@/lib/site";

const STEPS = [
  {
    n: "I",
    head: "File the complaint",
    body: "Name the party who wronged you. Describe the wrong. State what you believe you are owed. No sum is too small; this court has no dignity to lose.",
  },
  {
    n: "II",
    head: "Tender your evidence",
    body: "Screenshots, photographs of the sink, the receipt they never split. Both sides may file. The defendant may enter a rebuttal before judgment.",
  },
  {
    n: "III",
    head: "Receive judgment",
    body: "The bench issues findings, cites precedent that does not exist, and awards damages. The ruling is read aloud and sealed as a downloadable court order.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-24">
      <section className="relative pt-6 text-center">
        <p className="eyebrow">Now in session &middot; {COURT_NAME}</p>

        <h1 className="mt-5 font-display text-4xl leading-[1.1] text-brass-200 sm:text-6xl">
          The Smaller
          <br />
          Claims Court
        </h1>

        <div className="mx-auto mt-6 max-w-xl">
          <div className="rule-brass" />
          <p className="mt-6 text-lg leading-relaxed text-oak-200">
            A court of record for disputes that do not deserve one. Three dollars. The last slice.
            The dishes, again. Bring your grievance and an AI judge will hear it with the full,
            crushing seriousness of law that was invented for the occasion.
          </p>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link href="/file" className="btn-primary">
            File a case
          </Link>
          <SampleCaseButton />
          <Link href="/docket" className="btn-ghost">
            Public docket
          </Link>
        </div>

        <Gavel className="pointer-events-none mx-auto mt-10 h-40 w-40 opacity-90" />
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="panel p-6">
              <span className="font-display text-3xl text-brass-500/70">{step.n}</span>
              <h2 className="mt-3 font-display text-lg uppercase tracking-[0.14em] text-brass-200">
                {step.head}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-oak-200/85">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center">
          <p className="eyebrow">The bench</p>
          <h2 className="mt-3 font-display text-2xl text-brass-200">Choose your judge</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-oak-200/80">
            Each sits with a different temperament and a different voice. None of them find any of
            this funny.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {PERSONA_LIST.map((p) => (
            <article key={p.id} className="panel p-6 text-center">
              <span className="text-3xl" aria-hidden>
                {p.emoji}
              </span>
              <h3 className={`mt-3 font-display text-base ${p.accent}`}>{p.name}</h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-oak-300/70">
                {p.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-oak-200/80">{p.tagline}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="paper mx-auto max-w-2xl px-8 py-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-oak-700">
          Notice to prospective litigants
        </p>
        <p className="mt-4 font-display text-xl leading-relaxed text-oak-900">
          &ldquo;The court is unmoved by the size of the sum. The court is moved by the principle,
          which the court will now invent.&rdquo;
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-oak-600">
          Every order issues as a sealed PDF, QR code and all.
        </p>
        <div className="mt-7">
          <Link href="/file" className="btn-primary">
            Begin proceedings
          </Link>
        </div>
      </section>
    </div>
  );
}

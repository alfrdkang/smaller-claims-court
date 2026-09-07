"use client";

import { useRouter } from "next/navigation";
import React from "react";

export function SampleCaseButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function startSample() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cases/seed", { method: "POST" });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(body.error || "The sample case could not be filed.");
      if (!body.id) throw new Error("The sample case was filed without an id.");
      router.push(`/case/${body.id}`);
    } catch (err) {
      setBusy(false);
      alert(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <button
      onClick={() => void startSample()}
      disabled={busy}
      className="btn-ghost"
      aria-busy={busy}
    >
      {busy ? "Filing sample case…" : "Try a sample case"}
    </button>
  );
}

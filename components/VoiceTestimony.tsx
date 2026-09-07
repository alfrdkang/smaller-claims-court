"use client";

import React from "react";

type State = "idle" | "recording" | "transcribing";

/**
 * Record a spoken statement and hand back the transcript.
 *
 * Quietly renders nothing if the browser has no MediaRecorder (or the page is on
 * plain HTTP, where getUserMedia is blocked) - typing still works fine.
 */
export function VoiceTestimony({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = React.useState<State>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [supported, setSupported] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  React.useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );
  }, []);

  React.useEffect(() => {
    if (state !== "recording") return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setState("idle");
          setError("Nothing was recorded.");
          return;
        }

        setState("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "testimony.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const json = (await res.json()) as { text?: string; error?: string };
          if (!res.ok || !json.text) throw new Error(json.error || "Transcription failed.");
          onTranscript(json.text);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed.");
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setError("The court could not access your microphone.");
      setState("idle");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  if (!supported) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={state === "transcribing"}
        className="btn-ghost !px-4 !py-2 !text-[11px]"
      >
        {state === "recording" ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" aria-hidden />
            Stop &amp; transcribe
          </>
        ) : state === "transcribing" ? (
          "Court reporter typing..."
        ) : (
          <>
            <span aria-hidden>&#127908;</span> Testify aloud
          </>
        )}
      </button>

      {state === "recording" ? (
        <span className="font-mono text-[11px] text-brass-300">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")} on the record
        </span>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-oak-400/70">
          Transcribed into the statement below
        </span>
      )}

      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}

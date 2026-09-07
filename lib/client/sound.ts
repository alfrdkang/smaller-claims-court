"use client";

/**
 * Courtroom sound, synthesised in the browser.
 *
 * No audio assets to ship or wait on, and nothing plays until a user gesture has
 * unlocked the AudioContext, so this never fights the browser's autoplay policy.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function prefersQuiet(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Wood on wood: a short noise crack over a low body thump. */
export function gavelBang(): void {
  if (prefersQuiet()) return;
  const ac = audio();
  if (!ac) return;

  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.5;
  out.connect(ac.destination);

  // Crack: filtered white noise, very short.
  const frames = Math.floor(ac.sampleRate * 0.16);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3.2);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ac.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1750;
  bandpass.Q.value = 0.8;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.9, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  noise.connect(bandpass).connect(noiseGain).connect(out);
  noise.start(now);
  noise.stop(now + 0.18);

  // Body: a falling sine, the block resonating.
  const thump = ac.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(190, now);
  thump.frequency.exponentialRampToValueAtTime(52, now + 0.22);
  const thumpGain = ac.createGain();
  thumpGain.gain.setValueAtTime(0.75, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  thump.connect(thumpGain).connect(out);
  thump.start(now);
  thump.stop(now + 0.32);
}

let ambience: { stop: () => void } | null = null;

/** A low room tone under the verdict reveal. Call again to stop it. */
export function toggleAmbience(): boolean {
  if (ambience) {
    ambience.stop();
    ambience = null;
    return false;
  }
  const ac = audio();
  if (!ac) return false;

  const now = ac.currentTime;
  const frames = Math.floor(ac.sampleRate * 2);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frames; i++) {
    // Brown noise: a murmuring room rather than a hiss.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.2;
  }

  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const lowpass = ac.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 420;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 1.2);
  source.connect(lowpass).connect(gain).connect(ac.destination);
  source.start(now);

  ambience = {
    stop: () => {
      const t = ac.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      source.stop(t + 0.7);
    },
  };
  return true;
}

export function ambiencePlaying(): boolean {
  return ambience !== null;
}

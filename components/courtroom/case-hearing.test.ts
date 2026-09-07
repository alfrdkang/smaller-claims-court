import assert from "node:assert/strict";
import test from "node:test";
import { splitSpeech, openingBeats, verdictBeats, beatAt, advanceStage } from "./case-hearing";
import type { Case } from "../../lib/types";

const record: Case = { id: "test", caseNumber: "PC-2026-0001", plaintiff: "Ada", defendant: "Grace", description: "My lunch was labelled. It disappeared from the fridge.", requestedDamages: "A replacement lunch", personaId: "vex", evidence: [], history: [], status: "filed", createdAt: 1 };

test("speech chunks preserve every word and remain small enough for a caption", () => {
  const text = "The clearly labelled lunch belonged to me. ".repeat(50).trim();
  const parts = splitSpeech(text);
  assert.equal(parts.join(" "), text);
  assert.ok(parts.length > 1);
  assert.ok(parts.every(line => line.length <= 180));
});
test("absent rebuttal is not replaced with fabricated defendant dialogue", () => {
  const beats = openingBeats(record, 0);
  assert.equal(beats.filter(b => b.speaker === "defendant").length, 0);
  assert.ok(beats.some(b => b.caption === "No rebuttal filed"));
});
test("all staging variants preserve the actual statements", () => {
  const c = { ...record, rebuttal: "I did not take the lunch." };
  for (let i = 0; i < 3; i++) {
    const beats = openingBeats(c, i);
    assert.equal(beats.filter(b => b.speaker === "plaintiff").map(b => b.line).join(" "), c.description);
    assert.equal(beats.filter(b => b.speaker === "defendant").map(b => b.line).join(" "), c.rebuttal);
  }
});
test("verdict captions contain the real judgment, not the demonstration script", () => {
  const c: Case = { ...record, status: "judged", verdict: { caseCitation: "Lunch v. Fridge", reasoning: "There is insufficient evidence.", ruling: "Neither party prevails.", damagesAwarded: "None", audioUrl: null, personaId: "vex", deliveredAt: 2 } };
  const text = verdictBeats(c).map(b => b.line).join(" ");
  assert.ok(text.includes("There is insufficient evidence. Neither party prevails."));
  assert.ok(text.includes("Damages are awarded as follows: None."));
});
test("waiting never advances until a real verdict is available", () => {
  assert.equal(advanceStage("waiting", true, true, "full"), "waiting");
  assert.equal(advanceStage("waiting", false, false, "full"), "waiting");
  assert.equal(advanceStage("waiting", false, true, "full"), "verdict");
  assert.equal(advanceStage("opening", false, true, "statements"), "settled");
});
test("a recorded statement retimes its captions to the recording", () => {
  const c = { ...record, rebuttal: "I did not take the lunch." };
  const plain = openingBeats(c, 0);
  const timed = openingBeats(c, 0, { plaintiff: 30 });
  const spoken = (beats: typeof plain, role: string) =>
    beats.filter(b => b.speaker === role).reduce((sum, b) => sum + b.duration, 0);
  assert.ok(Math.abs(spoken(timed, "plaintiff") - 30) < 0.001);
  assert.equal(spoken(timed, "defendant"), spoken(plain, "defendant"));
  assert.equal(timed.map(b => b.line).join(" "), plain.map(b => b.line).join(" "));
});
test("chapter lookup holds a valid last beat after the timeline ends", () => {
  const beats = openingBeats(record, 0);
  assert.equal(beatAt(beats, 0).index, 0);
  assert.equal(beatAt(beats, 10000).index, beats.length - 1);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { CHARACTER_MOTIONS } from "./character-motion";
import { JUDGE_MOTIONS } from "./judge-motion";
import { HEARING, HEARING_DURATION, hearingBeatAt, hearingBeatStart } from "./hearing";

const VIEWS = ["wide", "plaintiff", "defendant", "judge"];

test("every beat names a real camera and real motions", () => {
  for (const beat of HEARING) {
    assert.ok(VIEWS.includes(beat.view), `${beat.id} camera`);
    assert.ok(JUDGE_MOTIONS.some((item) => item.id === beat.judge), `${beat.id} judge motion`);
    for (const role of ["plaintiff", "defendant"] as const) {
      assert.ok(
        CHARACTER_MOTIONS.some((item) => item.id === beat[role]),
        `${beat.id} ${role} motion`,
      );
    }
  }
});

test("a beat with a speaker has a line and a beat without one does not", () => {
  for (const beat of HEARING) {
    if (beat.speaker) assert.ok(beat.line && beat.line.length > 0, `${beat.id} has no line`);
    else assert.equal(beat.line, undefined, `${beat.id} shows a line with no speaker`);
    assert.ok(beat.caption.length > 0, `${beat.id} has no caption`);
  }
});

test("every line stays on screen long enough to read", () => {
  for (const beat of HEARING) {
    const needed = 1.5 + (beat.line?.length ?? 0) / 16;
    assert.ok(beat.duration >= needed, `${beat.id} lasts ${beat.duration}s, needs ${needed.toFixed(1)}s`);
  }
});

test("the camera points at whoever is speaking", () => {
  for (const beat of HEARING) {
    if (beat.speaker === "plaintiff") assert.equal(beat.view, "plaintiff", beat.id);
    if (beat.speaker === "defendant") assert.equal(beat.view, "defendant", beat.id);
  }
});

test("beat lookup covers the whole hearing without a gap", () => {
  assert.equal(hearingBeatAt(0).index, 0);
  let previous = -1;
  for (let time = 0; time < HEARING_DURATION; time += 0.05) {
    const { index, beat, offset, start } = hearingBeatAt(time);
    assert.ok(index >= previous, `beat order went backwards at ${time.toFixed(2)}s`);
    assert.ok(offset >= 0 && offset <= beat.duration, `offset out of range at ${time.toFixed(2)}s`);
    assert.ok(Math.abs(start + offset - time) < 1e-9, `start plus offset lost time at ${time}`);
    previous = index;
  }
  assert.equal(previous, HEARING.length - 1);
});

test("time past the end holds the last beat", () => {
  const end = hearingBeatAt(HEARING_DURATION + 30);
  assert.equal(end.index, HEARING.length - 1);
  assert.equal(end.offset, HEARING[HEARING.length - 1].duration);
});

test("beat starts match the running total", () => {
  let total = 0;
  HEARING.forEach((beat, index) => {
    assert.equal(hearingBeatStart(index), total, beat.id);
    total += beat.duration;
  });
  assert.equal(total, HEARING_DURATION);
});

test("the hearing opens with the gavel and ends with both parties reacting", () => {
  assert.equal(HEARING[0].judge, "gavel");
  const last = HEARING[HEARING.length - 1];
  assert.notEqual(last.plaintiff, last.defendant);
  assert.ok(["triumphant", "dejected"].includes(last.plaintiff));
  assert.ok(["triumphant", "dejected"].includes(last.defendant));
});

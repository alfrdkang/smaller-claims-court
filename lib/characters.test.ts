import assert from "node:assert/strict";
import test from "node:test";
import { NewCaseSchema } from "./validate";
import { createCase, getCase } from "./store";

const input = { plaintiff: "Ada", defendant: "Grace", description: "Someone ate my clearly labelled lunch." };

test("older filing payloads receive a usable default cast", () => {
  const parsed = NewCaseSchema.parse(input);
  assert.equal(parsed.plaintiffCharacter, "a");
  assert.equal(parsed.defendantCharacter, "a");
});

test("filing rejects character IDs that cannot resolve to local assets", () => {
  assert.equal(NewCaseSchema.safeParse({ ...input, defendantCharacter: "../bad" }).success, false);
});

test("filed character choices survive storing and loading the case", async () => {
  const parsed = NewCaseSchema.parse({ ...input, plaintiffCharacter: "c", defendantCharacter: "r" });
  const saved = await createCase(parsed);
  const loaded = await getCase(saved.id);
  assert.equal(loaded?.plaintiffCharacter, "c");
  assert.equal(loaded?.defendantCharacter, "r");
});

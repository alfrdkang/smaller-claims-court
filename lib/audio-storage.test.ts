import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

class FakeRedis {
  readonly values = new Map<string, string>();

  async fetch(_input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const command = JSON.parse(String(init?.body)) as string[];
    const [operation, key, value] = command;
    let result: string | null = null;

    if (operation === "SET") {
      this.values.set(key, value);
      result = "OK";
    } else if (operation === "GET") {
      result = this.values.get(key) ?? null;
    } else {
      return Response.json({ error: `Unsupported command: ${operation}` });
    }

    return Response.json({ result });
  }
}

const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const previousFetch = globalThis.fetch;
const fakeRedis = new FakeRedis();

process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
globalThis.fetch = fakeRedis.fetch.bind(fakeRedis);

let getAudio: typeof import("./store").getAudio;
let putAudio: typeof import("./store").putAudio;
let getAudioResponse: typeof import("../app/api/cases/[id]/audio/route").GET;

type StoreGlobal = typeof globalThis & {
  __pettyCourtStore?: { audio: Map<string, unknown> };
};

function evictAudioCache(): void {
  (globalThis as StoreGlobal).__pettyCourtStore?.audio.clear();
}

before(async () => {
  ({ getAudio, putAudio } = await import("./store"));
  ({ GET: getAudioResponse } = await import("../app/api/cases/[id]/audio/route"));
});

beforeEach(() => {
  fakeRedis.values.clear();
  evictAudioCache();
});

after(() => {
  if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
  if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  globalThis.fetch = previousFetch;
});

test("oversized audio survives process-cache eviction", async () => {
  const bytes = Buffer.alloc(720_000, 173);

  await putAudio("large-case", bytes, "audio/mpeg", "original");
  evictAudioCache();

  const loaded = await getAudio("large-case", "original");
  assert.ok(loaded);
  assert.equal(loaded.contentType, "audio/mpeg");
  assert.deepEqual(Buffer.from(loaded.base64, "base64"), bytes);
});

test("versioned audio keeps the original ruling after an appeal", async () => {
  const original = Buffer.from("original ruling");
  const appeal = Buffer.from("appeal ruling");

  await putAudio("appealed-case", original, "audio/mpeg", "100");
  await putAudio("appealed-case", appeal, "audio/mpeg", "200");
  evictAudioCache();

  assert.deepEqual(
    Buffer.from((await getAudio("appealed-case", "100"))!.base64, "base64"),
    original,
  );
  assert.deepEqual(
    Buffer.from((await getAudio("appealed-case", "200"))!.base64, "base64"),
    appeal,
  );
  assert.deepEqual(Buffer.from((await getAudio("appealed-case"))!.base64, "base64"), appeal);
});

test("legacy unversioned Redis recordings remain readable", async () => {
  fakeRedis.values.set(
    "petty:audio:legacy-case",
    JSON.stringify({ base64: Buffer.from("legacy ruling").toString("base64"), contentType: "audio/mpeg" }),
  );

  const loaded = await getAudio("legacy-case", "old-url-version");

  assert.ok(loaded);
  assert.equal(Buffer.from(loaded.base64, "base64").toString(), "legacy ruling");
});

test("the audio route serves the version requested by an immutable URL", async () => {
  await putAudio("route-case", Buffer.from("original route ruling"), "audio/mpeg", "100");
  await putAudio("route-case", Buffer.from("appeal route ruling"), "audio/mpeg", "200");

  const response = await getAudioResponse(
    new Request("https://court.test/api/cases/route-case/audio?v=100"),
    { params: Promise.resolve({ id: "route-case" }) },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "audio/mpeg");
  assert.equal(Buffer.from(await response.arrayBuffer()).toString(), "original route ruling");
});

test("an incomplete persisted recording is treated as missing", async () => {
  await putAudio("partial-case", Buffer.alloc(720_000, 61), "audio/mpeg", "300");
  evictAudioCache();

  const chunkKey = [...fakeRedis.values.keys()].find((key) => key.includes("partial-case") && key.includes("chunk"));
  assert.ok(chunkKey, "test setup did not persist audio chunks");
  fakeRedis.values.delete(chunkKey);

  assert.equal(await getAudio("partial-case", "300"), null);
});

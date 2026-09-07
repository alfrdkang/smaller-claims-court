import type { Case, PersonaId } from "./types";
import { loadAudio, persistAudio, type StoredAudio } from "./audio-storage";

export type { StoredAudio } from "./audio-storage";

/**
 * Case storage.
 *
 * Default driver is in-process memory: zero setup, perfect for a laptop demo,
 * but it does NOT survive a serverless cold start. If UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set, cases are mirrored to Redis so shareable
 * links keep working across Vercel lambdas. Memory always acts as a read cache.
 */

interface MemoryState {
  cases: Map<string, Case>;
  audio: Map<string, StoredAudio>;
  counter: number;
}

const globalForStore = globalThis as unknown as { __pettyCourtStore?: MemoryState };

const mem: MemoryState =
  globalForStore.__pettyCourtStore ??
  (globalForStore.__pettyCourtStore = { cases: new Map(), audio: new Map(), counter: 0 });

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisEnabled = Boolean(REDIS_URL && REDIS_TOKEN);

/** Upstash REST: POST a command as a JSON array. Returns `result`, or null on failure. */
async function redis<T = unknown>(...command: (string | number)[]): Promise<T | null> {
  if (!redisEnabled) return null;
  try {
    const res = await fetch(REDIS_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command.map(String)),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[store] redis ${command[0]} failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) {
      console.warn(`[store] redis ${command[0]} error: ${json.error}`);
      return null;
    }
    return (json.result ?? null) as T | null;
  } catch (err) {
    console.warn(`[store] redis ${command[0]} unreachable:`, err);
    return null;
  }
}

const caseKey = (id: string) => `petty:case:${id}`;
const INDEX_KEY = "petty:docket";
const COUNTER_KEY = "petty:counter";

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newId(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
  return out;
}

async function nextCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  let seq: number;
  const fromRedis = await redis<number>("INCR", COUNTER_KEY);
  if (typeof fromRedis === "number") {
    seq = fromRedis;
    mem.counter = Math.max(mem.counter, fromRedis);
  } else {
    seq = ++mem.counter;
  }
  return `PC-${year}-${String(seq).padStart(4, "0")}`;
}

export interface NewCaseInput {
  plaintiffCharacter?: string;
  defendantCharacter?: string;
  plaintiff: string;
  defendant: string;
  description: string;
  requestedDamages: string;
  personaId: PersonaId;
}

export async function createCase(input: NewCaseInput): Promise<Case> {
  const now = Date.now();
  const record: Case = {
    id: newId(),
    caseNumber: await nextCaseNumber(),
    plaintiff: input.plaintiff,
    defendant: input.defendant,
    description: input.description,
    requestedDamages: input.requestedDamages,
    personaId: input.personaId,
    plaintiffCharacter: input.plaintiffCharacter ?? "a",
    defendantCharacter: input.defendantCharacter ?? "a",
    evidence: [],
    status: "filed",
    history: [],
    createdAt: now,
  };
  mem.cases.set(record.id, record);
  await Promise.all([
    redis("SET", caseKey(record.id), JSON.stringify(record)),
    redis("ZADD", INDEX_KEY, now, record.id),
  ]);
  return record;
}

export async function getCase(id: string): Promise<Case | null> {
  const raw = await redis<string>("GET", caseKey(id));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Case;
      mem.cases.set(id, parsed);
      return parsed;
    } catch {
      /* fall through to memory */
    }
  }
  return mem.cases.get(id) ?? null;
}

/**
 * Read-modify-write. Mutate the draft in place (or return a replacement) and the
 * result is persisted. Returns null if the case does not exist.
 */
export async function updateCase(
  id: string,
  mutate: (draft: Case) => Case | void | Promise<Case | void>,
): Promise<Case | null> {
  const existing = await getCase(id);
  if (!existing) return null;
  const draft: Case = structuredClone(existing);
  const replaced = await mutate(draft);
  const next = replaced ?? draft;
  mem.cases.set(id, next);
  await redis("SET", caseKey(id), JSON.stringify(next));
  return next;
}

/** Newest first. */
export async function listCases(limit = 100): Promise<Case[]> {
  const ids = await redis<string[]>("ZRANGE", INDEX_KEY, 0, limit - 1, "REV");
  if (ids && ids.length) {
    const loaded = await Promise.all(ids.map((id) => getCase(id)));
    return loaded.filter((c): c is Case => c !== null);
  }
  return [...mem.cases.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function putAudio(
  id: string,
  audio: Buffer,
  contentType: string,
  version?: string | number,
): Promise<void> {
  await persistAudio(redis, mem.audio, id, audio, contentType, version);
}

export async function getAudio(
  id: string,
  version?: string | number,
): Promise<StoredAudio | null> {
  return loadAudio(redis, mem.audio, id, version);
}

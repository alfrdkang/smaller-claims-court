export interface StoredAudio {
  base64: string;
  contentType: string;
}

export type RedisCommand = <T = unknown>(...command: (string | number)[]) => Promise<T | null>;

interface AudioManifest {
  schema: 1;
  chunks: number;
  base64Length: number;
  contentType: string;
}

// Keep each Upstash REST request comfortably below its roughly 1 MB body limit.
const AUDIO_CHUNK_BASE64_LENGTH = 700_000;
// Reject corrupt or hostile manifests before issuing an unbounded number of reads.
const MAX_AUDIO_CHUNKS = 256;

const legacyKey = (id: string) => `petty:audio:${id}`;
const currentVersionKey = (id: string) => `${legacyKey(id)}:current`;
const versionKey = (id: string, version: string) =>
  `${legacyKey(id)}:v:${encodeURIComponent(version)}`;
const manifestKey = (id: string, version: string) => `${versionKey(id, version)}:manifest`;
const chunkKey = (id: string, version: string, index: number) =>
  `${versionKey(id, version)}:chunk:${index}`;
const memoryKey = (id: string, version?: string) =>
  version === undefined ? id : `${id}\0${version}`;

function parseManifest(raw: string): AudioManifest | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AudioManifest>;
    if (
      parsed.schema !== 1 ||
      !Number.isInteger(parsed.chunks) ||
      parsed.chunks! < 1 ||
      parsed.chunks! > MAX_AUDIO_CHUNKS ||
      !Number.isInteger(parsed.base64Length) ||
      parsed.base64Length! < 0 ||
      typeof parsed.contentType !== "string" ||
      !parsed.contentType
    ) {
      return null;
    }
    return parsed as AudioManifest;
  } catch {
    return null;
  }
}

async function readVersionedAudio(
  redis: RedisCommand,
  id: string,
  version: string,
): Promise<{ found: boolean; audio: StoredAudio | null }> {
  const rawManifest = await redis<string>("GET", manifestKey(id, version));
  if (!rawManifest) return { found: false, audio: null };

  const manifest = parseManifest(rawManifest);
  if (!manifest) return { found: true, audio: null };

  const chunks: string[] = [];
  for (let index = 0; index < manifest.chunks; index += 1) {
    const chunk = await redis<string>("GET", chunkKey(id, version, index));
    if (chunk === null) return { found: true, audio: null };
    chunks.push(chunk);
  }

  const base64 = chunks.join("");
  if (base64.length !== manifest.base64Length) return { found: true, audio: null };
  return { found: true, audio: { base64, contentType: manifest.contentType } };
}

async function readLegacyAudio(redis: RedisCommand, id: string): Promise<StoredAudio | null> {
  const raw = await redis<string>("GET", legacyKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAudio>;
    if (typeof parsed.base64 !== "string" || typeof parsed.contentType !== "string") return null;
    return parsed as StoredAudio;
  } catch {
    return null;
  }
}

export async function persistAudio(
  redis: RedisCommand,
  memory: Map<string, StoredAudio>,
  id: string,
  audio: Buffer,
  contentType: string,
  version?: string | number,
): Promise<void> {
  const base64 = audio.toString("base64");
  const stored = { base64, contentType };
  const normalizedVersion = version === undefined ? "unversioned" : String(version);
  memory.set(memoryKey(id, normalizedVersion), stored);
  memory.set(memoryKey(id), stored);

  const chunks = Math.ceil(base64.length / AUDIO_CHUNK_BASE64_LENGTH) || 1;
  if (chunks > MAX_AUDIO_CHUNKS) return;

  for (let index = 0; index < chunks; index += 1) {
    const chunk = base64.slice(
      index * AUDIO_CHUNK_BASE64_LENGTH,
      (index + 1) * AUDIO_CHUNK_BASE64_LENGTH,
    );
    const result = await redis<string>("SET", chunkKey(id, normalizedVersion, index), chunk);
    if (result === null) return;
  }

  const manifest: AudioManifest = {
    schema: 1,
    chunks,
    base64Length: base64.length,
    contentType,
  };
  const manifestResult = await redis<string>(
    "SET",
    manifestKey(id, normalizedVersion),
    JSON.stringify(manifest),
  );
  if (manifestResult === null) return;
  await redis("SET", currentVersionKey(id), normalizedVersion);
}

export async function loadAudio(
  redis: RedisCommand,
  memory: Map<string, StoredAudio>,
  id: string,
  version?: string | number,
): Promise<StoredAudio | null> {
  const normalizedVersion = version === undefined ? undefined : String(version);
  const cached = memory.get(memoryKey(id, normalizedVersion));
  if (cached) return cached;

  if (normalizedVersion !== undefined) {
    const versioned = await readVersionedAudio(redis, id, normalizedVersion);
    if (versioned.found) {
      if (versioned.audio) memory.set(memoryKey(id, normalizedVersion), versioned.audio);
      return versioned.audio;
    }

    const currentVersion = await redis<string>("GET", currentVersionKey(id));
    if (currentVersion !== null) return null;
  } else {
    const currentVersion = await redis<string>("GET", currentVersionKey(id));
    if (currentVersion !== null) {
      const versioned = await readVersionedAudio(redis, id, currentVersion);
      if (!versioned.audio) return null;
      memory.set(memoryKey(id), versioned.audio);
      memory.set(memoryKey(id, currentVersion), versioned.audio);
      return versioned.audio;
    }
  }

  const legacy = await readLegacyAudio(redis, id);
  if (legacy) memory.set(memoryKey(id, normalizedVersion), legacy);
  return legacy;
}

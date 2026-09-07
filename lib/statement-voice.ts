import { putAudio, updateCase } from "./store";
import type { Case } from "./types";
import { AUDIO_CONTENT_TYPE, PARTY_VOICES, speakStatement } from "./voice";

export type PartyRole = "plaintiff" | "defendant";

/** Statement recordings share the audio store, namespaced by role. */
export const statementAudioKey = (id: string, role: PartyRole) => `${id}:${role}`;

/**
 * Synthesise one party's statement and attach its URL to the case. Failures are
 * swallowed: the hearing reads the statement from the record either way.
 */
export async function recordStatement(
  id: string,
  role: PartyRole,
  text: string,
): Promise<Case | null> {
  const audio = await speakStatement(text, PARTY_VOICES[role]);
  if (!audio) return null;
  const version = Date.now();
  await putAudio(statementAudioKey(id, role), audio, AUDIO_CONTENT_TYPE, version);
  return updateCase(id, (draft) => {
    draft[role === "plaintiff" ? "plaintiffAudioUrl" : "defendantAudioUrl"] =
      `/api/cases/${id}/audio?role=${role}&v=${version}`;
  });
}

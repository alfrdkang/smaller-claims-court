export const CHARACTER_IDS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export function caseCast(record: { plaintiffCharacter?: string; defendantCharacter?: string }) {
  const valid = (id: string | undefined, fallback: CharacterId): CharacterId =>
    CHARACTER_IDS.includes(id as CharacterId) ? (id as CharacterId) : fallback;
  return { plaintiff: valid(record.plaintiffCharacter, "a"), defendant: valid(record.defendantCharacter, "a") };
}

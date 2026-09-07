"use client";

import { CHARACTER_IDS, type CharacterId } from "@/lib/characters";
import styles from "./character-picker.module.css";

export function CharacterPicker({ label, value, onChange }: {
  label: string;
  value: CharacterId;
  onChange: (id: CharacterId) => void;
}) {
  return (
    <fieldset className={styles.picker}>
      <legend>{label}</legend>
      <div className={styles.options}>
        {CHARACTER_IDS.map((id) => (
          <label key={id} className={styles.option} data-selected={value === id}>
            <input type="radio" name={label} value={id} checked={value === id}
              onChange={() => onChange(id)} aria-label={`${label}: character ${id.toUpperCase()}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/characters/previews/character-${id}.png`} alt="" width={48} height={48} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

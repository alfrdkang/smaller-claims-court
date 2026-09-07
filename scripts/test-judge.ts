/**
 * Exercise the judge prompt on its own, before any UI is involved.
 *
 *   npm run judge:test
 *   npm run judge:test -- "he ate my leftovers" --persona vex --speak
 *
 * Reads .env.local / .env for keys. Requires ANTHROPIC_API_KEY. Pass --speak to
 * also render the audio with ElevenLabs (needs ELEVENLABS_API_KEY) into ./out/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import type { Case, PersonaId } from "../lib/types";

const SAMPLES = [
  {
    plaintiff: "Ada",
    defendant: "Grace",
    description:
      "I labelled my pad thai with my name and the date. Grace ate it. When confronted she said the label 'must have fallen off'. The label was still on the container, in the bin, under her fork.",
    damages: "$14 and a public apology in the group chat",
  },
  {
    plaintiff: "Marcus",
    defendant: "Priya",
    description:
      "Priya has left the same single mug in the sink for eleven consecutive days. I have photographed it daily. On day seven it developed an ecosystem. She says she is 'letting it soak'.",
    damages: "She washes every dish in the flat for a month",
  },
  {
    plaintiff: "Tom",
    defendant: "Dev",
    description:
      "Dev owes me $3 from a bubble tea in March. He has since bought a $1,400 mechanical keyboard, a standing desk, and a second monitor. He says he 'doesn't have cash on him'.",
    damages: "$3, plus interest, plus damages for emotional distress",
  },
];

/**
 * Next loads .env.local for the app; a bare tsx script gets nothing, so read the
 * same files here. Real environment variables always win.
 *
 * This must run before the app modules are imported, because several of them read
 * process.env at module scope - hence the dynamic imports in main().
 */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (value && process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  }
}

function draft(sample: (typeof SAMPLES)[number], personaId: PersonaId, index: number): Case {
  return {
    id: `test${index}`,
    caseNumber: `PC-TEST-${String(index + 1).padStart(4, "0")}`,
    plaintiff: sample.plaintiff,
    defendant: sample.defendant,
    description: sample.description,
    requestedDamages: sample.damages,
    personaId,
    evidence: [],
    status: "filed",
    history: [],
    createdAt: Date.now(),
  };
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

async function main() {
  loadEnvFiles();

  const [{ renderJudgment, spokenRuling, JudgeError, JUDGE_MODEL }, { getPersona, PERSONAS }, { speakRuling }] =
    await Promise.all([import("../lib/judge"), import("../lib/personas"), import("../lib/voice")]);

  const args = process.argv.slice(2);
  const speak = args.includes("--speak");

  const personaFlag = args.indexOf("--persona");
  const personaId = (
    personaFlag >= 0 && (args[personaFlag + 1] ?? "") in PERSONAS
      ? args[personaFlag + 1]
      : "grimsby"
  ) as PersonaId;

  // Anything that is not a flag, or a flag's value, is the custom dispute text.
  const consumed = new Set(personaFlag >= 0 ? [personaFlag, personaFlag + 1] : []);
  const custom = args.find((a, i) => !consumed.has(i) && !a.startsWith("--"));

  const cases = custom
    ? [
        draft(
          {
            plaintiff: "Plaintiff",
            defendant: "Defendant",
            description: custom,
            damages: "whatever the court deems fit",
          },
          personaId,
          0,
        ),
      ]
    : SAMPLES.map((s, i) => draft(s, personaId, i));

  console.log(`Model: ${JUDGE_MODEL}`);
  console.log(`Bench: ${getPersona(personaId).name}\n`);

  try {
    for (const record of cases) {
      const started = Date.now();
      const verdict = await renderJudgment(record);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);

      const total =
        wordCount(verdict.caseCitation) +
        wordCount(verdict.reasoning) +
        wordCount(verdict.ruling) +
        wordCount(verdict.damagesAwarded);

      console.log("=".repeat(74));
      console.log(`${record.plaintiff} v. ${record.defendant}  (${elapsed}s, ${total} words)`);
      console.log("=".repeat(74));
      console.log(`CITATION  ${verdict.caseCitation}`);
      console.log(`REASONING ${verdict.reasoning}`);
      console.log(`RULING    ${verdict.ruling}`);
      console.log(`DAMAGES   ${verdict.damagesAwarded}`);
      if (total > 150) console.log(`\n  ! over the 150-word budget (${total})`);

      if (speak) {
        const audio = await speakRuling(
          spokenRuling(verdict, record),
          getPersona(personaId).voiceId,
        );
        if (audio) {
          mkdirSync("out", { recursive: true });
          const path = `out/${record.caseNumber}.mp3`;
          writeFileSync(path, audio);
          console.log(`\n  audio -> ${path} (${(audio.length / 1024).toFixed(0)} KB)`);
        } else {
          console.log("\n  ! no audio produced");
        }
      }
      console.log();
    }
  } catch (err) {
    if (err instanceof JudgeError) {
      console.error(`\n${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

# The Smaller Claims Court

A court of record for disputes that do not deserve one.

v1 made by John claude

Friends sue each other over $3, stolen leftovers, and the mug that has been in the
sink for eleven days. Both sides file evidence. An AI judge reads the case, invents
binding precedent, and hands down a ruling with total sincerity — which it then
reads aloud in a stern voice and seals as a downloadable court order, QR code and all.

The joke is the format, played completely straight.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # add OPENAI_API_KEY or ANTHROPIC_API_KEY (and ELEVENLABS_API_KEY)
npm run dev                    # http://localhost:3000
```

The only strictly required key is `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. OpenAI is
used when both are present. Without `ELEVENLABS_API_KEY` everything still works —
rulings are simply delivered in silence, and the "testify aloud" button hides itself.

Before wiring up any UI, you can exercise the judge on its own:

```bash
npm run judge:test                                        # three sample disputes
npm run judge:test -- "he ate my leftovers" --persona vex --speak
```

`--speak` also renders the audio to `./out/*.mp3`, so you can hear the delivery
before you trust it to a live room.

---

## How it works

```
File a case  ->  Tender evidence  ->  Submit for judgment  ->  Verdict + audio + PDF
   /file          /case/[id]            POST .../judge            /case/[id]
```

1. **File** — plaintiff, defendant, the grievance, the relief sought, and which of
   three judges hears it. Images are downscaled in the browser before upload.
2. **Answer** — send the case link to the defendant. They may file a rebuttal and
   exhibits of their own before the matter goes up.
3. **Judge** — Claude reads the pleadings *and looks at the exhibits* (they are sent
   as vision input), then returns a structured verdict: citation, reasoning, ruling,
   damages.
4. **Deliver** — ElevenLabs reads the ruling in the judge's voice; the page slams a
   gavel, stamps the order, and autoplays it.
5. **Seal** — the order downloads as a letterhead PDF with a QR code back to the
   live case page.
6. **Appeal** — one button re-hears the case before a markedly angrier appellate
   judge. The vacated ruling stays on the record.

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 3 |
| Judge | OpenAI (`gpt-4o`) or Anthropic (`claude-opus-5`), structured outputs with Zod |
| Voice | ElevenLabs `eleven_flash_v2_5` (TTS) and `scribe_v1` (voice testimony) |
| PDF | `@react-pdf/renderer` + `qrcode`, rendered server-side |
| Sound FX | Web Audio, synthesised in the browser — no assets to ship |
| Storage | In-process memory, optionally mirrored to Upstash Redis |

---

## Configuration

Every variable is optional except `ANTHROPIC_API_KEY`. See `.env.example` for the
full annotated list.

| Variable | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | **Required** (or `ANTHROPIC_API_KEY`). Seats the bench. OpenAI is preferred if both are set. |
| `ANTHROPIC_API_KEY` | **Required** (or `OPENAI_API_KEY`). Seats the bench. |
| `ELEVENLABS_API_KEY` | Spoken verdicts and voice testimony. |
| `NEXT_PUBLIC_COURT_NAME` | Appears in the header and on the PDF letterhead — set it to your event. |
| `NEXT_PUBLIC_BASE_URL` | Only if share links / QR codes must not use the request host. |
| `JUDGE_EFFORT` | `low` (default) is snappy for a live demo; `medium`/`high` write more elaborate rulings, more slowly. |
| `JUDGE_MODEL` | Defaults to `claude-opus-5`. |
| `ELEVENLABS_VOICE_*` | Swap the voice for any judge without touching code. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Persistence — see below. |

### Persistence

By default cases live in process memory. That is ideal on a laptop and fine for a
single-instance deploy, but on serverless a share link can land on a cold lambda
that has never heard of the case. Set the two Upstash variables and every case,
verdict and audio clip is mirrored to Redis, with memory kept as a read cache.
Nothing else changes.

---

## API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/cases` | File a case |
| `GET` | `/api/cases` | Every case, as summaries |
| `GET` | `/api/cases/:id` | Full case file, verdict included |
| `POST` | `/api/cases/:id/evidence` | Attach an exhibit (base64 image data URI) |
| `POST` | `/api/cases/:id/rebuttal` | The defendant's answer |
| `POST` | `/api/cases/:id/judge` | Run the judge. `{ "appeal": true }` re-hears it on appeal |
| `GET` | `/api/cases/:id/audio` | The ruling as delivered (audio/mpeg) |
| `GET` | `/api/cases/:id/pdf` | The sealed court order |
| `GET` | `/api/docket` | Public record plus most-sued / most-litigious standings |
| `POST` | `/api/transcribe` | Multipart `audio` -> transcript, for spoken testimony |

Judging an already-decided case is a no-op unless `appeal` is set, so a double-click
never costs you a second ruling.

---

## The judge

`lib/judge.ts` holds the whole thing. It speaks to either OpenAI or Anthropic using
the same system prompt and the same Zod schema, so you can seat whichever provider
you have a key for. The provider is picked automatically from the env vars
(`OPENAI_API_KEY` takes precedence).

```ts
{ caseCitation, reasoning, ruling, damagesAwarded }
```

Structured outputs (`output_config.format`) mean the four fields always come back
parsed — there is no JSON to coax out of prose. The prompt caps total output at
~150 words so the audio clip stays short enough to play in a room. Three judges are
defined in `lib/personas.ts`, plus an appellate bench; adding a fourth is a matter
of one object and one voice id.

---

## Deploying

```bash
npx vercel        # then add the env vars in the project settings
```

Push to GitHub and import the repo, or deploy from the CLI. Set at minimum
`ANTHROPIC_API_KEY`, and set the Upstash pair if share links need to survive cold
starts. `NEXT_PUBLIC_BASE_URL` is unnecessary — Vercel's own deployment URL is
picked up automatically.

---

## Running the demo

- Have one real, mildly funny dispute of your own **already filed** before you start,
  so you are not typing while an audience watches.
- Then take a suggestion from the room and file it live. That is the moment that
  sells it as real rather than scripted.
- Let the verdict audio play out. Do not talk over it — the deadpan delivery is the
  punchline.
- Finish by handing someone the PDF, or letting them scan the QR code off it. A
  physical artefact makes the joke land as official.
- `/docket` on a second screen doubles as a live leaderboard of who has been sued
  the most.

---

## Notes

- Evidence images are downscaled to 1400px JPEG in the browser, capped at six
  exhibits per case; the judge is shown the first four.
- The gavel bang and courtroom ambience are synthesised with the Web Audio API, so
  there are no audio files in the repo and nothing to wait on.
- Everything respects `prefers-reduced-motion`.
- The parties are consenting friends. The prompt tells the bench to be witheringly
  formal about the conduct in the dispute and nothing else.

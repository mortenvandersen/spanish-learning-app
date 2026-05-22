# Spanish Learning App

A personal Spanish learning app for iOS and Android, built with Expo and React Native. The user reads curated passages, captures unknown words with a tap, and studies them through spaced-repetition flashcards and a memory matching game. Grammar reference pages give context to forms encountered while reading.

This file is the persistent context for Claude Code. Read it at the start of every session before making changes.

---

## Scope (v1 + v1.5)

### v1 — Core reading and study loop

1. **Reading with tap-to-translate.** Curated Spanish passages stored in Supabase. User taps any word to see translation, part of speech, and example usage. Captured words are visually marked in the passage. Tapped tokens are run through a clitic-stripping preprocessor before dictionary lookup (see *Key design decisions*); this is what makes forms like *dámelo* and *haciéndome* resolve correctly.
2. **Tap-to-add to flashcards.** From the translation popover, user adds the word to their personal deck. Already-captured words show "in deck" instead of "add."
3. **Spaced repetition flashcards.** SM-2 algorithm. User sees English, recalls Spanish, rates self ("again / hard / good / easy"). Audio playback via `expo-speech`.
4. **Memory matching game.** Grid of Spanish-English pairs drawn from the user's captured words. Eight pairs per round.

### v1.5 — Grammar reference layer

5. **Grammar topic pages.** 10–15 short reference pages on key topics (ser vs. estar, preterite vs. imperfect, subjunctive intro, por vs. para, etc.). Markdown content, browsable from a Grammar tab.
6. **"Why this form?" deep links.** In the Reading popover, words that exemplify a notable grammar feature (irregular verbs, subjunctive forms, etc.) show a link that jumps to the relevant grammar page.

### Explicitly out of scope for now

- Cloze sentences, dictation, sentence scramble, and other sentence-based exercises (v2)
- Tagged sentence bank (v2)
- File upload / PDF import (v3)
- Multi-user social features (leaderboards, shared decks)
- AI conversation practice
- Offline mode beyond what Expo provides by default

---

## Stack

- **Framework:** Expo SDK 52 (React Native 0.76)
- **Language:** TypeScript, strict mode
- **Navigation:** Expo Router v4 (file-based routing)
- **State management:** Zustand for global state, React Query for server state
- **Backend:** Supabase (Postgres + Row-Level Security). **No auth in v1** — see "Identity model" below.
- **Local storage:** `expo-sqlite` reads the bundled dictionary asset; `expo-secure-store` holds the device-generated UUID used as `user_id` (never AsyncStorage for sensitive data)
- **Audio:** `expo-speech` for Spanish text-to-speech (no API keys, no cost)
- **Styling:** React Native StyleSheet API; do not use NativeWind
- **Markdown rendering:** `react-native-markdown-display` for grammar pages and passage notes
- **Testing:** Jest (via `jest-expo` preset)

---

## Project structure

```
app/                    Expo Router routes (file = route)
  (tabs)/
    read.tsx            Passage list and reader entry
    study.tsx           Flashcards
    play.tsx            Memory game
    grammar.tsx         Grammar topic list
    _layout.tsx         Tab navigator
  reader/[id].tsx       Reading view for a single passage
  grammar/[slug].tsx    Single grammar topic page
  _layout.tsx           Root layout (QueryClientProvider, SafeAreaProvider)
components/             Reusable UI (Card, WordPopover, FlipCard, etc.)
hooks/                  Custom hooks (useCapturedWords, useSRS, etc.)
stores/                 Zustand stores
services/               Supabase client, dictionary lookup, SRS algorithm, clitic preprocessor
constants/              Colors, spacing, typography tokens
content/
  grammar/              Markdown files for grammar topic pages
  dictionary/           Bundled SQLite dictionary (built by the separate data-pipeline project)
supabase/
  migrations/           Versioned SQL migrations (applied via dashboard or `supabase db push`)
types/                  Shared TypeScript types
```

---

## Data model (Supabase)

```sql
-- Reading content (admin-curated, read-only for users)
passages (
  id uuid primary key,
  title text not null,
  body text not null,
  level text check (level in ('A1','A2','B1','B2','C1')),
  notes text,                          -- e.g., "Excerpt from chapter 3 of..."
  created_at timestamptz default now()
)

-- Per-device captured words with SRS state. Two rows per captured word,
-- one per recall direction; each direction tracks its own SRS state.
-- user_id is the device-generated UUID (services/deviceId.ts), not auth.uid().
user_words (
  id uuid primary key,
  user_id uuid not null,               -- device-generated, no auth.users FK in v1
  spanish text not null,               -- the lemma, not the inflected surface form
  english text not null,
  part_of_speech text not null,        -- copied from the dictionary at capture time
  source_passage_id uuid references passages,
  source_sentence text,                -- the sentence the word was captured from (context-bound review)
  added_at timestamptz default now(),
  srs_due timestamptz not null,
  srs_interval integer not null default 1,    -- days
  srs_ease real not null default 2.5,
  srs_repetitions integer not null default 0,
  direction text not null check (direction in ('es_to_en', 'en_to_es')),
  unique (user_id, spanish, part_of_speech, direction)
)

-- Grammar topic pages stored as markdown files in /content/grammar/
-- not in Supabase, since they ship with the app.
--
-- The Spanish dictionary is bundled as a SQLite asset built by the separate
-- data-pipeline project; it is NOT a Supabase table.
```

Canonical migration: `supabase/migrations/20260514120000_initial_schema.sql`.

Row-Level Security: `passages` has a public read policy (anon + authenticated). `user_words` has RLS enabled but the policy is `USING (true) WITH CHECK (true)` — the v1 trust-the-client trade-off documented under "Identity model". All app queries must scope by `user_id` themselves (`services/userWords.ts`).

---

## Key design decisions and rationale

**Dictionary is bundled, not API-based.** A Spanish-English dictionary plus inflection table is shipped as a SQLite file produced by the separate `data-pipeline` project. Lookups are instant, work offline, cost nothing. Translation API services (Google, DeepL) are intentionally not used.

**Tap-to-translate requires clitic preprocessing.** Spanish attaches object and reflexive pronouns to imperatives, infinitives, and gerunds (*dámelo, levantarse, haciéndolo, decírselo, hablándome*). These compound forms appear **inconsistently** in the bundled inflection table — the data pipeline preserves some imperative+clitic, gerund+clitic, and reflexive-infinitive forms (*dámelo*, *haciéndolo*, *háblame*, *irse*) but drops others (*decírselo*, *levantarse*, and all unaccented variants like *damelo*). The reading layer must therefore try a direct lookup first, then fall back to clitic decomposition. When a clitic-strip fallback is required, the reading layer must:

1. Detect the pattern: a verbal stem (imperative, infinitive, or gerund) followed by one or two enclitic pronouns drawn from `{me, te, se, lo, la, le, nos, os, los, las, les}`.
2. Strip the enclitics, applying Spanish written-accent rules in reverse. Examples: *dámelo* → *da* (remove the antepenult accent that clitic attachment introduced); *hablándome* → *hablando*; *decírselo* → *decir*.
3. Look up the stripped base form in the inflections table.
4. Surface both the verb's meaning and the pronoun decomposition in the popover (so the learner understands what the clitics contributed).

This logic lives in `services/clitic.ts` and is unit-tested independently with a fixture of attested forms. Without this fallback, tap-to-translate silently fails on a large portion of natural reading material — imperative dialogue, infinitive constructions with object pronouns, and gerund phrases all fall through whenever the direct lookup misses.

**Lookup pipeline order.** Tapped token → normalize (lowercase, NFC) → direct `lemmas.lemma` lookup → if no hit, `inflections.surface_form` lookup → if still no hit and the token matches a clitic-suffix pattern, clitic-strip and retry (lemma then inflection) → if still no hit, suffix-strip heuristic (`services/suffix.ts`: `-mente`, diminutives, plurals) → bare lemma lookup for each candidate → return null. Each step is its own function in `services/dictionary.ts`.

Lemma-first is what disambiguates noun/verb collisions: `pueblo` is both a noun ("town") and `ind.pres.1s` of `poblar`; `nombre` is both a noun and a form of `nombrar`. Hitting `lemmas` first returns the noun (the canonical form the reader sees). Conjugated forms (`tengo`, `dámelo`) aren't lemmas, so they miss step 1 and fall through to step 2 as before.

**SRS uses SM-2.** Standard, well-documented algorithm. Implementation lives in `services/srs.ts`. Do not overengineer this. (Anki's current default is FSRS; SM-2 is fine for v1 and easier to implement.)

**Captured words store the source sentence.** `user_words.source_sentence` preserves the context the word was captured in. Reviewing a word inside its original sentence is meaningfully more effective than reviewing it bare; flashcards use this when available.

**Captured words are keyed by lemma + part_of_speech + direction.** When the user taps an inflected form (*tuviera*), the popover shows the lemma (*tener*) and the lemma is what gets added to the deck. Each "Add to deck" creates **two rows** — one `en_to_es` (front: English, back: Spanish) and one `es_to_en` (front: Spanish, back: English). They share `spanish` + `part_of_speech` but carry independent SRS state, so each direction advances at its own pace. The `(user_id, spanish, part_of_speech, direction)` unique constraint allows the same surface lemma to be captured separately for distinct parts of speech (*banco* noun, *vino* verb vs. noun — different captures, different cards × 2 directions each).

**Grammar content is static markdown, not database content.** Grammar pages rarely change and don't need user-specific data. Shipping them as files in `/content/grammar/` keeps them version-controlled and works offline.

**The "Why this form?" link is driven by `lemmas.grammar_note_slug` in the bundled dictionary.** Words that exemplify a notable grammar topic carry a slug pointing to the relevant page. The popover only shows the link when the slug is present. Slugs are populated post-build in the data-pipeline project, not by the app.

**Identity model: device-ID, no auth (v1).** v1 expects ~2 users sharing a Supabase project. There is no login screen. On first launch, the app generates a v4 UUID and stores it in `expo-secure-store` (`services/deviceId.ts`); that UUID is the `user_id` written into every `user_words` row. RLS filters `user_words` by `user_id`, but since the requesting client is using the anon key (no JWT), the `user_id` is supplied client-side and not server-verified. This is an intentional trade-off: anyone with the anon key could spoof an ID to read another user's words, but for a 2-user personal app this is acceptable. If the app ever opens to more users, swap in real auth (Supabase magic link) and migrate existing rows.

**Passages are shared content.** `passages` is read by every device using the anon key; it is not per-user. No social or shared-deck features for `user_words`.

---

## Coding conventions

- Functional components only; no class components
- Props defined with interfaces, not type aliases
- File names match the component name in PascalCase (e.g., `WordPopover.tsx`)
- Custom hooks start with `use` and live in `/hooks/`
- Hooks contain logic only — no JSX
- Always handle loading, error, and empty states explicitly
- Always handle offline state gracefully (the app should be usable without network for reading and study, since dictionary and captured words are local)
- Use safe area insets on all screens
- Use `useColorScheme()` for dark mode support from day one
- Prefer flex layouts; do not hardcode pixel dimensions
- Use path aliases (`@/components/...`) rather than relative paths beyond one level
- All dictionary lookups go through `services/dictionary.ts`; never call SQLite directly from a component

---

## Don'ts

- Don't eject from the Expo managed workflow
- Don't use AsyncStorage for sensitive data — use `expo-secure-store`
- Don't introduce a styling library (NativeWind, Tamagui, etc.) — StyleSheet is sufficient
- Don't add analytics or telemetry in v1
- Don't add features outside the scope above without updating this file first
- Don't generate new files in `/content/grammar/` without confirming with the user — that is a curated content directory
- Don't modify the bundled SQLite dictionary in the app; it is built and updated by the separate data-pipeline project
- Don't call external translation APIs; the dictionary is bundled
- Don't attempt to enumerate clitic-attached forms in the dictionary — handle them at lookup time via `services/clitic.ts`
- Don't write Supabase queries directly in components; go through `/services/` or React Query hooks

---

## Development workflow

- **Run on phone:** `npx expo start` and scan QR with Expo Go
- **Supabase local dev:** use the Supabase CLI for migrations; never edit the production database directly from the app
- **Adding a grammar page:** create `content/grammar/<slug>.md` with frontmatter (`title`, `level`, `summary`) and body. The Grammar tab auto-discovers them.
- **Adding a passage:** during v1, add directly via Supabase dashboard. A small in-app admin screen for adding passages is a nice-to-have but not required.
- **Updating the dictionary:** rebuild from the data-pipeline project, drop the resulting `spanish-dictionary.db` into `content/dictionary/`, bump the asset version so devices re-copy on next launch.
- **Adding a lesson (studyspanish.com scrape):**
  1. If the bookmarklet source (`scripts/lesson-scraper-bookmarklet.js`) changed, run `python scripts/build-bookmarklet.py`, **delete the old browser bookmark entirely**, and create a fresh one with the new `javascript:…` URL. Editing the URL of an existing bookmark sometimes mangles long values in Chrome/Edge.
  2. Open the lesson page on studyspanish.com and click the bookmark. A `<slug>.md` file downloads — move it into `content/lessons/` (filename should already be `lessons-<slug>.md`; rename if not).
  3. Run `python scripts/build-lessons-index.py` to regenerate `services/lessons.generated.ts`. The app picks the new lesson up automatically; no Supabase changes needed.
  4. The full 108-lesson unit structure lives in `services/lessons.ts`. Lessons that aren't yet captured appear dimmed in the in-app list — captured ones are tappable.

---

## Open questions for the developer (me, the user)

These are things to decide before or during implementation, flagged here so they're not forgotten:

1. **Initial passage library.** Decide on 10–20 starter passages (mix of A1–B2, public domain or personal use) before shipping. Without content, the app is empty.
2. **Grammar page list.** Confirm the v1.5 topic list. Suggested starting set: present tense, gender/number agreement, ser vs. estar, articles, preterite, imperfect, preterite vs. imperfect, subjunctive intro, por vs. para, commands.
3. **Dark mode aesthetic.** Decide on color tokens early so they don't need refactoring later (starter palette is in `constants/Colors.ts`).
4. **Cold-start lookup latency.** The bundled SQLite file is ~70 MB. First lookup after launch may pay a cold-cache cost. Decide whether to pre-warm with a throwaway query on app mount.
5. **Tokenization rules for the reader.** Word-boundary regex, handling of punctuation, hyphens, em-dashes, quoted speech (`«…»` / `"…"`). Shapes the reader component.
6. **SM-2 parameter specifics.** Initial ease, min ease floor, lapse penalty, rating→quality map. Cheap to pin down on paper before coding `services/srs.ts`.
7. **Memory-game card pool.** 8 pairs per round drawn from: due cards, recent captures, or random? Affects whether the game doubles as light SRS or is pure entertainment.

---

## Reminders for Claude Code

- This file is authoritative. If a request conflicts with it, ask before deviating.
- The Spanish dictionary is produced by a separate project (`data-pipeline`); this app consumes it as an opaque SQLite asset. Schema details of that DB live in *that* project's CLAUDE.md.
- The clitic preprocessor is the single most important piece of app-side language logic. Tap-to-translate quality depends on it. Treat its unit tests as a contract, not a nice-to-have.
- When adding a new screen, add it to the appropriate tab in `app/(tabs)/_layout.tsx`.
- When adding a new Supabase table or column, write a migration file; do not modify schema in-app.
- When uncertain about a Spanish grammar detail, flag it for review rather than guessing — incorrect language content is worse than a TODO.
- Keep dependencies minimal. Before adding a package, check whether Expo or React Native already provides the capability.

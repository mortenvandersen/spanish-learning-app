# Learn Spanish

A personal Spanish reading app for iOS, built to scratch my own itch — and to demonstrate end-to-end how I think about integrating a third-party API into a real product.

Stack: Expo · React Native · TypeScript · Supabase · ElevenLabs.

---

## What it does

- **Read anything in Spanish.** Paste any text — a news article, a song lyric, a recipe — and listen to it in natural regional voices.
- **Tap any word for an instant offline translation.** A bundled 70MB Spanish dictionary handles lookups in milliseconds, with clitic decomposition so forms like *dámelo* or *haciéndome* resolve correctly.
- **Two reading modes:** a curated starter library, plus a "My library" where the user builds their own collection from text they choose themselves.
- **Spaced-repetition study.** Captured words flow into an SM-2 flashcard deck with audio playback in your selected voice.
- **Grammar reference.** A bundled grammar-lesson library sits alongside the reader.

## A typical session

1. Open the **Read** tab → tap **My library** → **+ Add passage** → paste in a Spanish article you actually want to read.
2. Start reading. Tap any word that's unfamiliar — a popover shows the translation, part of speech, a pronunciation sample, and the lemma if you tapped an inflected form. Tap **Add to deck** to capture it.
3. Hit play at the top of the passage. Listen in **Mexican / Conversational** by default, or switch to Castilian / Patient teacher / Fast casual if you want to hear something else.
4. The next day, open **Study**. The words you captured surface as flashcards — once English→Spanish, once Spanish→English, each direction with its own SRS state. Rate **again / hard / good / easy** after each.
5. Read the next article. The words already in your deck show up tagged "in deck" — no risk of double-capture.

That's the loop. Everything else (grammar lessons, conjugation drills) is supporting material.

## Notable details

- **Capture-to-deck creates two cards, not one.** Adding *perro* to the deck creates an *en→es* card (front: "dog", back: *perro*) and an *es→en* card with independent SRS state, so each direction advances at its own pace. The source sentence the word came from is saved with the card and shown on the back as context — reviewing a word inside the sentence it appeared in is meaningfully more effective than reviewing it bare.
- **Conjugation cards are a separate deck.** Spanish conjugation is hard enough to deserve dedicated practice. The deck releases cards in batches (you control the pace) and uses cloze-style prompts to drill specific forms in context.
- **Clitic decomposition is the hard (unseen) part.** Forms like *dámelo* (*dar* + *me* + *lo*), *haciéndome*, *decírselo* don't appear in any dictionary as-is. The lookup pipeline strips them in reverse, applying Spanish accent rules, and surfaces both the verb and the clitic decomposition in the popover so the learner understands what the pronouns contributed. Without this, tap-to-translate silently fails on most natural dialogue.
- **Light-mode design.** Bright blue primary, yellow captured-word accent, soft blue-tinted background, lifted white cards with shadows. The full app is themable so a dark variant is one constant flip away.
- **No account.** First launch generates a device UUID into secure storage. No email, no password, no analytics, no tracking. RLS on Supabase scopes data per device.

## ElevenLabs integration

The audio layer is an important part of the app as it is the best reflection of actual spoken Spanish. It is improtant for me as I have Spanish family that speaks Spanish at a very high pace. 

| Decision | Why |
|---|---|
| **Cache-first by content hash.** Each `(text, dialect, style)` tuple is rendered exactly once, ever — repeat plays serve from Supabase Storage instantly. | Bounds cost. A learner replaying the same passage 100 times costs the same as 1 play. |
| **Six voice cells:** Castilian + Mexican × Patient teacher / Conversational / Fast casual. | Demonstrates ElevenLabs' real differentiator vs. OS TTS — natural sentence-level prosody and authentic regional accent. |
| **API key lives on Supabase, never on the device.** A small Edge Function owns the key; the app sends `{ text, dialect, style }` and gets back an audio URL. | TestFlight binaries can be unpacked. Embedded keys get extracted in minutes. |
| **Rate limit on cache misses only** — 30 generations/IP/hour — with a hard spend cap on the ElevenLabs dashboard. | Caps worst-case cost for a publicly-installable app at roughly $0.60 per attacker per hour. |
| **Offline fallback to system TTS.** | The app stays usable without network. ElevenLabs is reserved for the moments where it actually shines (sentence-length narration), not single-word lookups where the gap is small. |

The result: a tester can install this, paste any Spanish text, and hear it read back in natural Castilian or Mexican — and the integration is sustainable enough that I'd actually ship it.

## Stack

Expo SDK 54 · React Native · TypeScript (strict) · Expo Router · Zustand · React Query · Supabase (Postgres + RLS + Storage + Edge Functions) · `expo-sqlite` for the bundled dictionary · `expo-audio` for playback · `eleven_multilingual_v2` for generation.

## Try it

iOS TestFlight: *coming soon — ask for a link.*

The app generates a device-scoped UUID on first launch. No account, no email, no tracking.

## Why I built this

I'm learning Spanish, and the apps I tried either wouldn't let me read what I actually wanted to read, or had robotic narration. Building it myself solved my problem and gave me a chance to develop my skills in both using Claude Code + associated tools and structuring a good learning experience. 

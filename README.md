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

## ElevenLabs integration

The audio layer is the heart of the product. The architecture is what a real ElevenLabs customer would build — not a naive demo:

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

I'm learning Spanish, and the apps I tried either wouldn't let me read what I actually wanted to read, or had robotic narration. Building it myself solved my problem — and gave me a concrete artifact to talk about how I think about product, cost, and the user experience of a paid API.

// TTS Edge Function — generates ElevenLabs audio for a (text, dialect, style)
// triple and caches the resulting MP3 in the tts-cache Storage bucket.
//
// Cache key: sha256(voice_id + ":" + speed + ":" + text). Repeat calls for the
// same triple are free — Storage returns the existing object.
//
// Required environment variables (set as Supabase secrets):
//   ELEVENLABS_API_KEY
//   ELEVENLABS_VOICE_CASTILIAN_TEACHER
//   ELEVENLABS_VOICE_CASTILIAN_CONVERSATIONAL
//   ELEVENLABS_VOICE_CASTILIAN_FAST
//   ELEVENLABS_VOICE_MEXICAN_TEACHER
//   ELEVENLABS_VOICE_MEXICAN_CONVERSATIONAL
//   ELEVENLABS_VOICE_MEXICAN_FAST
//
// Auto-provided by Supabase:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "tts-cache";
const MODEL_ID = "eleven_multilingual_v2";
const MAX_TEXT_LENGTH = 5000;
const RATE_LIMIT_PER_HOUR = 30;

const SPEED_BY_STYLE: Record<string, number> = {
  teacher: 0.85,
  conversational: 1.0,
  fast: 1.15,
};

function voiceIdFor(dialect: string, style: string): string | null {
  const key = `ELEVENLABS_VOICE_${dialect.toUpperCase()}_${style.toUpperCase()}`;
  return Deno.env.get(key) ?? null;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: { text?: unknown; dialect?: unknown; style?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const dialect = typeof payload.dialect === "string" ? payload.dialect : "";
  const style = typeof payload.style === "string" ? payload.style : "";

  if (!text) return json({ error: "text required" }, 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return json({ error: `text exceeds ${MAX_TEXT_LENGTH} characters` }, 400);
  }
  if (!["castilian", "mexican"].includes(dialect)) {
    return json({ error: `unknown dialect: ${dialect}` }, 400);
  }
  if (!["teacher", "conversational", "fast"].includes(style)) {
    return json({ error: `unknown style: ${style}` }, 400);
  }

  const voiceId = voiceIdFor(dialect, style);
  if (!voiceId) {
    return json({ error: `voice not configured for ${dialect}:${style}` }, 500);
  }
  const speed = SPEED_BY_STYLE[style];

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return json({ error: "ELEVENLABS_API_KEY not set" }, 500);

  const cacheKey = await sha256Hex(`${voiceId}:${speed}:${text}`);
  const objectPath = `${cacheKey}.mp3`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Probe cache: list with prefix avoids downloading the file just to check.
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list("", { search: cacheKey, limit: 1 });

  if (existing && existing.length > 0) {
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);
    return json({ url: urlData.publicUrl, cached: true });
  }

  // Cache miss — about to spend ElevenLabs credits. Enforce rate limit by IP.
  // Cache hits above bypassed this check intentionally (they cost nothing).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { data: countData, error: rateErr } = await supabase.rpc(
    "tts_rate_check",
    { p_ip: ip },
  );
  // Fail open on infrastructure errors — better UX, spend cap is the real backstop.
  if (!rateErr && typeof countData === "number" && countData > RATE_LIMIT_PER_HOUR) {
    return json(
      {
        error: `Rate limit exceeded (${RATE_LIMIT_PER_HOUR} generations/hour). Try again later.`,
      },
      429,
    );
  }

  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed,
        },
      }),
    },
  );

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    return json(
      { error: "ElevenLabs API error", status: ttsRes.status, detail: errText },
      502,
    );
  }

  const audio = new Uint8Array(await ttsRes.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, audio, {
      contentType: "audio/mpeg",
      upsert: false,
    });

  // Race: another concurrent request may have uploaded the same file first.
  // That's fine — fall through to returning the URL.
  if (uploadErr && !/already exists/i.test(uploadErr.message)) {
    return json({ error: "Storage upload failed", detail: uploadErr.message }, 500);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(objectPath);
  return json({ url: urlData.publicUrl, cached: false });
});

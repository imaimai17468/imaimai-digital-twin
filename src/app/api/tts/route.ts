import { toReadingSegments } from "@/lib/reading";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const MAX_TEXT_CHARS = 1500;

export async function POST(req: Request) {
  if (!(await checkRateLimit(req, "tts"))) {
    return new Response("Too many requests", { status: 429 });
  }

  const body: unknown = await req.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("text" in body) ||
    typeof (body as { text: unknown }).text !== "string"
  ) {
    return new Response("Invalid request: text string required", { status: 400 });
  }

  const { text } = body as { text: string };

  if (text.trim().length === 0) {
    return new Response("text must not be empty", { status: 400 });
  }

  if (text.length > MAX_TEXT_CHARS) {
    return new Response("text too long", { status: 413 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!voiceId || !apiKey) {
    return new Response("ElevenLabs not configured", { status: 500 });
  }

  // LLMで表記→読みのペアを生成。失敗時はnull（原文のままTTSに送る）
  const segments = await toReadingSegments(text);
  const ttsText = segments ? segments.map((s) => s.reading).join("") : text;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: ttsText,
        model_id: "eleven_turbo_v2_5",
        language_code: "ja",
        output_format: "mp3_44100_128",
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status });
  }

  const data = (await res.json()) as Record<string, unknown>;

  return Response.json({ ...data, segments });
}

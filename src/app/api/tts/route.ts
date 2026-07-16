import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: Request) {
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

  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    return new Response("ELEVENLABS_VOICE_ID not set", { status: 500 });
  }

  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of audio) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
    },
  });
}

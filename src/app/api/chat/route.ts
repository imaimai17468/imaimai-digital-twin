import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IMAIMAI_SYSTEM_PROMPT } from "@/lib/persona";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 8000;

function totalTextLength(messages: UIMessage[]): number {
  let total = 0;
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type === "text") total += p.text.length;
    }
  }
  return total;
}

export async function POST(req: Request) {
  if (!(await checkRateLimit(req, "chat"))) {
    return new Response("Too many requests", { status: 429 });
  }

  const body: unknown = await req.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray((body as { messages: unknown }).messages)
  ) {
    return new Response("Invalid request: messages array required", { status: 400 });
  }

  const { messages } = body as { messages: UIMessage[] };

  if (messages.length > MAX_MESSAGES || totalTextLength(messages) > MAX_TOTAL_CHARS) {
    return new Response("Conversation too long", { status: 413 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    instructions: IMAIMAI_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1024,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

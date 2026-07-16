import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IMAIMAI_SYSTEM_PROMPT } from "@/lib/persona";

export const maxDuration = 30;

export async function POST(req: Request) {
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

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    instructions: IMAIMAI_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

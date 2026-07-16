"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type Phase = "idle" | "thinking" | "streaming";

const OUTER_CLASS: Record<Phase, string> = {
  idle: "animate-wave-breathe",
  thinking: "animate-wave-think",
  streaming: "animate-wave-speak",
};

const INNER_CLASS: Record<Phase, string> = {
  idle: "animate-wave-breathe-delayed",
  thinking: "animate-wave-think-delayed",
  streaming: "animate-wave-speak-delayed",
};

const transport = new DefaultChatTransport({ api: "/api/chat" });

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function AvatarWithWave({ phase }: { phase: Phase }) {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <div className={`absolute inset-0 rounded-full border border-accent ${OUTER_CLASS[phase]}`} />
      <div className={`absolute inset-2 rounded-full border border-accent ${INNER_CLASS[phase]}`} />
      <div className="relative w-24 h-24 rounded-full overflow-hidden">
        <Image src="/avatar.png" alt="いまいまい" fill className="object-cover" priority />
      </div>
    </div>
  );
}

function ResponseText({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className={`text-center max-w-lg mx-auto px-6 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <p className="text-sm leading-relaxed text-fg-primary">{text}</p>
    </div>
  );
}

function FadeOverlay() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-bg-deep" />
  );
}

const SUGGESTIONS = ["自己紹介して", "AI駆動開発について", "技術スタックは？", "大事にしてること"];

export default function Home() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);

  const isThinking = status === "submitted";
  const isStreaming = status === "streaming";
  const phase: Phase = isThinking ? "thinking" : isStreaming ? "streaming" : "idle";

  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  const lastUser = messages.findLast((m) => m.role === "user");
  const lastAssistantText = lastAssistant ? extractText(lastAssistant) : "";
  const lastUserText = lastUser ? extractText(lastUser) : "";
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [lastAssistantText]);

  return (
    <div className="flex flex-col h-full items-center bg-bg-deep">
      {!hasMessages && <div className="flex-1" />}

      <div className="shrink-0 flex flex-col items-center gap-4 w-full max-w-xl px-6 pt-8 pb-4">
        <AvatarWithWave phase={phase} />
        <p className="text-xs text-fg-secondary opacity-70">
          {isThinking ? "考え中..." : hasMessages ? "" : "いまいまいのデジタルツイン"}
        </p>
        {!hasMessages && (
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void sendMessage({ text: s })}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg-elevated text-fg-secondary active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasMessages && <div className="flex-1" />}

      {hasMessages && lastUserText && (
        <div className="shrink-0 max-w-sm px-6 pb-2">
          <p className="text-xs text-center text-fg-muted line-clamp-3">{lastUserText}</p>
        </div>
      )}

      {hasMessages && (
        <div className="flex-1 min-h-0 w-full max-w-xl px-6 relative">
          <div ref={responseRef} className="overflow-y-auto h-full px-2">
            <ResponseText text={lastAssistantText} visible={!!lastAssistantText && !isThinking} />
          </div>
          <FadeOverlay />
        </div>
      )}

      <div className="shrink-0 w-full max-w-xl px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isThinking && !isStreaming) {
              void sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking || isStreaming}
            placeholder="メッセージを入力..."
            className="flex-1 rounded-lg px-3.5 py-2.5 text-sm bg-bg-surface text-fg-primary caret-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isThinking || isStreaming || !input.trim()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium bg-accent text-white disabled:opacity-30 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}

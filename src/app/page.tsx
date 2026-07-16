"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type Phase = "idle" | "thinking" | "streaming";

const ANIMATION: Record<Phase, string> = {
  idle: "wave-breathe 4s var(--ease-in-out) infinite",
  thinking: "wave-think 1.8s var(--ease-in-out) infinite",
  streaming: "wave-speak 1.2s var(--ease-in-out) infinite",
};

const DELAY: Record<Phase, string> = {
  idle: "1.5s",
  thinking: "0.4s",
  streaming: "0.4s",
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
    <div className="relative flex items-center justify-center">
      <div
        className="absolute w-32 h-32 rounded-full"
        style={{
          border: "1px solid var(--accent)",
          animation: ANIMATION[phase],
        }}
      />
      <div
        className="absolute w-28 h-28 rounded-full"
        style={{
          border: "1px solid var(--accent)",
          animation: ANIMATION[phase],
          animationDelay: DELAY[phase],
        }}
      />
      <div className="relative w-24 h-24 rounded-full overflow-hidden">
        <Image src="/avatar.png" alt="いまいまい" fill className="object-cover" priority />
      </div>
    </div>
  );
}

function ResponseText({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className="transition-opacity duration-500 text-center max-w-lg mx-auto px-6"
      style={{
        opacity: visible ? 1 : 0,
        transitionTimingFunction: "var(--ease-out)",
      }}
    >
      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-primary)" }}>
        {text}
      </p>
    </div>
  );
}

function FadeOverlay() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
      style={{
        background: "linear-gradient(to bottom, transparent, var(--bg-deep))",
      }}
    />
  );
}

const SUGGESTIONS = ["自己紹介して", "AI駆動開発について", "技術スタックは？", "大事にしてること"];

export default function Home() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
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
    <div
      className="flex flex-col h-full items-center justify-between"
      style={{ background: "var(--bg-deep)" }}
    >
      <div className="flex-1 min-h-8" />

      <div className="flex flex-col items-center gap-6 w-full max-w-xl px-6 flex-1 min-h-0">
        <AvatarWithWave phase={phase} />

        <p
          className="text-xs tracking-wide transition-opacity duration-300"
          style={{
            color: "var(--fg-secondary)",
            opacity: isThinking ? 1 : 0.7,
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          {isThinking
            ? "考え中..."
            : isStreaming
              ? ""
              : hasMessages
                ? ""
                : "いまいまいのデジタルツイン"}
        </p>

        {hasMessages && lastUserText && !isThinking && (
          <p className="text-xs text-center max-w-sm" style={{ color: "var(--fg-muted)" }}>
            {lastUserText}
          </p>
        )}

        {!hasMessages && (
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => void sendMessage({ text: suggestion })}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--fg-secondary)",
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {hasMessages && (
          <div className="relative w-full flex-1 min-h-0">
            <div ref={responseRef} className="overflow-y-auto px-2 h-full">
              <ResponseText text={lastAssistantText} visible={!!lastAssistantText && !isThinking} />
            </div>
            <FadeOverlay />
          </div>
        )}

        {messages.length > 2 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ color: "var(--fg-muted)" }}
          >
            {showHistory ? "閉じる" : "過去の会話"}
          </button>
        )}

        {showHistory && (
          <div
            className="w-full max-h-48 overflow-y-auto rounded-lg p-3 space-y-2"
            style={{ background: "var(--bg-surface)" }}
          >
            {messages.slice(0, -2).map((m) => (
              <p
                key={m.id}
                className="text-xs leading-relaxed"
                style={{ color: m.role === "user" ? "var(--fg-muted)" : "var(--fg-secondary)" }}
              >
                {m.role === "user" ? "Q: " : "A: "}
                {(() => {
                  const t = extractText(m);
                  return t.length > 120 ? `${t.slice(0, 120)}...` : t;
                })()}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-4" />

      <div className="w-full max-w-xl px-6 pb-6">
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
            className="flex-1 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40 transition-opacity duration-150"
            style={{
              background: "var(--bg-surface)",
              color: "var(--fg-primary)",
              caretColor: "var(--accent)",
            }}
          />
          <button
            type="submit"
            disabled={isThinking || isStreaming || !input.trim()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-30 transition-opacity duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{
              background: "var(--accent)",
              color: "#fff",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}

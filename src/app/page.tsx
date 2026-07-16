"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

function PlayButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async () => {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setState("idle");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.play();
      setState("playing");
    } catch {
      setState("idle");
    }
  }, [text, state]);

  return (
    <button
      onClick={play}
      className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200 shrink-0"
      title={state === "playing" ? "停止" : "音声で聞く"}
    >
      {state === "loading" ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : state === "playing" ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.667 12L8 7.2V16.8L14.667 12ZM16 12L6 5V19L16 12Z" />
          <path d="M19.5 12a7.5 7.5 0 0 0-3-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M21.5 12a9.5 9.5 0 0 0-3.8-7.6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export default function Home() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#161b22]">
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-green-500/50">
          <Image src="/avatar.png" alt="いまいまい" fill className="object-cover" />
        </div>
        <div>
          <h1 className="text-base font-semibold">🐸 いまいまい 🐌</h1>
          <p className="text-xs text-gray-400">Digital Twin — Product Engineer</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-green-500/30">
              <Image src="/avatar.png" alt="いまいまい" fill className="object-cover" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-300">いまいまいのデジタルツイン</p>
              <p className="text-sm mt-1">なんでも聞いてね</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-md">
              {[
                "自己紹介して！",
                "AI駆動開発について教えて",
                "フロントエンドの技術スタック教えて",
                "エンジニアとして大事にしてることは？",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage({ text: suggestion })}
                  className="px-3 py-1.5 text-sm rounded-full border border-white/10 hover:bg-white/5 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = message.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {message.role === "assistant" && (
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-green-500/30">
                  <Image src="/avatar.png" alt="いまいまい" fill className="object-cover" />
                </div>
              )}
              <div className="flex items-end gap-0 max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-green-600 text-white"
                      : "bg-[#1c2128] text-gray-200 border border-white/5"
                  }`}
                >
                  {text}
                </div>
                {message.role === "assistant" && text && !isLoading && (
                  <PlayButton text={text} />
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-green-500/30">
              <Image src="/avatar.png" alt="いまいまい" fill className="object-cover" />
            </div>
            <div className="bg-[#1c2128] border border-white/5 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-green-500/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-green-500/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-green-500/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="border-t border-white/10 bg-[#161b22] px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="メッセージを入力..."
            className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:hover:bg-green-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            送信
          </button>
        </form>
      </footer>
    </div>
  );
}

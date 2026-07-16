"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { AvatarWithWave, type Phase } from "./avatar-with-wave";

const transport = new DefaultChatTransport({ api: "/api/chat" });

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

interface TtsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  // 表記と読みのペア。TTSには読みを送っているため、
  // タイムスタンプ（読み基準）から表示テキスト（表記）への変換に使う
  segments: { surface: string; reading: string }[] | null;
}

const SUGGESTIONS = ["自己紹介して", "AI駆動開発について", "技術スタックは？", "大事にしてること"];

export default function Home() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const [visibleText, setVisibleText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(status);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  const isThinking = status === "submitted";
  const isStreaming = status === "streaming";
  const isGenerating = isThinking || isStreaming;
  const isBusy = isGenerating || isSpeaking;
  const phase: Phase = isSpeaking ? "streaming" : isGenerating ? "thinking" : "idle";

  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  const lastUser = messages.findLast((m) => m.role === "user");
  const lastAssistantText = lastAssistant ? extractText(lastAssistant) : "";
  const lastUserText = lastUser ? extractText(lastUser) : "";
  const hasMessages = messages.length > 0;

  const unlockAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
  }, []);

  const speakWithSync = useCallback(async (text: string) => {
    setIsSpeaking(true);
    setVisibleText("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setVisibleText(text);
        setIsSpeaking(false);
        return;
      }

      const data = (await res.json()) as TtsResponse;
      const { audio_base64, alignment, segments } = data;

      const audioBytes = Uint8Array.from(atob(audio_base64), (c) => c.charCodeAt(0));
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      const audioBuffer = await ctx.decodeAudioData(audioBytes.buffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startTime = ctx.currentTime;
      source.start(startTime);

      const chars = alignment.characters;
      const starts = alignment.character_start_times_seconds;

      // segmentsがある場合: 読みの何文字目まで発話されたかを数え、
      // その位置を含むセグメントまでの表記を表示する（単語単位の歌詞同期）
      const textForSpoken = (spokenCount: number): string => {
        if (!segments) return chars.slice(0, spokenCount).join("");
        let acc = 0;
        let out = "";
        for (const seg of segments) {
          if (acc >= spokenCount) break;
          out += seg.surface;
          acc += seg.reading.length;
        }
        return out;
      };

      const tick = () => {
        const elapsed = ctx.currentTime - startTime;
        let spoken = 0;
        for (let i = 0; i < starts.length; i++) {
          if (starts[i] <= elapsed) spoken = i + 1;
        }
        setVisibleText(textForSpoken(spoken));
        if (spoken < chars.length) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setVisibleText(text);
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);

      source.onended = () => {
        cancelAnimationFrame(animFrameRef.current);
        setVisibleText(text);
        setIsSpeaking(false);
      };
    } catch {
      setVisibleText(text);
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [visibleText]);

  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming";
    prevStatusRef.current = status;
    if (wasStreaming && status === "ready" && lastAssistantText) {
      void speakWithSync(lastAssistantText);
    }
  }, [status, lastAssistantText, speakWithSync]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const displayText = isSpeaking ? visibleText : lastAssistantText;
  const showText = !!displayText && !isGenerating;

  return (
    <div className="flex flex-col h-full items-center bg-bg-deep">
      <div
        className={`transition-[flex] duration-700 ${hasMessages ? "flex-none" : "flex-1"}`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      />

      <div className="shrink-0 flex flex-col items-center gap-4 w-full max-w-xl px-6 pt-8 pb-4">
        <AvatarWithWave phase={phase} />
        <p className="text-xs text-fg-secondary opacity-70">
          {isGenerating ? "考え中..." : hasMessages ? "" : "いまいまいのデジタルツイン"}
        </p>
        {!hasMessages && (
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                disabled={isBusy}
                onClick={() => {
                  if (isBusy) return;
                  unlockAudio();
                  void sendMessage({ text: s });
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg-elevated text-fg-secondary hover:text-fg-primary active:scale-[0.97] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={`transition-[flex] duration-700 ${hasMessages ? "flex-none" : "flex-1"}`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      />

      {hasMessages && lastUserText && (
        <div className="shrink-0 max-w-sm px-6 pb-2">
          <p className="text-xs text-center text-fg-muted line-clamp-3">{lastUserText}</p>
        </div>
      )}

      {hasMessages && (
        <div className="flex-1 min-h-0 w-full max-w-xl px-6 relative">
          <div ref={responseRef} className="overflow-y-auto h-full px-2">
            <div
              className={`max-w-lg mx-auto px-6 pb-12 space-y-3 transition-opacity duration-300 ${showText ? "opacity-100" : "opacity-0"}`}
            >
              {displayText
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-fg-primary">
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-bg-deep" />
        </div>
      )}

      <div className="shrink-0 w-full max-w-xl px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isBusy) {
              unlockAudio();
              void sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy}
            placeholder="メッセージを入力..."
            className="flex-1 rounded-lg px-3.5 py-2.5 text-sm bg-bg-surface text-fg-primary caret-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium bg-accent text-white hover:opacity-90 disabled:opacity-30 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}

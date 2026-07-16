import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export interface ReadingSegment {
  surface: string;
  reading: string;
}

const KNOWN_READINGS: ReadonlyArray<readonly [string, string]> = [
  ["今井俊希", "いまいとしき"],
  ["木更津工業高等専門学校", "きさらづこうぎょうこうとうせんもんがっこう"],
  ["木更津高専", "きさらづこうせん"],
  ["長岡技術科学大学", "ながおかぎじゅつかがくだいがく"],
  ["長岡技科大", "ながおかぎかだい"],
  ["技育", "ぎいく"],
];

const segmentsSchema = z.object({
  segments: z.array(
    z.object({
      surface: z.string(),
      reading: z.string(),
    }),
  ),
});

function buildPrompt(text: string): string {
  const known = KNOWN_READINGS.map(([s, r]) => `- ${s} → ${r}`).join("\n");
  return `以下の日本語テキストを、音声合成が正しく読めるように「表記(surface)」と「読み(reading)」のペアの配列に変換してください。

ルール:
- 全ペアのsurfaceを順に連結すると、元のテキストと一字一句完全に一致すること（空白・改行・句読点も含める）
- readingはひらがな。漢字は文脈に合った読みにする
- 数字も読みに変換する（例: 24歳 → にじゅうよんさい）
- 英単語・記号・すでにひらがな/カタカナの部分は、readingにsurfaceをそのまま入れてよい。ただし日本語話者がカタカナで発音する技術用語はカタカナにしてよい（例: Next.js → ネクストジェイエス）
- 分割は単語〜文節の細かさにする

既知の固有名詞の読み:
${known}

テキスト:
${text}`;
}

export async function toReadingSegments(text: string): Promise<ReadingSegment[] | null> {
  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      output: Output.object({ schema: segmentsSchema }),
      prompt: buildPrompt(text),
    });
    const { segments } = result.output;
    const joined = segments.map((s) => s.surface).join("");
    if (joined !== text) return null;
    return segments;
  } catch {
    return null;
  }
}

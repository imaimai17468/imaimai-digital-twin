import Image from "next/image";

export type Phase = "idle" | "thinking" | "streaming";

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

export function AvatarWithWave({ phase }: { phase: Phase }) {
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

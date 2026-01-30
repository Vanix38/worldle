"use client";

import type { Character, AttributeFeedback } from "@/types/game";
import { AttributeCell } from "./AttributeCell";

interface GuessRowProps {
  character: Character;
  feedback: AttributeFeedback[];
}

export function GuessRow({ character, feedback }: GuessRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-600 bg-gray-800/50 p-3">
      <div className="min-w-[140px] font-medium text-white">{character.name}</div>
      <div className="flex flex-wrap gap-2">
        {feedback.map((item) => (
          <AttributeCell
            key={item.key}
            label={item.label}
            value={item.value}
            status={item.status}
          />
        ))}
      </div>
    </div>
  );
}

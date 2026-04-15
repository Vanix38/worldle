"use client";

import type { IconType } from "react-icons";
import * as FaIcons from "react-icons/fa";
import { FaQuestionCircle } from "react-icons/fa";

/**
 * Resolves `name` to an export from react-icons/fa (e.g. "FaMicrophoneLines").
 */
export function HintIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (FaIcons as Record<string, IconType | undefined>)[name];
  if (!Icon || typeof Icon !== "function") {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[hint-icons] Unknown icon: ${name}`);
    }
    return <FaQuestionCircle className={className} aria-hidden />;
  }
  return <Icon className={className} aria-hidden />;
}

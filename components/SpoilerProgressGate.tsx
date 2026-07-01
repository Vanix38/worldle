"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSpoilerProgress } from "@/contexts/SpoilerProgressContext";
import { isProgressConfigured } from "@/lib/spoiler-progress";

interface SpoilerProgressGateProps {
  universeId: string;
  children: ReactNode;
}

export function SpoilerProgressGate({ universeId, children }: SpoilerProgressGateProps) {
  const { progressField, selection, hydrated } = useSpoilerProgress();
  const router = useRouter();
  const configured = isProgressConfigured(progressField, selection);

  useEffect(() => {
    if (!hydrated) return;
    if (progressField && !configured) {
      router.replace(`/game/${universeId}/setup`);
    }
  }, [hydrated, progressField, configured, universeId, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        Chargement…
      </div>
    );
  }

  if (progressField && !configured) {
    return null;
  }

  return <>{children}</>;
}

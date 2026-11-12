"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCompletedLogoIds,
  markLogoCompleted,
} from "@/lib/logo-quiz-progress";

export function useLogoQuizProgress(packId: string) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCompletedIds(getCompletedLogoIds(packId));
    setHydrated(true);
  }, [packId]);

  const markCompleted = useCallback(
    (logoId: string) => {
      const next = markLogoCompleted(packId, logoId);
      setCompletedIds(next);
      return next;
    },
    [packId]
  );

  const isCompleted = useCallback(
    (logoId: string) => completedIds.includes(logoId),
    [completedIds]
  );

  return {
    completedIds,
    completedCount: completedIds.length,
    hydrated,
    markCompleted,
    isCompleted,
  };
}

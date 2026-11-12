const PROGRESS_KEY = "worlddle-logo-quiz-progress";

export type LogoQuizProgressMap = Record<string, string[]>;

export function loadLogoQuizProgress(): LogoQuizProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: LogoQuizProgressMap = {};
    for (const [packId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      out[packId] = value.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
    return out;
  } catch {
    return {};
  }
}

export function getCompletedLogoIds(packId: string): string[] {
  return loadLogoQuizProgress()[packId] ?? [];
}

export function markLogoCompleted(packId: string, logoId: string): string[] {
  const all = loadLogoQuizProgress();
  const current = new Set(all[packId] ?? []);
  current.add(logoId);
  const next = [...current];
  all[packId] = next;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
  return next;
}

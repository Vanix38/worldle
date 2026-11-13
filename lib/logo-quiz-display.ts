import type { LogoEntry } from "@/types/logo-quiz";

/** Image to show in UI: full branded asset once revealed, else quiz asset. */
export function resolveLogoDisplayUrl(
  logo: Pick<LogoEntry, "imageUrl" | "fullImageUrl">,
  revealed: boolean
): string | undefined {
  if (revealed && logo.fullImageUrl) return logo.fullImageUrl;
  return logo.imageUrl;
}

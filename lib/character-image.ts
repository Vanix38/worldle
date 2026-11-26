/** Extensions tried, in order, for public/universes/<universe>/characters/<id>.<ext>. */
export const CHARACTER_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const;

export function characterImageSrc(universeId: string, characterId: string, extIndex: number): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const ext = CHARACTER_IMAGE_EXTENSIONS[extIndex];
  return `${basePath}/universes/${universeId}/characters/${characterId}.${ext}`.replace(/^\/+/, "/");
}

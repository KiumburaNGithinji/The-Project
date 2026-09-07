import { hasVideo } from "@/lib/youtube";

export function storagePublicUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Thumbnail precedence: whatever the mentor uploaded, else the one YouTube
 * generates, else null so the caller can draw a numbered placeholder.
 */
export function thumbnailUrl(lesson: {
  youtubeId?: string | null;
  thumbnailPath?: string | null;
}): string | null {
  if (lesson.thumbnailPath) {
    return storagePublicUrl("thumbnails", lesson.thumbnailPath);
  }
  if (hasVideo(lesson.youtubeId)) {
    return `https://i.ytimg.com/vi/${lesson.youtubeId}/mqdefault.jpg`;
  }
  return null;
}

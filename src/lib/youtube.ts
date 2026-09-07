/**
 * Pull the video ID out of whatever the mentor pastes — a full watch URL, a
 * share link, an embed URL, or the bare ID. Returns null if it isn't one.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && ID.test(v)) return v;

    const m = url.pathname.match(/^\/(?:embed|live|shorts|v)\/([^/?#]+)/);
    if (m && ID.test(m[1])) return m[1];
  }

  return null;
}

export function watchUrl(youtubeId: string) {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

/** Placeholder written by the seed for lectures that have no link yet. */
export const UNSET = "REPLACE_ME";

export function hasVideo(youtubeId: string | null | undefined) {
  return Boolean(youtubeId && youtubeId !== UNSET && ID.test(youtubeId));
}

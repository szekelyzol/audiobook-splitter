// File: utils/yotoContent.ts
// Compose final bodies for POST https://api.yotoplay.com/content
// Mirrors first‑party payloads: includes content.activity/version and conservative config

export type ContentLike = {
  chapters: any[];
  config?: any;
  activity?: string;
  version?: string;
};

export function composeCreateBody(
  title: string,
  chapters: any[],
  opts?: { coverImageL?: string; durationTotal?: number; fileSizeTotal?: number }
) {
  const body: any = {
    title,
    content: {
      activity: "yoto_Player",
      version: "1",
      chapters,
      config: { onlineOnly: false },
    },
    metadata: {},
  };
  if (opts?.coverImageL) {
    body.metadata.cover = { imageL: opts.coverImageL };
  }
  if (opts?.durationTotal || opts?.fileSizeTotal) {
    body.metadata.media = {
      duration: opts?.durationTotal || 0,
      fileSize: opts?.fileSizeTotal || 0,
    };
  }
  return body;
}

export function composeUpdateBody(
  cardId: string,
  title: string,
  contentLike: { chapters: any[]; config?: any },
  // remove/omit the opts param for metadata to keep update minimal
) {
  return {
    cardId,
    title,
    content: {
      activity: "yoto_Player",
      version: "1",
      playbackType: "linear",
      chapters: contentLike.chapters,
      config: contentLike.config ?? { onlineOnly: false },
    },
  };
}

export type VideoProvider = "youtube" | "bilibili" | "file";

export type ResolvedVideo = {
  embedSrc: string;
  provider: VideoProvider;
  src: string;
};

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|ogv|mov|m4v|avi)(?:$|[?#])/i;

const getYouTubeVideoId = (url: URL) => {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.split("/")[2] ?? null;
  }

  if (url.pathname.startsWith("/embed/")) {
    return url.pathname.split("/")[2] ?? null;
  }

  return url.searchParams.get("v");
};

const getBilibiliVideoParams = (url: URL) => {
  const path = url.pathname;
  const bvMatch = path.match(/\/video\/(BV[\w]+)/i);
  const avMatch = path.match(/\/video\/av(\d+)/i);
  const page = url.searchParams.get("p") ?? "1";

  if (bvMatch) {
    return `bvid=${bvMatch[1]}&page=${page}`;
  }

  if (avMatch) {
    return `aid=${avMatch[1]}&page=${page}`;
  }

  return null;
};

export const resolveVideoUrl = (rawUrl: string): ResolvedVideo | null => {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

  if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtu.be") {
    const videoId = getYouTubeVideoId(url);

    if (!videoId) {
      return null;
    }

    return {
      provider: "youtube",
      src: rawUrl.trim(),
      embedSrc: `https://www.youtube.com/embed/${videoId}`,
    };
  }

  if (hostname === "bilibili.com" || hostname.endsWith(".bilibili.com")) {
    const params = getBilibiliVideoParams(url);

    if (!params) {
      return null;
    }

    return {
      provider: "bilibili",
      src: rawUrl.trim(),
      embedSrc: `https://player.bilibili.com/player.html?${params}`,
    };
  }

  if (DIRECT_VIDEO_PATTERN.test(url.pathname + url.search + url.hash)) {
    return {
      provider: "file",
      src: rawUrl.trim(),
      embedSrc: rawUrl.trim(),
    };
  }

  return null;
};

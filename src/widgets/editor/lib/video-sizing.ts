export type VideoAlign = "left" | "center" | "right";
export type VideoProvider = "youtube" | "bilibili" | "file";

export const VIDEO_ASPECT_RATIO = 16 / 9;
export const VIDEO_MIN_WIDTH = 240;
export const VIDEO_MIN_HEIGHT = Math.round(VIDEO_MIN_WIDTH / VIDEO_ASPECT_RATIO);

export const getVideoContainerMaxWidth = (element: HTMLElement) => {
  const parentWidth = element.parentElement?.getBoundingClientRect().width ?? 0;
  const ownWidth = element.getBoundingClientRect().width;
  const width = parentWidth || ownWidth;

  return width > 0 ? width : Number.POSITIVE_INFINITY;
};

export const constrainVideoSize = (element: HTMLElement, width: number) => {
  const maxWidth = getVideoContainerMaxWidth(element);
  const constrainedWidth = Math.round(Math.min(Math.max(width, VIDEO_MIN_WIDTH), maxWidth));

  return {
    width: constrainedWidth,
    height: Math.round(Math.max(VIDEO_MIN_HEIGHT, constrainedWidth / VIDEO_ASPECT_RATIO)),
  };
};

import type { NodeViewProps } from "@tiptap/react";

import type { VideoProvider } from "./video-sizing";

export const replaceVideoInputWithEmbed = ({
  editor,
  getPos,
  attrs,
}: {
  attrs: { embedSrc: string; provider: VideoProvider; src: string };
  editor: NodeViewProps["editor"];
  getPos: NodeViewProps["getPos"];
}) => {
  if (typeof getPos !== "function") {
    return;
  }

  const pos = getPos();

  if (typeof pos !== "number") {
    return;
  }

  editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + 1 })
    .insertContentAt(pos, {
      type: "videoEmbed",
      attrs,
    })
    .run();
};

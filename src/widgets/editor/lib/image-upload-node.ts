import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { NodeViewProps } from "@tiptap/react";

export const resolveNodeViewPosition = (getPos: NodeViewProps["getPos"]) => {
  if (typeof getPos !== "function") {
    return null;
  }

  const position = getPos();
  return typeof position === "number" ? position : null;
};

export const deriveUrlLabel = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.split("/").filter(Boolean).pop();
    return pathname || url.hostname || "remote-image";
  } catch {
    return "remote-image";
  }
};

export const isLikelyImageUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const replaceImageUploadNodeWithImages = ({
  editor,
  node,
  getPos,
  urls,
}: {
  editor: NodeViewProps["editor"];
  node: ProseMirrorNode;
  getPos: NodeViewProps["getPos"];
  urls: string[];
}) => {
  const position = resolveNodeViewPosition(getPos);

  if (position === null || !urls.length) {
    return;
  }

  const imageNodes = urls.map((url) => ({ type: "image", attrs: { src: url } }));

  editor
    .chain()
    .focus()
    .deleteRange({ from: position, to: position + node.nodeSize })
    .insertContentAt(position, imageNodes)
    .run();

  const selectionPosition = position + Math.max(0, imageNodes.length * 2 - 1);
  editor.commands.setTextSelection(selectionPosition);
};

import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { VideoEmbedInputNodeView } from "./input-node-view";
import { VideoEmbedNodeView } from "./node-view";
import { VIDEO_ASPECT_RATIO, type VideoAlign } from "../../lib/video-sizing";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (attrs: { src: string; embedSrc: string; provider: "youtube" | "bilibili" | "file" }) => ReturnType;
      setVideoEmbedInput: () => ReturnType;
      setVideoAlign: (align: VideoAlign) => ReturnType;
      fitVideoToWidth: () => ReturnType;
      resetVideoSize: () => ReturnType;
    };
  }
}

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      embedSrc: {
        default: null,
      },
      provider: {
        default: "youtube",
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("data-width");
          return value ? Number.parseInt(value, 10) : null;
        },
        renderHTML: (attributes) => (attributes.width ? { "data-width": attributes.width } : {}),
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("data-height");
          return value ? Number.parseInt(value, 10) : null;
        },
        renderHTML: (attributes) => (attributes.height ? { "data-height": attributes.height } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video-embed" })];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
      setVideoEmbedInput:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "videoEmbedInput" }),
      setVideoAlign:
        (align: VideoAlign) =>
        ({ commands }: { commands: { updateAttributes: (typeOrName: string, attributes: Record<string, unknown>) => boolean } }) =>
          commands.updateAttributes(this.name, { align }),
      fitVideoToWidth:
        () =>
        ({ commands, editor }: { commands: { updateAttributes: (typeOrName: string, attributes: Record<string, unknown>) => boolean }; editor: { state: { selection: { from: number } }; view: { nodeDOM: (pos: number) => globalThis.Node | null } } }) => {
          const nodeElement = editor.view.nodeDOM(editor.state.selection.from);

          if (!(nodeElement instanceof HTMLElement)) {
            return false;
          }

          const maxWidth = nodeElement.getBoundingClientRect().width;

          if (maxWidth <= 0) {
            return false;
          }

          return commands.updateAttributes(this.name, {
            width: Math.round(maxWidth),
            height: Math.round(maxWidth / VIDEO_ASPECT_RATIO),
          });
        },
      resetVideoSize:
        () =>
        ({ commands }: { commands: { updateAttributes: (typeOrName: string, attributes: Record<string, unknown>) => boolean } }) =>
          commands.updateAttributes(this.name, {
            width: null,
            height: null,
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedNodeView);
  },
});

export const VideoEmbedInput = Node.create({
  name: "videoEmbedInput",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="video-embed-input"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video-embed-input" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedInputNodeView);
  },
});

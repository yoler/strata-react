import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Link2, Video } from "lucide-react";
import { useState } from "react";

import { resolveVideoUrl } from "../lib/video";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (attrs: { src: string; embedSrc: string; provider: "youtube" | "bilibili" | "file" }) => ReturnType;
      setVideoEmbedInput: () => ReturnType;
    };
  }
}

const replaceWithVideo = ({
  editor,
  getPos,
  attrs,
}: {
  attrs: { embedSrc: string; provider: "youtube" | "bilibili" | "file"; src: string };
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

const VideoEmbedInputView = ({ editor, getPos }: NodeViewProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const resolved = resolveVideoUrl(url);

    if (!resolved) {
      setError("Enter a YouTube, Bilibili, or direct video URL.");
      return;
    }

    setError(null);
    replaceWithVideo({
      editor,
      getPos,
      attrs: resolved,
    });
  };

  return (
    <NodeViewWrapper as="div" className="video-embed-input-node">
      <div className="video-embed-input-card" contentEditable={false}>
        <div className="video-embed-input-icon-shell">
          <div className="video-embed-input-icon-card">
            <Video className="video-embed-input-icon" strokeWidth={1.8} />
            <div className="video-embed-input-badge">
              <Link2 className="size-3.5" strokeWidth={2} />
            </div>
          </div>
        </div>
        <div className="video-embed-input-copy">Paste a video URL to embed</div>
        <div className="video-embed-input-supported">Supports YouTube, Bilibili, and direct video files</div>
        <div className="video-embed-input-row">
          <input
            className="video-embed-input-field"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="https://"
            type="url"
            value={url}
          />
          <button className="video-embed-input-button" onClick={submit} type="button">
            Insert
          </button>
        </div>
        {error ? <div className="video-embed-input-error">{error}</div> : null}
      </div>
    </NodeViewWrapper>
  );
};

const VideoEmbedView = ({ node }: NodeViewProps) => {
  const { embedSrc, provider } = node.attrs as { embedSrc: string; provider: "youtube" | "bilibili" | "file"; src: string };

  return (
    <NodeViewWrapper as="div" className="video-embed-node">
      <div className="video-embed-frame-shell" contentEditable={false}>
        {provider === "file" ? (
          <video className="video-embed-frame" controls preload="metadata" src={embedSrc} />
        ) : (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="video-embed-frame"
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedSrc}
            title="Embedded video"
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

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
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedView);
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
    return ReactNodeViewRenderer(VideoEmbedInputView);
  },
});

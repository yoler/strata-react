import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Link2, Video } from "lucide-react";
import { useRef, useState } from "react";

import { resolveVideoUrl } from "../lib/video";

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

type VideoAlign = "left" | "center" | "right";
type VideoProvider = "youtube" | "bilibili" | "file";

const VIDEO_ASPECT_RATIO = 16 / 9;
const VIDEO_MIN_WIDTH = 240;
const VIDEO_MIN_HEIGHT = Math.round(VIDEO_MIN_WIDTH / VIDEO_ASPECT_RATIO);

const getVideoContainerMaxWidth = (element: HTMLElement) => {
  const parentWidth = element.parentElement?.getBoundingClientRect().width ?? 0;
  const ownWidth = element.getBoundingClientRect().width;
  const width = parentWidth || ownWidth;

  return width > 0 ? width : Number.POSITIVE_INFINITY;
};

const constrainVideoSize = (element: HTMLElement, width: number) => {
  const maxWidth = getVideoContainerMaxWidth(element);
  const constrainedWidth = Math.round(Math.min(Math.max(width, VIDEO_MIN_WIDTH), maxWidth));

  return {
    width: constrainedWidth,
    height: Math.round(Math.max(VIDEO_MIN_HEIGHT, constrainedWidth / VIDEO_ASPECT_RATIO)),
  };
};

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

const VideoEmbedView = ({ node, selected, updateAttributes }: NodeViewProps) => {
  const { align, embedSrc, height, provider, width } = node.attrs as {
    align?: VideoAlign;
    embedSrc: string;
    height?: number | null;
    provider: VideoProvider;
    src: string;
    width?: number | null;
  };
  const shellRef = useRef<HTMLDivElement | null>(null);
  const draftSizeRef = useRef<{ width: number; height: number } | null>(null);
  const cleanupResizeRef = useRef<(() => void) | null>(null);
  const [draftSize, setDraftSize] = useState<{ width: number; height: number } | null>(null);

  const size = draftSize ?? (width ? { width, height: height ?? Math.round(width / VIDEO_ASPECT_RATIO) } : null);

  const handleResizePointerDown = (side: "left" | "right") => (event: React.PointerEvent<HTMLDivElement>) => {
    const shell = shellRef.current;
    const handle = event.currentTarget;

    if (!shell) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cleanupResizeRef.current?.();

    const startX = event.clientX;
    const startRect = shell.getBoundingClientRect();
    const startWidth = startRect.width || width || VIDEO_MIN_WIDTH;
    const overlay = document.createElement("div");

    overlay.className = "video-embed-resize-overlay";
    document.body.append(overlay);

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may fail if the browser already released the pointer.
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = side === "right" ? startWidth + deltaX : startWidth - deltaX;
      const nextSize = constrainVideoSize(shell, nextWidth);

      draftSizeRef.current = nextSize;
      setDraftSize(nextSize);
    };

    const commitResize = () => {
      cleanupResizeRef.current?.();

      document.removeEventListener("pointermove", handlePointerMove);

      const nextSize = draftSizeRef.current ?? constrainVideoSize(shell, shell.getBoundingClientRect().width);
      draftSizeRef.current = null;
      setDraftSize(null);
      updateAttributes(nextSize);
    };

    const cancelResize = () => {
      cleanupResizeRef.current?.();
      draftSizeRef.current = null;
      setDraftSize(null);
    };

    const cleanupResize = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", commitResize);
      document.removeEventListener("pointercancel", cancelResize);
      window.removeEventListener("blur", commitResize);
      handle.removeEventListener("lostpointercapture", commitResize);
      overlay.remove();
      cleanupResizeRef.current = null;

      try {
        if (handle.hasPointerCapture(event.pointerId)) {
          handle.releasePointerCapture(event.pointerId);
        }
      } catch {
        // The pointer can already be released by the browser.
      }
    };

    cleanupResizeRef.current = cleanupResize;

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", commitResize);
    document.addEventListener("pointercancel", cancelResize);
    window.addEventListener("blur", commitResize);
    handle.addEventListener("lostpointercapture", commitResize);
  };

  return (
    <NodeViewWrapper as="div" className={`video-embed-node ${selected ? "is-selected" : ""}`} data-align={align ?? "center"}>
      <div
        ref={shellRef}
        className="video-embed-frame-shell"
        contentEditable={false}
        style={size ? { width: `${size.width}px`, height: `${size.height}px` } : undefined}
      >
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
        <div className="video-embed-resize-handle is-left" data-resize-handle="left" onPointerDown={handleResizePointerDown("left")} />
        <div className="video-embed-resize-handle is-right" data-resize-handle="right" onPointerDown={handleResizePointerDown("right")} />
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

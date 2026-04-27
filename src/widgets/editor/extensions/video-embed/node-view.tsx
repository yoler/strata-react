import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRef, useState } from "react";

import {
  constrainVideoSize,
  VIDEO_ASPECT_RATIO,
  VIDEO_MIN_WIDTH,
  type VideoAlign,
  type VideoProvider,
} from "../../lib/video-sizing";
import "./video-embed.css";

export function VideoEmbedNodeView({ node, selected, updateAttributes }: NodeViewProps) {
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
}

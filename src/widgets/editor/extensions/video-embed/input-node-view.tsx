import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Link2, Video } from "lucide-react";
import { useState } from "react";

import { resolveVideoUrl } from "../../lib/video";
import { replaceVideoInputWithEmbed } from "../../lib/video-node";
import "./video-embed-input.css";

export function VideoEmbedInputNodeView({ editor, getPos }: NodeViewProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const resolved = resolveVideoUrl(url);

    if (!resolved) {
      setError("Enter a YouTube, Bilibili, or direct video URL.");
      return;
    }

    setError(null);
    replaceVideoInputWithEmbed({
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
}

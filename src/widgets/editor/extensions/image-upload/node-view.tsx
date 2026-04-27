import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { FileImage, ImageUp, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { useImageUploadRows } from "./use-image-upload-rows";
import { resolveNodeViewPosition } from "../../lib/image-upload-node";
import { formatFileSize } from "../../lib/image-upload-service";
import "./image-upload.css";

export function ImageUploadNodeView({ editor, getPos, node, extension }: NodeViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const options = extension.options as {
    upload?: Parameters<typeof useImageUploadRows>[0]["upload"];
    limit: number;
    maxSize: number;
    accept: string;
  };
  const { accept, limit, maxSize, upload } = options;
  const {
    cancelUpload,
    errorMessage,
    handleFiles,
    helperText,
    isSubmittingUrl,
    isUploading,
    remoteUrl,
    rows,
    setRemoteUrl,
    submitRemoteUrl,
  } = useImageUploadRows({
    editor,
    getPos,
    node,
    upload,
    limit,
    maxSize,
  });

  const openPicker = useCallback(() => {
    if (isUploading) {
      return;
    }

    inputRef.current?.click();
  }, [isUploading]);

  const onInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      await handleFiles(files);
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      await handleFiles(Array.from(event.dataTransfer.files));
    },
    [handleFiles],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) {
      return;
    }

    setIsDragging(false);
  }, []);

  const onMouseDown = useCallback(() => {
    const position = resolveNodeViewPosition(getPos);

    if (position === null) {
      return;
    }

    const transaction = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position));
    editor.view.dispatch(transaction);
  }, [editor, getPos]);

  return (
    <NodeViewWrapper as="div" className="image-upload-node">
      <div
        className={`image-upload-surface ${isDragging ? "is-dragging" : ""} ${isUploading ? "is-uploading" : ""} ${rows.length ? "has-progress-list" : ""}`}
        onClick={rows.length ? undefined : openPicker}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onMouseDown={onMouseDown}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} accept={accept} className="sr-only" multiple onChange={onInputChange} type="file" />
        {rows.length ? (
          <div className="image-upload-progress-list">
            {rows.map((row) => (
              <div key={row.id} className="image-upload-progress-row">
                <div className="image-upload-progress-fill" style={{ width: `${row.progress}%` }} />
                <div className="image-upload-progress-icon">
                  <ImageUp className="size-4" strokeWidth={2} />
                </div>
                <div className="image-upload-progress-copy">
                  <div className="image-upload-progress-name">{row.name ?? row.file.name}</div>
                  <div className="image-upload-progress-size">{row.meta ?? formatFileSize(row.file.size)}</div>
                </div>
                <div className="image-upload-progress-meta">
                  <span className="image-upload-progress-value">{Math.round(row.progress)}%</span>
                  <button
                    className="image-upload-progress-cancel"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelUpload(row.id);
                    }}
                    type="button"
                  >
                    <X className="size-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="image-upload-icon-shell">
              <div className="image-upload-icon-card">
                <FileImage className="image-upload-file-icon" strokeWidth={1.8} />
                <div className="image-upload-badge">
                  <ImageUp className="size-3.5" strokeWidth={2} />
                </div>
              </div>
            </div>
            <div className="image-upload-copy">
              <button className="image-upload-link" type="button">
                Click to upload
              </button>
              <span className="image-upload-copy-separator"> or drag and drop</span>
            </div>
            <div className="image-upload-url-section" onClick={(event) => event.stopPropagation()}>
              <div className="image-upload-url-divider">
                <span>Or use an image URL</span>
              </div>
              <div className="image-upload-url-row">
                <input
                  className="image-upload-url-input"
                  onChange={(event) => setRemoteUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitRemoteUrl();
                    }
                  }}
                  placeholder="https://example.com/image.png"
                  type="url"
                  value={remoteUrl}
                />
                <button
                  className="image-upload-url-button"
                  disabled={isSubmittingUrl || !remoteUrl.trim()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void submitRemoteUrl();
                  }}
                  type="button"
                >
                  Insert
                </button>
              </div>
            </div>
            <div className={`image-upload-helper ${errorMessage ? "is-error" : ""}`}>{helperText}</div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

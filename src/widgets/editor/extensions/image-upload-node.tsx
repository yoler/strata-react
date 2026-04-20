import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { FileImage, ImageUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { UploadImageOptions } from "../types";

type UploadImageHandler = (file: File, options?: UploadImageOptions) => Promise<string>;

type UploadRow = {
  file: File;
  id: string;
  progress: number;
  status: "idle" | "uploading" | "error";
  errorMessage?: string;
  name?: string;
  meta?: string;
  source: "file" | "url";
};

const pendingUploadBatches = new Map<string, File[]>();

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageUploadNode: {
      setImageUploadNode: (uploadBatchId?: string) => ReturnType;
    };
  }
}

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export const createPendingImageUploadBatch = (files: File[]) => {
  const uploadBatchId = crypto.randomUUID();
  pendingUploadBatches.set(uploadBatchId, files);
  return uploadBatchId;
};

const consumePendingImageUploadBatch = (uploadBatchId: string) => {
  const files = pendingUploadBatches.get(uploadBatchId) ?? null;
  pendingUploadBatches.delete(uploadBatchId);
  return files;
};

const resolvePosition = (getPos: NodeViewProps["getPos"]) => {
  if (typeof getPos !== "function") {
    return null;
  }

  const position = getPos();
  return typeof position === "number" ? position : null;
};

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const deriveUrlLabel = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.split("/").filter(Boolean).pop();
    return pathname || url.hostname || "remote-image";
  } catch {
    return "remote-image";
  }
};

const isLikelyImageUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const replaceWithImages = ({
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
  const position = resolvePosition(getPos);

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

const ImageUploadView = ({ editor, getPos, node, extension }: NodeViewProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  const options = extension.options as {
    upload?: UploadImageHandler;
    limit: number;
    maxSize: number;
    accept: string;
  };

  const isUploading = rows.some((row) => row.status === "uploading");
  const uploadBatchId = typeof node.attrs.uploadBatchId === "string" ? node.attrs.uploadBatchId : null;

  const updateRow = useCallback((id: string, updater: (row: UploadRow) => UploadRow) => {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? updater(row) : row)));
  }, []);

  const startUploads = useCallback(
    async (files: File[]) => {
      if (!options.upload) {
        setErrorMessage("Image upload is not configured.");
        return;
      }

      const uploadRows = files.map((file) => ({
        file,
        id: `${file.name}-${crypto.randomUUID()}`,
        progress: 0,
        status: "uploading" as const,
        name: file.name,
        meta: formatFileSize(file.size),
        source: "file" as const,
      }));

      setErrorMessage(null);
      setRows(uploadRows);

      const successfulUrls: string[] = [];

      await Promise.all(
        uploadRows.map(async (row) => {
          const controller = new AbortController();
          controllersRef.current.set(row.id, controller);

          try {
            const url = await options.upload?.(row.file, {
              signal: controller.signal,
              onProgress: (progress) => {
                updateRow(row.id, (currentRow) => ({
                  ...currentRow,
                  progress,
                }));
              },
            });

            if (url) {
              successfulUrls.push(url);
            }
          } catch (error) {
            if (controller.signal.aborted) {
              return;
            }

            updateRow(row.id, (currentRow) => ({
              ...currentRow,
              status: "error",
              errorMessage: error instanceof Error ? error.message : "Upload failed.",
            }));
          } finally {
            controllersRef.current.delete(row.id);
          }
        }),
      );

      if (successfulUrls.length) {
        replaceWithImages({ editor, node, getPos, urls: successfulUrls });
        return;
      }

      const hasError = rows.some((row) => row.status === "error");

      if (!hasError) {
        setRows([]);
      }
    },
    [editor, getPos, node, options.upload, rows, updateRow],
  );

  const handleFiles = useCallback(
    async (incomingFiles: File[]) => {
      const files = incomingFiles.filter((file) => ACCEPTED_TYPES.has(file.type)).slice(0, options.limit);

      if (!files.length) {
        setErrorMessage("Only PNG, JPEG, GIF, and WebP images are supported.");
        return;
      }

      const oversizedFile = files.find((file) => file.size > options.maxSize);

      if (oversizedFile) {
        setErrorMessage("Maximum 3 files, 5MB each.");
        return;
      }

      await startUploads(files);
    },
    [options.limit, options.maxSize, startUploads],
  );

  const helperText = useMemo(() => {
    if (isUploading) {
      return "Uploading files...";
    }

    return errorMessage ?? "Maximum 3 files, 5MB each.";
  }, [errorMessage, isUploading]);

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
    const position = resolvePosition(getPos);

    if (position === null) {
      return;
    }

    const transaction = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position));
    editor.view.dispatch(transaction);
  }, [editor, getPos]);

  const cancelUpload = useCallback((rowId: string) => {
    controllersRef.current.get(rowId)?.abort();
    controllersRef.current.delete(rowId);
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
  }, []);

  const submitRemoteUrl = useCallback(async () => {
    const trimmedUrl = remoteUrl.trim();

    if (!isLikelyImageUrl(trimmedUrl)) {
      setErrorMessage("Please enter a valid image URL.");
      return;
    }

    const rowId = `remote-${crypto.randomUUID()}`;
    let progress = 0;

    setErrorMessage(null);
    setIsSubmittingUrl(true);
    setRows([
      {
        file: new File([], deriveUrlLabel(trimmedUrl)),
        id: rowId,
        progress,
        status: "uploading",
        name: deriveUrlLabel(trimmedUrl),
        meta: "From URL",
        source: "url",
      },
    ]);

    const image = new Image();

    const progressTimer = window.setInterval(() => {
      progress = Math.min(progress + 8, 92);
      updateRow(rowId, (currentRow) => ({
        ...currentRow,
        progress,
      }));
    }, 120);

    const finalize = () => {
      window.clearInterval(progressTimer);
      setIsSubmittingUrl(false);
    };

    await new Promise<void>((resolve) => {
      image.onload = () => {
        updateRow(rowId, (currentRow) => ({
          ...currentRow,
          progress: 100,
        }));

        window.setTimeout(() => {
          replaceWithImages({ editor, node, getPos, urls: [trimmedUrl] });
          setRemoteUrl("");
          finalize();
          resolve();
        }, 180);
      };

      image.onerror = () => {
        updateRow(rowId, (currentRow) => ({
          ...currentRow,
          status: "error",
          errorMessage: "Couldn't load image from this URL.",
          progress: 0,
        }));
        setErrorMessage("Couldn't load image from this URL.");
        finalize();
        resolve();
      };

      image.src = trimmedUrl;
    });
  }, [editor, getPos, node, remoteUrl, updateRow]);

  useEffect(() => {
    if (!uploadBatchId || rows.length) {
      return;
    }

    const files = consumePendingImageUploadBatch(uploadBatchId);

    if (!files?.length) {
      return;
    }

    void handleFiles(files);
  }, [handleFiles, rows.length, uploadBatchId]);

  return (
    <NodeViewWrapper as="div" className="image-upload-node">
      <div
        className={`image-upload-surface ${isDragging ? "is-dragging" : ""} ${isUploading ? "is-uploading" : ""}`}
        onClick={rows.length ? undefined : openPicker}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onMouseDown={onMouseDown}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} accept={options.accept} className="sr-only" multiple onChange={onInputChange} type="file" />
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
};

export const ImageUploadNode = Node.create({
  name: "imageUpload",
  group: "block",
  atom: true,
  isolating: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      accept: "image/*",
      limit: MAX_FILES,
      maxSize: MAX_FILE_SIZE,
      upload: undefined as UploadImageHandler | undefined,
    };
  },

  addAttributes() {
    return {
      uploadBatchId: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-upload" })];
  },

  addCommands() {
    return {
      setImageUploadNode:
        (uploadBatchId?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: uploadBatchId ? { uploadBatchId } : {},
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUploadView);
  },
});

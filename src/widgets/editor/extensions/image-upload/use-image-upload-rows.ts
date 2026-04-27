import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { consumePendingImageUploadBatch } from "../../lib/image-upload-batches";
import {
  deriveUrlLabel,
  isLikelyImageUrl,
  replaceImageUploadNodeWithImages,
} from "../../lib/image-upload-node";
import {
  createUploadRows,
  type UploadImageHandler,
  type UploadRow,
  uploadImageRows,
  validateImageFiles,
} from "../../lib/image-upload-service";

type UseImageUploadRowsOptions = {
  editor: NodeViewProps["editor"];
  getPos: NodeViewProps["getPos"];
  node: NodeViewProps["node"];
  upload?: UploadImageHandler;
  limit: number;
  maxSize: number;
};

export function useImageUploadRows({
  editor,
  getPos,
  node,
  upload,
  limit,
  maxSize,
}: UseImageUploadRowsOptions) {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  const isUploading = useMemo(() => rows.some((row) => row.status === "uploading"), [rows]);
  const uploadBatchId = typeof node.attrs.uploadBatchId === "string" ? node.attrs.uploadBatchId : null;

  const updateRow = useCallback((id: string, updater: (row: UploadRow) => UploadRow) => {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? updater(row) : row)));
  }, []);

  const startUploads = useCallback(
    async (files: File[]) => {
      if (!upload) {
        setErrorMessage("Image upload is not configured.");
        return;
      }

      const uploadRows = createUploadRows(files);
      setErrorMessage(null);
      setRows(uploadRows);

      const results = await uploadImageRows({
        rows: uploadRows,
        upload,
        controllers: controllersRef.current,
        onProgress: (rowId, progress) => {
          updateRow(rowId, (currentRow) => ({
            ...currentRow,
            progress,
          }));
        },
        onError: (rowId, nextErrorMessage) => {
          updateRow(rowId, (currentRow) => ({
            ...currentRow,
            status: "error",
            errorMessage: nextErrorMessage,
          }));
        },
      });

      const successfulUrls = results
        .filter((result): result is Extract<(typeof results)[number], { status: "success" }> => result.status === "success")
        .map((result) => result.url);

      if (successfulUrls.length) {
        replaceImageUploadNodeWithImages({ editor, node, getPos, urls: successfulUrls });
        return;
      }

      const hasError = results.some((result) => result.status === "error");

      if (!hasError) {
        setRows([]);
      }
    },
    [editor, getPos, node, updateRow, upload],
  );

  const handleFiles = useCallback(
    async (incomingFiles: File[]) => {
      const { errorMessage: nextErrorMessage, files } = validateImageFiles({
        incomingFiles,
        limit,
        maxSize,
      });

      if (nextErrorMessage) {
        setErrorMessage(nextErrorMessage);
        return;
      }

      await startUploads(files);
    },
    [limit, maxSize, startUploads],
  );

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
          replaceImageUploadNodeWithImages({ editor, node, getPos, urls: [trimmedUrl] });
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

    queueMicrotask(() => {
      void handleFiles(files);
    });
  }, [handleFiles, rows.length, uploadBatchId]);

  const helperText = isUploading ? "Uploading files..." : (errorMessage ?? "Maximum 3 files, 5MB each.");

  return {
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
  };
}

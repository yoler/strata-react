import { IMAGE_UPLOAD_ACCEPTED_MIME_TYPE_SET } from "../config/uploads";
import type { UploadImageOptions } from "../types";

export type UploadImageHandler = (file: File, options?: UploadImageOptions) => Promise<string>;

export type UploadRow = {
  file: File;
  id: string;
  progress: number;
  status: "idle" | "uploading" | "error";
  errorMessage?: string;
  name?: string;
  meta?: string;
  source: "file" | "url";
};

export type UploadResult =
  | { status: "success"; url: string }
  | { status: "error" }
  | { status: "aborted" };

type ValidateImageFilesOptions = {
  incomingFiles: File[];
  limit: number;
  maxSize: number;
};

type UploadImageRowsOptions = {
  rows: UploadRow[];
  upload: UploadImageHandler;
  controllers: Map<string, AbortController>;
  onProgress: (rowId: string, progress: number) => void;
  onError: (rowId: string, errorMessage: string) => void;
};

export function createUploadRows(files: File[]) {
  return files.map((file) => ({
    file,
    id: `${file.name}-${crypto.randomUUID()}`,
    progress: 0,
    status: "uploading" as const,
    name: file.name,
    meta: formatFileSize(file.size),
    source: "file" as const,
  }));
}

export function validateImageFiles({ incomingFiles, limit, maxSize }: ValidateImageFilesOptions) {
  const files = incomingFiles.filter((file) => IMAGE_UPLOAD_ACCEPTED_MIME_TYPE_SET.has(file.type)).slice(0, limit);

  if (!files.length) {
    return { errorMessage: "Only PNG, JPEG, GIF, and WebP images are supported.", files: [] as File[] };
  }

  const oversizedFile = files.find((file) => file.size > maxSize);

  if (oversizedFile) {
    return { errorMessage: "Maximum 3 files, 5MB each.", files: [] as File[] };
  }

  return { errorMessage: null, files };
}

export async function uploadImageRows({
  rows,
  upload,
  controllers,
  onProgress,
  onError,
}: UploadImageRowsOptions): Promise<UploadResult[]> {
  return Promise.all(
    rows.map(async (row) => {
      const controller = new AbortController();
      controllers.set(row.id, controller);

      try {
        const url = await upload(row.file, {
          signal: controller.signal,
          onProgress: (progress) => onProgress(row.id, progress),
        });

        return url ? ({ status: "success", url } satisfies UploadResult) : ({ status: "error" } satisfies UploadResult);
      } catch (error) {
        if (controller.signal.aborted) {
          return { status: "aborted" } satisfies UploadResult;
        }

        onError(row.id, error instanceof Error ? error.message : "Upload failed.");
        return { status: "error" } satisfies UploadResult;
      } finally {
        controllers.delete(row.id);
      }
    }),
  );
}

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

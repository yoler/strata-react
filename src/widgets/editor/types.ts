import type { JSONContent } from "@tiptap/react";

export type UploadImageOptions = {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

export interface NotionEditorProps {
  initialContent?: JSONContent | string;
  onChange?: (content: JSONContent) => void;
  uploadImage?: (file: File, options?: UploadImageOptions) => Promise<string>;
  readOnly?: boolean;
}

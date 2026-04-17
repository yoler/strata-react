import type { JSONContent } from "@tiptap/react";

export interface NotionEditorProps {
  initialContent?: JSONContent | string;
  onChange?: (content: JSONContent) => void;
  uploadImage?: (file: File) => Promise<string>;
  readOnly?: boolean;
}

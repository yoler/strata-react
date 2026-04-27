import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { ImageUploadNodeView } from "./node-view";
import {
  IMAGE_UPLOAD_MAX_FILE_SIZE,
  IMAGE_UPLOAD_MAX_FILES,
} from "../../config/uploads";
import { createPendingImageUploadBatch } from "../../lib/image-upload-batches";
import type { UploadImageHandler } from "../../lib/image-upload-service";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageUploadNode: {
      setImageUploadNode: (uploadBatchId?: string) => ReturnType;
    };
  }
}

export { createPendingImageUploadBatch };

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
      limit: IMAGE_UPLOAD_MAX_FILES,
      maxSize: IMAGE_UPLOAD_MAX_FILE_SIZE,
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
    return ReactNodeViewRenderer(ImageUploadNodeView);
  },
});

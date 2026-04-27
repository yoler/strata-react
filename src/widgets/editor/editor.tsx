import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BubbleMenu } from "./components/bubble-menu/bubble-menu";
import { DragHandle } from "./components/drag-handle/drag-handle";
import { ImageMenu } from "./components/image-menu/image-menu";
import { TableControls } from "./components/table-controls/table-controls";
import { IMAGE_UPLOAD_ACCEPTED_MIME_TYPES } from "./config/uploads";
import { createPendingImageUploadBatch } from "./extensions/image-upload/extension";
import { useCodeBlockPasteDetection } from "./hooks/use-code-block-paste-detection";
import { useEditorContentSync } from "./hooks/use-editor-content-sync";
import { createEditorExtensions } from "./lib/create-editor-extensions";
import "./styles/tokens.css";
import "./styles/content.css";
import type { NotionEditorProps } from "./types";

export function NotionEditor({
  initialContent,
  onChange,
  uploadImage,
  readOnly,
}: NotionEditorProps) {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const extensions = useMemo(() => createEditorExtensions({ uploadImage }), [uploadImage]);
  const handleCodeBlockPaste = useCodeBlockPasteDetection({ editorRef });

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[500px] w-full px-4 py-8 pb-4 focus:outline-none sm:pl-16 sm:pr-8",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) {
          return false;
        }

        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
          IMAGE_UPLOAD_ACCEPTED_MIME_TYPES.includes(file.type as (typeof IMAGE_UPLOAD_ACCEPTED_MIME_TYPES)[number]),
        );

        if (!files.length) {
          return false;
        }

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        const uploadBatchId = createPendingImageUploadBatch(files);

        editor
          .chain()
          .focus()
          .insertContentAt(coordinates?.pos ?? editor.state.selection.from, {
            type: "imageUpload",
            attrs: { uploadBatchId },
          })
          .run();
        return true;
      },
      handlePaste: handleCodeBlockPaste,
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEditorContentSync({ editor, initialContent });

  if (!editor) {
    return null;
  }

  return (
    <div ref={setContainerElement} className="relative w-full rounded-lg border bg-background text-foreground shadow-sm">
      {!readOnly && <BubbleMenu editor={editor} />}
      {!readOnly && <ImageMenu editor={editor} />}
      {!readOnly && <TableControls container={containerElement} editor={editor} />}
      {!readOnly && <DragHandle editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

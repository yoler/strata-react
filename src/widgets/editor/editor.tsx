import { Color } from "@tiptap/extension-color";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";

import { BubbleMenu } from "./components/bubble-menu";
import { DragHandle } from "./components/drag-handle";
import { SlashCommand } from "./extensions/slash-command";
import "./styles.css";
import type { NotionEditorProps } from "./types";

export function NotionEditor({ initialContent, onChange, uploadImage, readOnly }: NotionEditorProps) {
  const handleUpload = useCallback(
    async (file: File, editor: Editor, pos?: number) => {
      if (!uploadImage) return;

      try {
        const url = await uploadImage(file);

        if (!url) return;

        if (pos !== undefined) {
          editor
            .chain()
            .focus()
            .insertContentAt(pos, {
              type: "image",
              attrs: { src: url },
            })
            .run();
          return;
        }

        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error("Image upload failed", error);
      }
    },
    [uploadImage],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: {
          color: "rgba(35, 131, 226, 0.4)",
          width: 3,
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`;
          }

          return "Press '/' for commands, or type...";
        },
        emptyNodeClass: "is-empty",
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      SlashCommand,
      FileHandler.configure({
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        onDrop: (currentEditor, files, pos) => {
          files.forEach((file) => handleUpload(file, currentEditor, pos));
        },
        onPaste: (currentEditor, files) => {
          files.forEach((file) => handleUpload(file, currentEditor));
        },
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[500px] w-full px-4 py-8 pb-4 focus:outline-none sm:pl-16 sm:pr-8",
      },
    },
  });

  useEffect(() => {
    if (!editor || initialContent === undefined) {
      return;
    }

    if (typeof initialContent === "string") {
      if (editor.getHTML() === initialContent) {
        return;
      }
    } else {
      const currentContent = JSON.stringify(editor.getJSON());
      const nextContent = JSON.stringify(initialContent);

      if (currentContent === nextContent) {
        return;
      }
    }

    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full rounded-lg border bg-background text-foreground shadow-sm">
      {!readOnly && <BubbleMenu editor={editor} />}
      {!readOnly && <DragHandle editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

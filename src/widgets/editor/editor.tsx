import { Color } from "@tiptap/extension-color";
import FileHandler from "@tiptap/extension-file-handler";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useRef } from "react";

import { BubbleMenu } from "./components/bubble-menu";
import { DragHandle } from "./components/drag-handle";
import { ImageMenu } from "./components/image-menu";
import { TableControls } from "./components/table-controls";
import { EditorCodeBlock } from "./extensions/code-block-extension";
import { EmojiNode } from "./extensions/emoji-node";
import { EmojiSuggestion } from "./extensions/emoji-suggestion";
import { EditorImage } from "./extensions/image-extension";
import { createPendingImageUploadBatch, ImageUploadNode } from "./extensions/image-upload-node";
import { Indent } from "./extensions/indent-extension";
import { SlashCommand } from "./extensions/slash-command";
import { EditorTableCell, EditorTableHeader } from "./extensions/table-extensions";
import { VideoEmbed, VideoEmbedInput } from "./extensions/video-embed";
import { DEFAULT_CODE_BLOCK_LANGUAGE, detectCodeBlockLanguage, lowlight } from "./lib/code-block";
import "./styles.css";
import type { NotionEditorProps, UploadImageOptions } from "./types";

export function NotionEditor({ initialContent, onChange, uploadImage, readOnly }: NotionEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleUpload = useCallback(
    async (file: File, editor: Editor, pos?: number, options?: UploadImageOptions) => {
      if (!uploadImage) return;

      try {
        const url = await uploadImage(file, options);

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
        codeBlock: false,
        link: false,
        underline: false,
        dropcursor: {
          color: "rgba(35, 131, 226, 0.4)",
          width: 3,
        },
      }),
      Placeholder.configure({
        placeholder: () => "Write, type '/' for commands...",
        emptyNodeClass: "is-empty",
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      EditorImage.configure({
        resize: {
          enabled: true,
          directions: ["left", "right"],
          minWidth: 120,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      ImageUploadNode.configure({
        upload: uploadImage,
      }),
      VideoEmbed,
      VideoEmbedInput,
      EditorCodeBlock.configure({
        lowlight,
        defaultLanguage: DEFAULT_CODE_BLOCK_LANGUAGE,
        enableTabIndentation: true,
        tabSize: 2,
        HTMLAttributes: {
          class: "code-block",
        },
      }),
      EmojiNode,
      EmojiSuggestion,
      SlashCommand,
      FileHandler.configure({
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        onPaste: (currentEditor, files) => {
          files.forEach((file) => handleUpload(file, currentEditor));
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Indent,
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      EditorTableHeader,
      EditorTableCell,
    ],
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
          ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type),
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
      handlePaste: (view, event) => {
        if (event.clipboardData?.files.length) {
          return false;
        }

        const text = event.clipboardData?.getData("text/plain");
        const { selection } = view.state;
        const codeBlockNode = selection.$from.parent.type.name === "codeBlock" ? selection.$from.parent : null;

        if (!codeBlockNode || !text) {
          return false;
        }

        const shouldAutoDetect =
          codeBlockNode.textContent.trim().length === 0 ||
          (selection.from === selection.$from.start() && selection.to === selection.$from.end());

        event.preventDefault();
        view.dispatch(view.state.tr.insertText(text, selection.from, selection.to).scrollIntoView());

        if (!shouldAutoDetect) {
          return true;
        }

        requestAnimationFrame(() => {
          if (!editor || editor.isDestroyed) {
            return;
          }

          const { selection: currentSelection } = editor.state;
          const currentCodeBlock =
            currentSelection.$from.parent.type.name === "codeBlock" ? currentSelection.$from.parent : null;

          if (!currentCodeBlock) {
            return;
          }

          const nextLanguage = detectCodeBlockLanguage(currentCodeBlock.textContent);
          const currentLanguage =
            (currentCodeBlock.attrs.language as string | undefined) ?? DEFAULT_CODE_BLOCK_LANGUAGE;

          if (nextLanguage === currentLanguage) {
            return;
          }

          editor.chain().focus().updateAttributes("codeBlock", { language: nextLanguage }).run();
        });

        return true;
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
    <div ref={containerRef} className="relative w-full rounded-lg border bg-background text-foreground shadow-sm">
      {!readOnly && <BubbleMenu editor={editor} />}
      {!readOnly && <ImageMenu editor={editor} />}
      {!readOnly && <TableControls container={containerRef.current} editor={editor} />}
      {!readOnly && <DragHandle editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

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
import StarterKit from "@tiptap/starter-kit";

import { DEFAULT_CODE_BLOCK_LANGUAGE, lowlight } from "./code-block";
import { IMAGE_UPLOAD_ACCEPTED_MIME_TYPES } from "../config/uploads";
import { BlockStyle } from "../extensions/block-style-extension";
import { EditorCodeBlock } from "../extensions/code-block/extension";
import { EditorEmoji } from "../extensions/emoji-suggestion";
import { EditorHorizontalRule } from "../extensions/horizontal-rule";
import { EditorImage } from "../extensions/image-extension";
import { createPendingImageUploadBatch, ImageUploadNode } from "../extensions/image-upload/extension";
import { Indent } from "../extensions/indent-extension";
import { SlashCommand } from "../extensions/slash-command";
import { EditorTableCell, EditorTableHeader } from "../extensions/table-extensions";
import { VideoEmbed, VideoEmbedInput } from "../extensions/video-embed/extension";
import type { NotionEditorProps } from "../types";

export const createEditorExtensions = ({ uploadImage }: Pick<NotionEditorProps, "uploadImage">) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    horizontalRule: false,
    link: false,
    underline: false,
    dropcursor: {
      color: "rgba(35, 131, 226, 0.4)",
      width: 3,
    },
  }),
  EditorHorizontalRule,
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
  EditorEmoji,
  SlashCommand,
  FileHandler.configure({
    allowedMimeTypes: [...IMAGE_UPLOAD_ACCEPTED_MIME_TYPES],
    onPaste: (editor, files) => {
      const uploadBatchId = createPendingImageUploadBatch(files);

      editor
        .chain()
        .focus()
        .insertContent({
          type: "imageUpload",
          attrs: { uploadBatchId },
        })
        .run();
    },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  BlockStyle,
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
];

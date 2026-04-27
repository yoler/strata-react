import type { Editor, JSONContent, Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { CodeSquare, Heading1, Heading2, Heading3, Image as ImageIcon, List, ListOrdered, ListTodo, Minus, Quote, Smile, Table as TableIcon, Type, Video } from "lucide-react";
import { PluginKey } from "prosemirror-state";
import type { ComponentProps } from "react";

import { SlashCommandMenu, type SlashCommandItem, type SlashCommandMenuHandle } from "../components/slash-command-menu/slash-command-menu";
import { DEFAULT_CODE_BLOCK_LANGUAGE } from "../lib/code-block";
import { createSuggestionPopupRenderer } from "../lib/suggestion-popup";

const slashCommandPluginKey = new PluginKey("slash-command-suggestion");
const DEFAULT_TABLE_COLUMN_MIN_WIDTH = 120;

function getDefaultTableColumnWidth(editor: Editor, columnCount: number) {
  const editorElement = editor.view.dom;
  const editorStyle = window.getComputedStyle(editorElement);
  const horizontalPadding = parseFloat(editorStyle.paddingLeft) + parseFloat(editorStyle.paddingRight);
  const availableWidth = Math.max(0, editorElement.clientWidth - horizontalPadding);

  return Math.max(DEFAULT_TABLE_COLUMN_MIN_WIDTH, Math.floor(availableWidth / columnCount));
}

function createFixedWidthTableContent({
  cols,
  columnWidth,
  rows,
  withHeaderRow,
}: {
  cols: number;
  columnWidth: number;
  rows: number;
  withHeaderRow: boolean;
}): JSONContent {
  return {
    type: "table",
    content: Array.from({ length: rows }, (_, rowIndex) => ({
      type: "tableRow",
      content: Array.from({ length: cols }, () => ({
        type: withHeaderRow && rowIndex === 0 ? "tableHeader" : "tableCell",
        attrs: {
          colwidth: [columnWidth],
        },
        content: [{ type: "paragraph" }],
      })),
    })),
  };
}

function getSuggestionItems({
  query,
}: {
  query: string;
}): SlashCommandItem[] {
  const normalizedQuery = query.toLowerCase();
  const items: SlashCommandItem[] = [
    {
      title: "Text",
      description: "Just start writing with plain text.",
      icon: Type,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").run();
      },
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      icon: Heading1,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      icon: Heading2,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading.",
      icon: Heading3,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "Bulleted list",
      description: "Create a simple bulleted list.",
      icon: List,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered list",
      description: "Create a list with numbering.",
      icon: ListOrdered,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "To-do list",
      description: "Track tasks with a to-do list.",
      icon: ListTodo,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Quote",
      description: "Capture a quote.",
      icon: Quote,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Code block",
      description: "Capture a code snippet.",
      icon: CodeSquare,
      group: "Style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("codeBlock", { language: DEFAULT_CODE_BLOCK_LANGUAGE }).run();
      },
    },
    {
      title: "Emoji",
      description: "Open the emoji picker.",
      icon: Smile,
      group: "Insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent(":").run();
      },
    },
    {
      title: "Image",
      description: "Insert an image upload block.",
      icon: ImageIcon,
      group: "Insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setImageUploadNode().run();
      },
    },
    {
      title: "Video",
      description: "Embed a video from a link.",
      icon: Video,
      group: "Insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setVideoEmbedInput().run();
      },
    },
    {
      title: "Table",
      description: "Add simple tabular content.",
      icon: TableIcon,
      group: "Insert",
      command: ({ editor, range }) => {
        const rows = 3;
        const cols = 3;
        const table = createFixedWidthTableContent({
          rows,
          cols,
          withHeaderRow: true,
          columnWidth: getDefaultTableColumnWidth(editor, cols),
        });

        editor.chain().focus().deleteRange(range).insertContent(table).run();
      },
    },
    {
      title: "Divider",
      description: "Visually divide blocks.",
      icon: Minus,
      group: "Insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery) ||
      item.group.toLowerCase().includes(normalizedQuery)
    );
  });
}

function renderItems() {
  return createSuggestionPopupRenderer<
    SlashCommandItem,
    SlashCommandMenuHandle,
    ComponentProps<typeof SlashCommandMenu>
  >({
    component: SlashCommandMenu,
    getProps: (props) => ({
      command: props.command,
      items: props.items,
    }),
    pluginKey: slashCommandPluginKey,
    position: {
      height: 360,
      offset: 8,
      padding: 8,
      width: 238,
    },
  });
}

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        allowedPrefixes: null,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey: slashCommandPluginKey,
        items: ({ query }) => getSuggestionItems({ query }),
        render: renderItems,
        decorationClass: "tiptap-slash-decoration is-empty",
        decorationContent: "Filter...",
      }),
    ];
  },
});

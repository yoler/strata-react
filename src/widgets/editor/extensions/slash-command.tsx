import type { Editor, JSONContent, Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { CodeSquare, Heading1, Heading2, Heading3, Image as ImageIcon, List, ListOrdered, ListTodo, Minus, Quote, Smile, Table as TableIcon, Type, Video } from "lucide-react";
import { PluginKey } from "prosemirror-state";
import type { ComponentProps } from "react";

import { SlashCommandMenu, type SlashCommandItem, type SlashCommandMenuHandle } from "../components/slash-command-menu/slash-command-menu";
import { DEFAULT_CODE_BLOCK_LANGUAGE } from "../lib/code-block";
import { editorT } from "../lib/i18n";
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
      title: editorT("slash.items.text.title"),
      description: editorT("slash.items.text.description"),
      icon: Type,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").run();
      },
    },
    {
      title: editorT("slash.items.heading1.title"),
      description: editorT("slash.items.heading1.description"),
      icon: Heading1,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: editorT("slash.items.heading2.title"),
      description: editorT("slash.items.heading2.description"),
      icon: Heading2,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: editorT("slash.items.heading3.title"),
      description: editorT("slash.items.heading3.description"),
      icon: Heading3,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: editorT("slash.items.bulletedList.title"),
      description: editorT("slash.items.bulletedList.description"),
      icon: List,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: editorT("slash.items.numberedList.title"),
      description: editorT("slash.items.numberedList.description"),
      icon: ListOrdered,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: editorT("slash.items.todoList.title"),
      description: editorT("slash.items.todoList.description"),
      icon: ListTodo,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: editorT("slash.items.quote.title"),
      description: editorT("slash.items.quote.description"),
      icon: Quote,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: editorT("slash.items.codeBlock.title"),
      description: editorT("slash.items.codeBlock.description"),
      icon: CodeSquare,
      group: "style",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("codeBlock", { language: DEFAULT_CODE_BLOCK_LANGUAGE }).run();
      },
    },
    {
      title: editorT("slash.items.emoji.title"),
      description: editorT("slash.items.emoji.description"),
      icon: Smile,
      group: "insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent(":").run();
      },
    },
    {
      title: editorT("slash.items.image.title"),
      description: editorT("slash.items.image.description"),
      icon: ImageIcon,
      group: "insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setImageUploadNode().run();
      },
    },
    {
      title: editorT("slash.items.video.title"),
      description: editorT("slash.items.video.description"),
      icon: Video,
      group: "insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setVideoEmbedInput().run();
      },
    },
    {
      title: editorT("slash.items.table.title"),
      description: editorT("slash.items.table.description"),
      icon: TableIcon,
      group: "insert",
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
      title: editorT("slash.items.divider.title"),
      description: editorT("slash.items.divider.description"),
      icon: Minus,
      group: "insert",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery) ||
      editorT(`slash.groups.${item.group}`).toLowerCase().includes(normalizedQuery)
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
        decorationContent: editorT("slash.filterPlaceholder"),
      }),
    ];
  },
});

import type { Editor, Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import Suggestion from "@tiptap/suggestion";
import { CodeSquare, Heading1, Heading2, Heading3, Image as ImageIcon, List, ListOrdered, ListTodo, Minus, Quote, Smile, Table as TableIcon, Type, Video } from "lucide-react";
import { PluginKey } from "prosemirror-state";

import { SlashCommandMenu, type SlashCommandItem, type SlashCommandMenuHandle } from "../components/slash-command-menu";
import { DEFAULT_CODE_BLOCK_LANGUAGE } from "../lib/code-block";

const slashCommandPluginKey = new PluginKey("slash-command-suggestion");

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
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").run();
      },
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      icon: Heading1,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      icon: Heading2,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading.",
      icon: Heading3,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "To-do list",
      description: "Track tasks with a to-do list.",
      icon: ListTodo,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Bulleted list",
      description: "Create a simple bulleted list.",
      icon: List,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered list",
      description: "Create a list with numbering.",
      icon: ListOrdered,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      description: "Capture a quote.",
      icon: Quote,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Divider",
      description: "Visually divide blocks.",
      icon: Minus,
      group: "Basic blocks",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "Table",
      description: "Add simple tabular content.",
      icon: TableIcon,
      group: "Advanced",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: "Emoji",
      description: "Open the emoji picker.",
      icon: Smile,
      group: "Advanced",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent(":").run();
      },
    },
    {
      title: "Image",
      description: "Insert an image upload block.",
      icon: ImageIcon,
      group: "Advanced",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setImageUploadNode().run();
      },
    },
    {
      title: "Video",
      description: "Embed a video from a link.",
      icon: Video,
      group: "Advanced",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setVideoEmbedInput().run();
      },
    },
    {
      title: "Code block",
      description: "Capture a code snippet.",
      icon: CodeSquare,
      group: "Advanced",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("codeBlock", { language: DEFAULT_CODE_BLOCK_LANGUAGE }).run();
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

const updatePopupPosition = (
  container: HTMLDivElement | null,
  clientRect?: SuggestionProps<SlashCommandItem>["clientRect"],
) => {
  if (!container || !clientRect) {
    return;
  }

  const rect = clientRect();

  if (!rect) {
    return;
  }

  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.bottom + 8}px`;
};

function renderItems() {
  let component: ReactRenderer<SlashCommandMenuHandle, React.ComponentProps<typeof SlashCommandMenu>> | null = null;
  let popup: HTMLDivElement | null = null;

  return {
    onStart: (props: SuggestionProps<SlashCommandItem>) => {
      component = new ReactRenderer(SlashCommandMenu, {
        props: {
          command: props.command,
          items: props.items,
        },
        editor: props.editor,
      });

      popup = document.createElement("div");
      popup.style.position = "fixed";
      popup.style.zIndex = "9999";
      document.body.appendChild(popup);
      popup.appendChild(component.element);

      component.ref?.resetSelection();
      updatePopupPosition(popup, props.clientRect);
    },
    onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
      component?.updateProps({
        command: props.command,
        items: props.items,
      });
      component?.ref?.resetSelection();
      updatePopupPosition(popup, props.clientRect);
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") {
        popup?.remove();
        return true;
      }

      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit: () => {
      popup?.remove();
      component?.destroy();
    },
  };
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

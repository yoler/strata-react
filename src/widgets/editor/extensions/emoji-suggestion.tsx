import type { Editor, Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "prosemirror-state";

import { EmojiMenu, type EmojiMenuHandle, type EmojiSuggestionItem } from "../components/emoji-menu";
import { EMOJI_OPTIONS } from "../lib/twemoji";

const emojiSuggestionPluginKey = new PluginKey("emoji-suggestion");

const getEmojiItems = ({ query }: { query: string }) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return EMOJI_OPTIONS.filter((item) => item.src);
  }

  return EMOJI_OPTIONS.filter((item) => {
    return (
      item.src &&
      (item.name.includes(normalizedQuery) ||
        item.name.replaceAll("_", " ").includes(normalizedQuery) ||
        item.keywords.some((keyword) => keyword.includes(normalizedQuery)))
    );
  });
};

const updatePopupPosition = (
  container: HTMLDivElement | null,
  clientRect?: SuggestionProps<EmojiSuggestionItem>["clientRect"],
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
  let component: ReactRenderer<EmojiMenuHandle, React.ComponentProps<typeof EmojiMenu>> | null = null;
  let popup: HTMLDivElement | null = null;

  return {
    onStart: (props: SuggestionProps<EmojiSuggestionItem>) => {
      component = new ReactRenderer(EmojiMenu, {
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
    onUpdate: (props: SuggestionProps<EmojiSuggestionItem>) => {
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

export const EmojiSuggestion = Extension.create({
  name: "emojiSuggestion",
  addOptions() {
    return {
      suggestion: {
        char: ":",
        startOfLine: false,
        allowedPrefixes: null,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: EmojiSuggestionItem;
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "emoji",
              attrs: {
                emoji: props.emoji,
                name: props.name,
                src: props.src,
              },
            })
            .run();
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<EmojiSuggestionItem, EmojiSuggestionItem>({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey: emojiSuggestionPluginKey,
        items: getEmojiItems,
        render: renderItems,
      }),
    ];
  },
});

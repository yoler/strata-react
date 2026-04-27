import Emoji, { EmojiSuggestionPluginKey, type EmojiItem } from "@tiptap/extension-emoji";

import { EmojiMenu, type EmojiMenuHandle } from "../components/emoji-menu/emoji-menu";
import { createSuggestionPopupRenderer } from "../lib/suggestion-popup";
import { TWEMOJI_OPTIONS } from "../lib/twemoji";

const getEmojiItems = ({ query }: { query: string }) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return TWEMOJI_OPTIONS;
  }

  return TWEMOJI_OPTIONS.filter((item) => {
    return (
      item.name.includes(normalizedQuery) ||
      item.shortcodes.some((shortcode) => shortcode.includes(normalizedQuery)) ||
      item.tags.some((tag) => tag.includes(normalizedQuery))
    );
  });
};

const renderItems = () =>
  createSuggestionPopupRenderer<EmojiItem, EmojiMenuHandle, React.ComponentProps<typeof EmojiMenu>>({
    component: EmojiMenu,
    getProps: (props) => ({
      command: props.command,
      items: props.items,
    }),
    pluginKey: EmojiSuggestionPluginKey,
    position: {
      height: 336,
      offset: 8,
      padding: 8,
      width: 360,
    },
  });

export const EditorEmoji = Emoji.configure({
  emojis: TWEMOJI_OPTIONS,
  forceFallbackImages: true,
  suggestion: {
    char: ":",
    pluginKey: EmojiSuggestionPluginKey,
    items: getEmojiItems,
    render: renderItems,
  },
});

import { mergeAttributes, Node } from "@tiptap/core";

export const EmojiNode = Node.create({
  name: "emoji",
  inline: true,
  group: "inline",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      emoji: {
        default: "",
      },
      name: {
        default: "",
      },
      src: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="emoji"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { emoji, name, src, ...rest } = HTMLAttributes;

    return [
      "span",
      mergeAttributes(rest, {
        "data-type": "emoji",
        "data-name": name,
        "data-emoji": emoji,
        contenteditable: "false",
      }),
      [
        "img",
        {
          src,
          alt: emoji,
          title: name ? `:${name}:` : emoji,
          draggable: "false",
        },
      ],
    ];
  },
});

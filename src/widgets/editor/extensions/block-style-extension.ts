import { Extension, type CommandProps } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockStyle: {
      setBlockBackgroundColor: (color?: string) => ReturnType;
      unsetBlockBackgroundColor: () => ReturnType;
    };
  }
}

const blockBackgroundTypes = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
] as const;

export const BlockStyle = Extension.create({
  name: "blockStyle",

  addGlobalAttributes() {
    return [
      {
        types: [...blockBackgroundTypes],
        attributes: {
          blockBackgroundColor: {
            default: null,
            parseHTML: (element) => {
              return element.getAttribute("data-block-background-color") ?? null;
            },
            renderHTML: (attributes) => {
              if (!attributes.blockBackgroundColor) {
                return {};
              }

              return {
                "data-block-background-color": attributes.blockBackgroundColor,
                style: `--tt-block-background-color: ${attributes.blockBackgroundColor};`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const supportedTypes = new Set(blockBackgroundTypes);

    const updateBlockBackground =
      (color: string | null) =>
      ({ commands, state }: CommandProps) => {
        const { selection } = state;

        for (let depth = 0; depth <= selection.$from.depth; depth += 1) {
          const node = selection.$from.node(depth);

          if (!supportedTypes.has(node.type.name as (typeof blockBackgroundTypes)[number])) {
            continue;
          }

          return commands.updateAttributes(node.type.name, {
            blockBackgroundColor: color,
          });
        }

        return false;
      };

    return {
      setBlockBackgroundColor:
        (color?: string) =>
          updateBlockBackground(color ?? null),
      unsetBlockBackgroundColor:
        () =>
          updateBlockBackground(null),
    };
  },
});

import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

type IndentOptions = {
  maxLevel: number;
  minLevel: number;
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      decreaseIndent: () => ReturnType;
      increaseIndent: () => ReturnType;
    };
  }
}

function clampIndent(value: number, minLevel: number, maxLevel: number) {
  return Math.min(Math.max(value, minLevel), maxLevel);
}

function updateNodeIndent(
  tr: Transaction,
  node: ProseMirrorNode,
  pos: number,
  delta: number,
  minLevel: number,
  maxLevel: number,
) {
  const currentIndent = typeof node.attrs.indent === "number" ? node.attrs.indent : 0;
  const nextIndent = clampIndent(currentIndent + delta, minLevel, maxLevel);

  if (nextIndent === currentIndent) {
    return;
  }

  tr.setNodeMarkup(pos, undefined, {
    ...node.attrs,
    indent: nextIndent,
  });
}

function updateSelectionIndent(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, options: IndentOptions, delta: number) {
  const { selection } = state;
  const tr = state.tr;
  const allowedTypes = new Set(options.types);

  if (selection.empty) {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      const node = selection.$from.node(depth);

      if (!allowedTypes.has(node.type.name)) {
        continue;
      }

      updateNodeIndent(tr, node, selection.$from.before(depth), delta, options.minLevel, options.maxLevel);
      break;
    }
  } else {
    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (!allowedTypes.has(node.type.name)) {
        return true;
      }

      updateNodeIndent(tr, node, pos, delta, options.minLevel, options.maxLevel);
      return false;
    });
  }

  if (!tr.docChanged) {
    return false;
  }

  dispatch?.(tr.scrollIntoView());
  return true;
}

export const Indent = Extension.create<IndentOptions>({
  name: "indent",

  addOptions() {
    return {
      maxLevel: 6,
      minLevel: 0,
      types: ["paragraph", "heading"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indent = Number(element.getAttribute("data-indent"));

              return Number.isFinite(indent) ? indent : 0;
            },
            renderHTML: (attributes) => {
              const indent = typeof attributes.indent === "number" ? attributes.indent : 0;

              if (indent <= 0) {
                return {};
              }

              return {
                "data-indent": String(indent),
                style: `--tt-indent-level: ${indent};`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      decreaseIndent:
        () =>
        ({ dispatch, state }) =>
          updateSelectionIndent(state, dispatch, this.options, -1),
      increaseIndent:
        () =>
        ({ dispatch, state }) =>
          updateSelectionIndent(state, dispatch, this.options, 1),
    };
  },
});

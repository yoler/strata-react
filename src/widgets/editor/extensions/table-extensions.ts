import { mergeAttributes } from "@tiptap/core";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

type CellTextAlign = "left" | "center" | "right";

const createCellAttributes = () => ({
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute("data-cell-background-color") ?? element.style.backgroundColor ?? null,
    renderHTML: (attributes: { backgroundColor?: string | null }) => {
      if (!attributes.backgroundColor) {
        return {};
      }

      return {
        "data-cell-background-color": attributes.backgroundColor,
        style: `background-color: ${attributes.backgroundColor};`,
      };
    },
  },
  textColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute("data-cell-text-color") ?? element.style.color ?? null,
    renderHTML: (attributes: { textColor?: string | null }) => {
      if (!attributes.textColor) {
        return {};
      }

      return {
        "data-cell-text-color": attributes.textColor,
        style: `color: ${attributes.textColor};`,
      };
    },
  },
  textAlign: {
    default: "left" as CellTextAlign,
    parseHTML: (element: HTMLElement) => {
      const value = element.getAttribute("data-text-align") ?? element.style.textAlign;

      if (value === "center" || value === "right") {
        return value;
      }

      return "left";
    },
    renderHTML: (attributes: { textAlign?: CellTextAlign }) => {
      const textAlign = attributes.textAlign ?? "left";

      return {
        "data-text-align": textAlign,
        style: `text-align: ${textAlign};`,
      };
    },
  },
});

export const EditorTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...createCellAttributes(),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

export const EditorTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...createCellAttributes(),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

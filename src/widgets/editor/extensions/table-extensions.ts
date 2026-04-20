import { mergeAttributes } from "@tiptap/core";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

type CellTextAlign = "left" | "center" | "right";

const createCellAttributes = () => ({
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

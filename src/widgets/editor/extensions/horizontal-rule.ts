import { mergeAttributes } from "@tiptap/core";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

export const EditorHorizontalRule = HorizontalRule.extend({
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="horizontalRule"]' }, { tag: "hr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "horizontalRule",
        contenteditable: "false",
      }),
      ["hr"],
    ];
  },
});

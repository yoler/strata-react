import { ResizableNodeView } from "@tiptap/core";
import Image from "@tiptap/extension-image";

const syncImageAttributes = (element: HTMLImageElement, attributes: Record<string, unknown>) => {
  Array.from(element.getAttributeNames()).forEach((name) => {
    if (name !== "src") {
      element.removeAttribute(name);
    }
  });

  Object.entries(attributes).forEach(([key, value]) => {
    if (value == null || key === "width" || key === "height") {
      return;
    }

    if (key === "src") {
      element.src = String(value);
      return;
    }

    element.setAttribute(key, String(value));
  });
};

type ImageAlign = "left" | "center" | "right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editorImage: {
      setImageAlign: (align: ImageAlign) => ReturnType;
      resetImageSize: () => ReturnType;
    };
  }
}

export const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align,
        }),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: ImageAlign) =>
        ({ commands }: { commands: { updateAttributes: (typeOrName: string, attributes: Record<string, unknown>) => boolean } }) =>
          commands.updateAttributes(this.name, { align }),
      resetImageSize:
        () =>
        ({ commands }: { commands: { updateAttributes: (typeOrName: string, attributes: Record<string, unknown>) => boolean } }) =>
          commands.updateAttributes(this.name, {
            width: null,
            height: null,
          }),
    };
  },

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;

    return ({ node, getPos, HTMLAttributes }) => {
      const imageElement = document.createElement("img");
      syncImageAttributes(imageElement, HTMLAttributes);

      const nodeView = new ResizableNodeView({
        element: imageElement,
        editor: this.editor,
        node,
        getPos,
        onResize: (width, height) => {
          imageElement.style.width = `${width}px`;
          imageElement.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();

          if (pos === undefined) {
            return;
          }

          this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, { width, height }).run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }

          const attrs = updatedNode.attrs as Record<string, unknown>;
          syncImageAttributes(imageElement, attrs);

          if (attrs.width) {
            imageElement.style.width = `${attrs.width}px`;
          } else {
            imageElement.style.removeProperty("width");
          }

          if (attrs.height) {
            imageElement.style.height = `${attrs.height}px`;
          } else {
            imageElement.style.removeProperty("height");
          }

          nodeView.dom.setAttribute("data-align", String(attrs.align ?? "center"));
          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      nodeView.dom.setAttribute("data-align", String(node.attrs.align ?? "center"));
      nodeView.dom.style.visibility = "hidden";
      nodeView.dom.style.pointerEvents = "none";
      imageElement.onload = () => {
        nodeView.dom.style.visibility = "";
        nodeView.dom.style.pointerEvents = "";
      };

      return nodeView;
    };
  },
});

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

const getImageAspectRatio = (imageElement: HTMLImageElement, width: number, height: number) => {
  if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
    return imageElement.naturalWidth / imageElement.naturalHeight;
  }

  if (width > 0 && height > 0) {
    return width / height;
  }

  return 1;
};

const getResizeContainerMaxWidth = (container: HTMLElement) => {
  const width = container.getBoundingClientRect().width;

  if (width > 0) {
    return width;
  }

  const parentWidth = container.parentElement?.getBoundingClientRect().width ?? 0;

  return parentWidth > 0 ? parentWidth : Number.POSITIVE_INFINITY;
};

const constrainImageSize = (
  imageElement: HTMLImageElement,
  container: HTMLElement,
  width: number,
  height: number,
  minWidth: number,
  minHeight: number,
) => {
  const aspectRatio = getImageAspectRatio(imageElement, width, height);
  const maxWidth = getResizeContainerMaxWidth(container);
  let constrainedWidth = Math.max(minWidth, width);
  let constrainedHeight = constrainedWidth / aspectRatio;

  if (constrainedHeight < minHeight) {
    constrainedHeight = minHeight;
    constrainedWidth = constrainedHeight * aspectRatio;
  }

  if (Number.isFinite(maxWidth) && constrainedWidth > maxWidth) {
    constrainedWidth = maxWidth;
    constrainedHeight = constrainedWidth / aspectRatio;
  }

  return {
    width: Math.round(constrainedWidth),
    height: Math.round(constrainedHeight),
  };
};

type ImageAlign = "left" | "center" | "right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editorImage: {
      setImageAlign: (align: ImageAlign) => ReturnType;
      fitImageToWidth: () => ReturnType;
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
      fitImageToWidth:
        () =>
        ({ commands, editor }: { commands: { updateAttributes: (typeOrName: string, attributes: Record<string, unknown>) => boolean }; editor: { state: { selection: { from: number } }; view: { nodeDOM: (pos: number) => Node | null } } }) => {
          const nodeElement = editor.view.nodeDOM(editor.state.selection.from);

          if (!(nodeElement instanceof HTMLElement)) {
            return false;
          }

          const imageElement = nodeElement.querySelector("img");

          if (!(imageElement instanceof HTMLImageElement)) {
            return false;
          }

          const maxWidth = nodeElement.getBoundingClientRect().width;

          if (maxWidth <= 0) {
            return false;
          }

          const aspectRatio = getImageAspectRatio(imageElement, imageElement.naturalWidth || maxWidth, imageElement.naturalHeight || maxWidth);

          return commands.updateAttributes(this.name, {
            width: Math.round(maxWidth),
            height: Math.round(maxWidth / aspectRatio),
          });
        },
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
    const resizeMinWidth = minWidth ?? 8;
    const resizeMinHeight = minHeight ?? 8;

    return ({ node, getPos, HTMLAttributes }) => {
      const imageElement = document.createElement("img");
      syncImageAttributes(imageElement, HTMLAttributes);

      let nodeView: ResizableNodeView;

      nodeView = new ResizableNodeView({
        element: imageElement,
        editor: this.editor,
        node,
        getPos,
        onResize: (width, height) => {
          const constrained = constrainImageSize(imageElement, nodeView.dom, width, height, resizeMinWidth, resizeMinHeight);

          imageElement.style.width = `${constrained.width}px`;
          imageElement.style.height = `${constrained.height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();

          if (pos === undefined) {
            return;
          }

          const constrained = constrainImageSize(imageElement, nodeView.dom, width, height, resizeMinWidth, resizeMinHeight);

          this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, constrained).run();
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
            width: resizeMinWidth,
            height: resizeMinHeight,
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

import { NodeSelection } from "@tiptap/pm/state";
import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { AlignCenter, AlignLeft, AlignRight, Download, RotateCcw, Trash2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";

type ImageMenuProps = {
  editor: Editor;
};

const isImageSelection = (editor: Editor) => {
  const { selection } = editor.state;

  if (selection instanceof NodeSelection && selection.node.type.name === "image") {
    return true;
  }

  return editor.isActive("image");
};

export function ImageMenu({ editor }: ImageMenuProps) {
  const { currentAlign } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const { selection } = currentEditor.state;

      if (selection instanceof NodeSelection && selection.node.type.name === "image") {
        return {
          currentAlign: (selection.node.attrs.align as "left" | "center" | "right" | undefined) ?? "center",
        };
      }

      const attrs = currentEditor.getAttributes("image") as { align?: "left" | "center" | "right" };
      return {
        currentAlign: attrs.align ?? "center",
      };
    },
  });

  const getSelectedImageAttributes = () => {
    const { selection } = editor.state;

    if (selection instanceof NodeSelection && selection.node.type.name === "image") {
      return selection.node.attrs as { align?: "left" | "center" | "right"; src?: string };
    }

    return editor.getAttributes("image") as { align?: "left" | "center" | "right"; src?: string };
  };

  const getReferencedVirtualElement = () => {
    const { selection } = editor.state;

    if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") {
      return null;
    }

    const nodeElement = editor.view.nodeDOM(selection.from);

    if (!(nodeElement instanceof HTMLElement)) {
      return null;
    }

    const imageElement = nodeElement.querySelector("img");
    return imageElement instanceof HTMLElement ? imageElement : nodeElement;
  };

  const keepSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleDownload = async () => {
    const { src } = getSelectedImageAttributes();

    if (!src) {
      return;
    }

    const link = document.createElement("a");
    link.href = src;
    link.download = src.split("/").pop() || "image";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
  };

  const handleDelete = () => {
    editor.chain().focus().deleteSelection().run();
  };

  return (
    <TiptapBubbleMenu
      editor={editor}
      pluginKey="image-bubble-menu"
      shouldShow={({ editor: currentEditor }) => isImageSelection(currentEditor)}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{ placement: "top", offset: 12 }}
      className={cn(
        "image-bubble-menu flex items-center gap-1 rounded-2xl border border-black/8 bg-white px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]",
        "dark:border-white/10 dark:bg-neutral-900",
      )}
    >
      <button
        className={`image-bubble-menu-button ${currentAlign === "left" ? "is-active" : ""}`}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().setImageAlign("left").run()}
        type="button"
      >
        <AlignLeft className="size-4" strokeWidth={1.9} />
      </button>
      <button
        className={`image-bubble-menu-button ${currentAlign === "center" ? "is-active" : ""}`}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().setImageAlign("center").run()}
        type="button"
      >
        <AlignCenter className="size-4" strokeWidth={1.9} />
      </button>
      <button
        className={`image-bubble-menu-button ${currentAlign === "right" ? "is-active" : ""}`}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().setImageAlign("right").run()}
        type="button"
      >
        <AlignRight className="size-4" strokeWidth={1.9} />
      </button>
      <span className="image-bubble-menu-divider" />
      <button
        className="image-bubble-menu-button"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().resetImageSize().run()}
        type="button"
      >
        <RotateCcw className="size-4" strokeWidth={1.9} />
      </button>
      <button className="image-bubble-menu-button" onMouseDown={keepSelection} onClick={handleDownload} type="button">
        <Download className="size-4" strokeWidth={1.9} />
      </button>
      <button className="image-bubble-menu-button" onMouseDown={keepSelection} onClick={handleDelete} type="button">
        <Trash2 className="size-4" strokeWidth={1.9} />
      </button>
    </TiptapBubbleMenu>
  );
}

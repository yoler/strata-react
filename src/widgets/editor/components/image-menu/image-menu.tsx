import { NodeSelection } from "@tiptap/pm/state";
import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { AlignCenter, AlignLeft, AlignRight, Download, Maximize2, RotateCcw, Trash2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import "./image-menu.css";

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

const isVideoSelection = (editor: Editor) => {
  const { selection } = editor.state;

  if (selection instanceof NodeSelection && selection.node.type.name === "videoEmbed") {
    return true;
  }

  return editor.isActive("videoEmbed");
};

const isMediaSelection = (editor: Editor) => isImageSelection(editor) || isVideoSelection(editor);

export function ImageMenu({ editor }: ImageMenuProps) {
  const { currentAlign, mediaType } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const { selection } = currentEditor.state;

      if (selection instanceof NodeSelection && selection.node.type.name === "image") {
        return {
          currentAlign: (selection.node.attrs.align as "left" | "center" | "right" | undefined) ?? "center",
          mediaType: "image" as const,
        };
      }

      if (selection instanceof NodeSelection && selection.node.type.name === "videoEmbed") {
        return {
          currentAlign: (selection.node.attrs.align as "left" | "center" | "right" | undefined) ?? "center",
          mediaType: "video" as const,
        };
      }

      const attrs = currentEditor.getAttributes("image") as { align?: "left" | "center" | "right" };
      return {
        currentAlign: attrs.align ?? "center",
        mediaType: "image" as const,
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

  const getSelectedVideoAttributes = () => {
    const { selection } = editor.state;

    if (selection instanceof NodeSelection && selection.node.type.name === "videoEmbed") {
      return selection.node.attrs as { align?: "left" | "center" | "right"; src?: string };
    }

    return editor.getAttributes("videoEmbed") as { align?: "left" | "center" | "right"; src?: string };
  };

  const getReferencedVirtualElement = () => {
    const { selection } = editor.state;

    if (!(selection instanceof NodeSelection) || (selection.node.type.name !== "image" && selection.node.type.name !== "videoEmbed")) {
      return null;
    }

    const nodeElement = editor.view.nodeDOM(selection.from);

    if (!(nodeElement instanceof HTMLElement)) {
      return null;
    }

    const mediaElement = nodeElement.querySelector("img, .video-embed-frame-shell");
    return mediaElement instanceof HTMLElement ? mediaElement : nodeElement;
  };

  const keepSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleDownload = async () => {
    const { src } = mediaType === "video" ? getSelectedVideoAttributes() : getSelectedImageAttributes();

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

  const setAlign = (align: "left" | "center" | "right") => {
    if (mediaType === "video") {
      editor.chain().focus().setVideoAlign(align).run();
      return;
    }

    editor.chain().focus().setImageAlign(align).run();
  };

  const resetSize = () => {
    if (mediaType === "video") {
      editor.chain().focus().resetVideoSize().run();
      return;
    }

    editor.chain().focus().resetImageSize().run();
  };

  const fitToWidth = () => {
    if (mediaType === "video") {
      editor.chain().focus().fitVideoToWidth().run();
      return;
    }

    editor.chain().focus().fitImageToWidth().run();
  };

  return (
    <TiptapBubbleMenu
      editor={editor}
      pluginKey="image-bubble-menu"
      shouldShow={({ editor: currentEditor }) => isMediaSelection(currentEditor)}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{ placement: "top", offset: 12 }}
      className={cn(
        "image-bubble-menu flex items-center gap-1 rounded-2xl border border-black/8 bg-white px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]",
        "dark:border-white/10 dark:bg-neutral-900",
      )}
    >
      <button
        aria-label="Align left"
        className={`image-bubble-menu-button ${currentAlign === "left" ? "is-active" : ""}`}
        data-tooltip="Align left"
        onMouseDown={keepSelection}
        onClick={() => setAlign("left")}
        type="button"
      >
        <AlignLeft className="size-4" strokeWidth={1.9} />
      </button>
      <button
        aria-label="Align center"
        className={`image-bubble-menu-button ${currentAlign === "center" ? "is-active" : ""}`}
        data-tooltip="Align center"
        onMouseDown={keepSelection}
        onClick={() => setAlign("center")}
        type="button"
      >
        <AlignCenter className="size-4" strokeWidth={1.9} />
      </button>
      <button
        aria-label="Align right"
        className={`image-bubble-menu-button ${currentAlign === "right" ? "is-active" : ""}`}
        data-tooltip="Align right"
        onMouseDown={keepSelection}
        onClick={() => setAlign("right")}
        type="button"
      >
        <AlignRight className="size-4" strokeWidth={1.9} />
      </button>
      <span className="image-bubble-menu-divider" />
      <button
        aria-label="Fit to width"
        className="image-bubble-menu-button"
        data-tooltip="Fit to width"
        onMouseDown={keepSelection}
        onClick={fitToWidth}
        type="button"
      >
        <Maximize2 className="size-4" strokeWidth={1.9} />
      </button>
      <button
        aria-label="Reset size"
        className="image-bubble-menu-button"
        data-tooltip="Reset size"
        onMouseDown={keepSelection}
        onClick={resetSize}
        type="button"
      >
        <RotateCcw className="size-4" strokeWidth={1.9} />
      </button>
      <button aria-label="Download" className="image-bubble-menu-button" data-tooltip="Download" onMouseDown={keepSelection} onClick={handleDownload} type="button">
        <Download className="size-4" strokeWidth={1.9} />
      </button>
      <button aria-label="Delete" className="image-bubble-menu-button" data-tooltip="Delete" onMouseDown={keepSelection} onClick={handleDelete} type="button">
        <Trash2 className="size-4" strokeWidth={1.9} />
      </button>
    </TiptapBubbleMenu>
  );
}

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { Check, ChevronDown, Copy, CopyCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CODE_BLOCK_LANGUAGES, getCodeBlockLanguageLabel } from "../lib/code-block";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type CodeBlockMenuProps = {
  container: HTMLDivElement | null;
  editor: Editor;
};

type CodeBlockMenuPosition = {
  height: number;
  left: number;
  width: number;
  top: number;
  visible: boolean;
};

const HORIZONTAL_OFFSET = 12;
const VERTICAL_OFFSET = 8;
const HEADER_HEIGHT = 28;

export function CodeBlockMenu({ container, editor }: CodeBlockMenuProps) {
  const [position, setPosition] = useState<CodeBlockMenuPosition>({
    height: HEADER_HEIGHT,
    left: 0,
    width: 0,
    top: 0,
    visible: false,
  });
  const [copied, setCopied] = useState(false);

  const { language } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      language: (currentEditor.getAttributes("codeBlock").language as string | undefined) ?? null,
    }),
  });

  useLayoutEffect(() => {
    if (!editor || !container) {
      setPosition((current) => ({ ...current, visible: false, width: 0 }));
      return;
    }

    const resolvePosition = () => {
      if (editor.isDestroyed) {
        setPosition((current) => ({ ...current, visible: false, width: 0 }));
        return;
      }

      const { selection } = editor.state;

      if (selection.$from.parent.type.name !== "codeBlock") {
        setPosition((current) => ({ ...current, visible: false, width: 0 }));
        return;
      }

      const domAtPos = editor.view.domAtPos(selection.from);
      const node =
        domAtPos.node instanceof HTMLElement
          ? domAtPos.node
          : domAtPos.node.parentElement;
      const pre = node?.closest("pre");

      if (!(pre instanceof HTMLElement)) {
        setPosition((current) => ({ ...current, visible: false, width: 0 }));
        return;
      }

      const preRect = pre.getBoundingClientRect();

      setPosition({
        height: HEADER_HEIGHT,
        left: preRect.left + HORIZONTAL_OFFSET,
        width: Math.max(preRect.width - HORIZONTAL_OFFSET * 2, 0),
        top: preRect.top + VERTICAL_OFFSET,
        visible: true,
      });
    };

    resolvePosition();

    editor.on("selectionUpdate", resolvePosition);
    editor.on("transaction", resolvePosition);

    window.addEventListener("resize", resolvePosition);

    return () => {
      editor.off("selectionUpdate", resolvePosition);
      editor.off("transaction", resolvePosition);
      window.removeEventListener("resize", resolvePosition);
    };
  }, [container, editor]);

  useEffect(() => {
    if (!container) {
      return;
    }

    const scrollParent = container.querySelector(".ProseMirror")?.parentElement;

    if (!scrollParent) {
      return;
    }

    const handleScroll = () => {
      const { selection } = editor.state;

      if (selection.$from.parent.type.name !== "codeBlock") {
        return;
      }

      const domAtPos = editor.view.domAtPos(selection.from);
      const node =
        domAtPos.node instanceof HTMLElement
          ? domAtPos.node
          : domAtPos.node.parentElement;
      const pre = node?.closest("pre");

      if (!(pre instanceof HTMLElement)) {
        return;
      }

      const preRect = pre.getBoundingClientRect();

      setPosition({
        height: HEADER_HEIGHT,
        left: preRect.left + HORIZONTAL_OFFSET,
        width: Math.max(preRect.width - HORIZONTAL_OFFSET * 2, 0),
        top: preRect.top + VERTICAL_OFFSET,
        visible: true,
      });
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollParent.removeEventListener("scroll", handleScroll);
    };
  }, [container, editor]);

  if (!position.visible) {
    return null;
  }

  const handleCopy = async () => {
    const { selection } = editor.state;
    const codeBlockNode = selection.$from.parent.type.name === "codeBlock" ? selection.$from.parent : null;

    if (!codeBlockNode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(codeBlockNode.textContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Copy code block failed", error);
    }
  };

  return createPortal(
    <div
      className="code-block-menu"
      style={{
        height: `${position.height}px`,
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="code-block-language-trigger" type="button">
            <span>{getCodeBlockLanguageLabel(language)}</span>
            <ChevronDown className="size-3.5 opacity-70" strokeWidth={1.85} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="code-block-language-content" sideOffset={8}>
          {CODE_BLOCK_LANGUAGES.map((item) => (
            <DropdownMenuItem
              key={item.value}
              className="code-block-language-item"
              onSelect={() => {
                editor.chain().focus().updateAttributes("codeBlock", { language: item.value }).run();
              }}
            >
              <span>{item.label}</span>
              {item.value === language ? <Check className="ml-auto size-4" strokeWidth={2} /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button className="code-block-copy-button" onClick={handleCopy} type="button">
        {copied ? <CopyCheck className="size-3.5" strokeWidth={1.85} /> : <Copy className="size-3.5" strokeWidth={1.85} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>,
    document.body,
  );
}

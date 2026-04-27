import type { EditorView } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import type { MutableRefObject } from "react";
import { useCallback } from "react";

import { DEFAULT_CODE_BLOCK_LANGUAGE, detectCodeBlockLanguage } from "../lib/code-block";

type ClipboardEventLike = Parameters<NonNullable<EditorView["props"]["handlePaste"]>>[1];

type UseCodeBlockPasteDetectionOptions = {
  editorRef: MutableRefObject<Editor | null>;
};

export function useCodeBlockPasteDetection({ editorRef }: UseCodeBlockPasteDetectionOptions) {
  return useCallback<NonNullable<EditorView["props"]["handlePaste"]>>(
    (view, event: ClipboardEventLike) => {
      if (event.clipboardData?.files.length) {
        return false;
      }

      const text = event.clipboardData?.getData("text/plain");
      const { selection } = view.state;
      const codeBlockNode = selection.$from.parent.type.name === "codeBlock" ? selection.$from.parent : null;

      if (!codeBlockNode || !text) {
        return false;
      }

      const shouldAutoDetect =
        codeBlockNode.textContent.trim().length === 0 ||
        (selection.from === selection.$from.start() && selection.to === selection.$from.end());

      event.preventDefault();
      view.dispatch(view.state.tr.insertText(text, selection.from, selection.to).scrollIntoView());

      if (!shouldAutoDetect) {
        return true;
      }

      requestAnimationFrame(() => {
        const editor = editorRef.current;

        if (!editor || editor.isDestroyed) {
          return;
        }

        const { selection: currentSelection } = editor.state;
        const currentCodeBlock =
          currentSelection.$from.parent.type.name === "codeBlock" ? currentSelection.$from.parent : null;

        if (!currentCodeBlock) {
          return;
        }

        const nextLanguage = detectCodeBlockLanguage(currentCodeBlock.textContent);
        const currentLanguage =
          (currentCodeBlock.attrs.language as string | undefined) ?? DEFAULT_CODE_BLOCK_LANGUAGE;

        if (nextLanguage === currentLanguage) {
          return;
        }

        editor.chain().focus().updateAttributes("codeBlock", { language: nextLanguage }).run();
      });

      return true;
    },
    [editorRef],
  );
}

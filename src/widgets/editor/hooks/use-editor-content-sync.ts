import type { Editor } from "@tiptap/react";
import { useEffect } from "react";

import type { NotionEditorProps } from "../types";

export const useEditorContentSync = ({
  editor,
  initialContent,
}: {
  editor: Editor | null;
  initialContent: NotionEditorProps["initialContent"];
}) => {
  useEffect(() => {
    if (!editor || initialContent === undefined) {
      return;
    }

    if (typeof initialContent === "string") {
      if (editor.getHTML() === initialContent) {
        return;
      }
    } else {
      const currentContent = JSON.stringify(editor.getJSON());
      const nextContent = JSON.stringify(initialContent);

      if (currentContent === nextContent) {
        return;
      }
    }

    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);
};

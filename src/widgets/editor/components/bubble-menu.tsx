import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";

import { cn } from "@/shared/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

type EditorBubbleMenuProps = {
  editor: Editor;
};

export function BubbleMenu({ editor }: EditorBubbleMenuProps) {
  // 使用 useEditorState 按需订阅状态，提升性能
  const { isBold, isItalic, isStrike } = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isStrike: ctx.editor.isActive("strike"),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
    }),
  });

  // 同步 ToggleGroup 的值
  const activeValues = [];
  if (isBold) activeValues.push("bold");
  if (isItalic) activeValues.push("italic");
  if (isStrike) activeValues.push("strike");

  const handleToggle = (values: string[]) => {
    const chain = editor.chain().focus();
    if (values.includes("bold") !== isBold) chain.toggleBold();
    if (values.includes("italic") !== isItalic) chain.toggleItalic();
    if (values.includes("strike") !== isStrike) chain.toggleStrike();
    chain.run();
  };

  if (!editor) return null;

  return (
    <TiptapBubbleMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }) => {
        const { selection } = currentEditor.state;

        if (selection.empty) {
          return false;
        }

        if (
          selection instanceof NodeSelection &&
          (selection.node.type.name === "imageUpload" ||
            selection.node.type.name === "image" ||
            selection.node.type.name === "codeBlock" ||
            selection.node.type.name === "videoEmbed" ||
            selection.node.type.name === "videoEmbedInput")
        ) {
          return false;
        }

        const { from, to } = selection;
        let containsBlockedNode = false;

        currentEditor.state.doc.nodesBetween(from, to, (node) => {
          if (
            node.type.name === "imageUpload" ||
            node.type.name === "image" ||
            node.type.name === "codeBlock" ||
            node.type.name === "videoEmbed" ||
            node.type.name === "videoEmbedInput"
          ) {
            containsBlockedNode = true;
            return false;
          }

          return true;
        });

        if (
          containsBlockedNode ||
          currentEditor.isActive("imageUpload") ||
          currentEditor.isActive("image") ||
          currentEditor.isActive("codeBlock") ||
          currentEditor.isActive("videoEmbed") ||
          currentEditor.isActive("videoEmbedInput")
        ) {
          return false;
        }

        return true;
      }}
      className={cn(
        "flex items-center gap-1 overflow-hidden rounded-full border-none bg-white p-1.5",
        "shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:bg-neutral-900"
      )}
    >
      <ToggleGroup
        type="multiple"
        value={activeValues}
        onValueChange={handleToggle}
        size="sm"
        className="gap-1"
      >
        <ToggleGroupItem value="bold" className="px-4">
          Bold
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" className="px-4">
          Italic
        </ToggleGroupItem>
        <ToggleGroupItem value="strike" className="px-4">
          Strike
        </ToggleGroupItem>
      </ToggleGroup>
    </TiptapBubbleMenu>
  );
}

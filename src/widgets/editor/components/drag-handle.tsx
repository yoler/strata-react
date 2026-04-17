import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "@tiptap/extension-drag-handle-react";
import { Copy, GripVertical, Heading1, Heading2, Heading3, Palette, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

export function DragHandle({ editor }: { editor: Editor }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const currentNodePosRef = useRef<number>(-1);

  const getCurrentNode = () => {
    const pos = currentNodePosRef.current;

    if (pos < 0) {
      return null;
    }

    const node = editor.state.doc.nodeAt(pos);

    if (!node) {
      return null;
    }

    return { node, pos };
  };

  const focusCurrentNode = () => {
    const current = getCurrentNode();

    if (!current) {
      return false;
    }

    const focusPos = current.node.isTextblock ? current.pos + 1 : current.pos;
    editor.chain().focus(focusPos).run();
    return true;
  };

  const handleAddBlock = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const current = getCurrentNode();

    if (current) {
      const endOfBlock = current.pos + current.node.nodeSize;
      editor
        .chain()
        .focus()
        .insertContentAt(endOfBlock, { type: "paragraph" })
        .setTextSelection(endOfBlock + 1)
        .insertContent("/")
        .run();
      return;
    }

    const { $head } = editor.state.selection;
    const endOfBlock = $head.end($head.depth) + 1;

    editor
      .chain()
      .focus()
      .insertContentAt(endOfBlock, { type: "paragraph" })
      .setTextSelection(endOfBlock + 1)
      .insertContent("/")
      .run();
  };

  const handleGripPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    startPosRef.current = { x: event.clientX, y: event.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startPosRef.current.x;
      const dy = moveEvent.clientY - startPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDraggingRef.current = true;
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      if (!isDraggingRef.current) {
        setMenuOpen(true);
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const deleteNode = () => {
    const current = getCurrentNode();

    if (!current) {
      return;
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from: current.pos, to: current.pos + current.node.nodeSize })
      .run();
    setMenuOpen(false);
  };

  const duplicateNode = () => {
    const current = getCurrentNode();

    if (!current) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContentAt(current.pos + current.node.nodeSize, current.node.toJSON())
      .run();
    setMenuOpen(false);
  };

  const setNodeType = (type: "paragraph" | "heading", attrs?: Record<string, number>) => {
    if (!focusCurrentNode()) {
      return;
    }

    editor.chain().focus().setNode(type, attrs).run();
    setMenuOpen(false);
  };

  const setColor = (color?: string) => {
    const current = getCurrentNode();

    if (!current || !current.node.isTextblock) {
      return;
    }

    const from = current.pos + 1;
    const to = current.pos + current.node.nodeSize - 1;

    if (to <= from) {
      editor.chain().focus(from).run();
    } else {
      editor.chain().focus().setTextSelection({ from, to }).run();
    }

    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }

    setMenuOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <TiptapDragHandle
        editor={editor}
        onNodeChange={({ pos }) => {
          currentNodePosRef.current = pos;
        }}
        onElementDragStart={() => setIsDragging(true)}
        onElementDragEnd={() => setIsDragging(false)}
      >
        <div
          className={`drag-handle-buttons flex items-center gap-px pr-1 text-muted-foreground/50 transition-opacity hover:text-muted-foreground ${isDragging ? "pointer-events-none opacity-0" : ""
            }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={handleAddBlock}
                className="flex h-7 w-6 items-center justify-center rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="size-4" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Insert block</TooltipContent>
          </Tooltip>

          <div className="relative flex h-7 w-5 items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onPointerDown={handleGripPointerDown}
                  className="flex h-7 w-5 cursor-grab items-center justify-center rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="font-medium">Click for options</div>
                <div className="text-muted-foreground">Hold for drag</div>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <span
                  className="pointer-events-none absolute inset-0 outline-none"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-52" sideOffset={8}>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <div className="flex items-center font-medium">Turn into</div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem onClick={() => setNodeType("heading", { level: 1 })}>
                      <Heading1 className="mr-2 size-4" /> Heading 1
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setNodeType("heading", { level: 2 })}>
                      <Heading2 className="mr-2 size-4" /> Heading 2
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setNodeType("heading", { level: 3 })}>
                      <Heading3 className="mr-2 size-4" /> Heading 3
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setNodeType("paragraph")}>
                      Text
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <div className="flex items-center font-medium">
                      <Palette className="mr-2 size-4 text-muted-foreground" /> Color
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold uppercase tracking-wider">
                      Text Color
                    </div>
                    {[
                      { color: undefined, label: "Default" },
                      { color: "#eb5757", label: "Red" },
                      { color: "#e67a15", label: "Orange" },
                      { color: "#0f7b6c", label: "Green" },
                      { color: "#2563eb", label: "Blue" },
                    ].map((item) => (
                      <DropdownMenuItem key={item.label} onClick={() => setColor(item.color)}>
                        <div
                          className="mr-2 h-3 w-3 rounded-full border"
                          style={{ backgroundColor: item.color ?? "transparent" }}
                        />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={duplicateNode}>
                  <Copy className="mr-2 size-4 text-muted-foreground" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={deleteNode}
                >
                  <Trash2 className="mr-2 size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TiptapDragHandle>
    </TooltipProvider>
  );
}

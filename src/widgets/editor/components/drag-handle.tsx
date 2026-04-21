import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "@tiptap/extension-drag-handle-react";
import { TextSelection, type Command } from "@tiptap/pm/state";
import { CellSelection, deleteCellSelection, setCellAttr, TableMap } from "@tiptap/pm/tables";
import { AlignCenter, AlignLeft, AlignRight, Code, Copy, Download, Eraser, GripVertical, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Maximize2, PaintBucket, Pilcrow, Plus, Quote, Repeat, RotateCcw, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
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

type ColorItem = {
  label: string;
  value: string;
};

type MenuNodeKind =
  | "text"
  | "heading"
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "codeBlock"
  | "image"
  | "imageUpload"
  | "video"
  | "divider"
  | "table";

type MenuTarget = {
  kind: MenuNodeKind;
  node: NonNullable<ReturnType<Editor["state"]["doc"]["nodeAt"]>>;
  pos: number;
};

const tableTextColors: ColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#6b7280" },
  { label: "Brown", value: "#92400e" },
  { label: "Orange", value: "#ea580c" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Red", value: "#dc2626" },
];

const tableBackgroundColors: ColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Brown", value: "#f3e8dc" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#ede9fe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Red", value: "#fee2e2" },
];

const blockTextColors: ColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#6b7280" },
  { label: "Brown", value: "#92400e" },
  { label: "Orange", value: "#ea580c" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Red", value: "#dc2626" },
];

const blockHighlightColors: ColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Brown", value: "#f3e8dc" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#ede9fe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Red", value: "#fee2e2" },
];

const turnIntoItems = [
  { label: "Text", value: "text", icon: Pilcrow },
  { label: "Heading 1", value: "heading-1", icon: Heading1 },
  { label: "Heading 2", value: "heading-2", icon: Heading2 },
  { label: "Heading 3", value: "heading-3", icon: Heading3 },
  { label: "Bullet list", value: "bullet-list", icon: List },
  { label: "Numbered list", value: "numbered-list", icon: ListOrdered },
  { label: "To-do list", value: "todo-list", icon: ListTodo },
  { label: "Quote", value: "quote", icon: Quote },
  { label: "Code block", value: "code-block", icon: Code },
] as const;

export function DragHandle({ editor }: { editor: Editor }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dividerOffsetY, setDividerOffsetY] = useState(0);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const currentNodePosRef = useRef<number>(-1);
  const buttonsRef = useRef<HTMLDivElement | null>(null);

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

  const getCurrentTarget = (): MenuTarget | null => {
    const current = getCurrentNode();

    if (!current) {
      return null;
    }

    const currentTypeName = current.node.type.name;

    if (currentTypeName === "table") return { kind: "table", node: current.node, pos: current.pos };
    if (currentTypeName === "image") return { kind: "image", node: current.node, pos: current.pos };
    if (currentTypeName === "imageUpload") return { kind: "imageUpload", node: current.node, pos: current.pos };
    if (currentTypeName === "videoEmbed" || currentTypeName === "videoEmbedInput") return { kind: "video", node: current.node, pos: current.pos };
    if (currentTypeName === "codeBlock") return { kind: "codeBlock", node: current.node, pos: current.pos };
    if (currentTypeName === "blockquote") return { kind: "blockquote", node: current.node, pos: current.pos };
    if (currentTypeName === "taskList") return { kind: "taskList", node: current.node, pos: current.pos };
    if (currentTypeName === "bulletList") return { kind: "bulletList", node: current.node, pos: current.pos };
    if (currentTypeName === "orderedList") return { kind: "orderedList", node: current.node, pos: current.pos };
    if (currentTypeName === "heading") return { kind: "heading", node: current.node, pos: current.pos };
    if (currentTypeName === "horizontalRule") return { kind: "divider", node: current.node, pos: current.pos };
    if (currentTypeName === "paragraph") return { kind: "text", node: current.node, pos: current.pos };

    const resolvedPos = editor.state.doc.resolve(Math.min(current.pos + 1, editor.state.doc.content.size));

    for (let depth = resolvedPos.depth; depth > 0; depth -= 1) {
      const node = resolvedPos.node(depth);
      const pos = resolvedPos.before(depth);
      const typeName = node.type.name;

      if (typeName === "table") return { kind: "table", node, pos };
      if (typeName === "image") return { kind: "image", node, pos };
      if (typeName === "imageUpload") return { kind: "imageUpload", node, pos };
      if (typeName === "videoEmbed" || typeName === "videoEmbedInput") return { kind: "video", node, pos };
      if (typeName === "codeBlock") return { kind: "codeBlock", node, pos };
      if (typeName === "blockquote") return { kind: "blockquote", node, pos };
      if (typeName === "taskList") return { kind: "taskList", node, pos };
      if (typeName === "bulletList") return { kind: "bulletList", node, pos };
      if (typeName === "orderedList") return { kind: "orderedList", node, pos };
      if (typeName === "heading") return { kind: "heading", node, pos };
      if (typeName === "horizontalRule") return { kind: "divider", node, pos };
      if (typeName === "paragraph") return { kind: "text", node, pos };
    }

    return { kind: "text", node: current.node, pos: current.pos };
  };

  const getCurrentTable = () => {
    const current = getCurrentTarget();

    if (current?.kind !== "table") {
      return null;
    }

    return current;
  };

  const selectWholeTable = () => {
    const table = getCurrentTable();

    if (!table) {
      return false;
    }

    const map = TableMap.get(table.node);
    const firstCell = table.pos + 1 + map.map[0];
    const lastCell = table.pos + 1 + map.map[map.map.length - 1];
    editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, firstCell, lastCell)));
    editor.view.focus();
    return true;
  };

  const runTableCommand = (command: Command) => {
    const didRun = command(editor.state, editor.view.dispatch);

    if (didRun) {
      editor.view.focus();
    }

    return didRun;
  };

  const focusCurrentNode = () => {
    const current = getCurrentTarget();

    if (!current) {
      return false;
    }

    const focusPos = current.node.isTextblock ? current.pos + 1 : current.pos;
    editor.chain().focus(focusPos).run();
    return true;
  };

  const selectTargetContent = () => {
    const target = getCurrentTarget();

    if (!target) {
      return null;
    }

    const from = target.pos + 1;
    const to = target.pos + target.node.nodeSize - 1;

    if (to <= from) {
      editor.chain().focus(from).run();
      return { target, from, to: from };
    }

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));
    editor.view.focus();
    return { target, from, to };
  };

  const handleAddBlock = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const current = getCurrentNode();

    if (current) {
      const isEmptyTextBlock = current.node.isTextblock && current.node.textContent.trim() === "";
      const isSlashOnlyTextBlock = current.node.isTextblock && current.node.textContent.trim() === "/";

      if (isEmptyTextBlock) {
        editor.chain().focus(current.pos + 1).insertContent("/").run();
        return;
      }

      if (isSlashOnlyTextBlock) {
        const from = current.pos + 1;
        const to = current.pos + current.node.nodeSize - 1;

        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, "/").setTextSelection(from + 1).run();
        return;
      }

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

  const handleGripPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
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
        selectWholeTable();
        setMenuOpen(true);
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const deleteNode = () => {
    const current = getCurrentTarget();

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
    const current = getCurrentTarget();

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

  const turnInto = (type: (typeof turnIntoItems)[number]["value"]) => {
    const selection = selectTargetContent();

    if (!selection) {
      return;
    }

    switch (type) {
      case "text":
        editor.chain().focus().setParagraph().run();
        break;
      case "heading-1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "heading-2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "heading-3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bullet-list":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "numbered-list":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "todo-list":
        editor.chain().focus().toggleTaskList().run();
        break;
      case "quote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "code-block":
        editor.chain().focus().setNode("codeBlock").run();
        break;
      default:
        break;
    }

    setMenuOpen(false);
  };

  const setBlockTextColor = (color?: string) => {
    const selection = selectTargetContent();

    if (!selection) {
      return;
    }

    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }

    setMenuOpen(false);
  };

  const setBlockHighlightColor = (color?: string) => {
    const selection = selectTargetContent();

    if (!selection) {
      return;
    }

    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }

    setMenuOpen(false);
  };

  const resetFormatting = () => {
    const selection = selectTargetContent();

    if (!selection) {
      return;
    }

    editor.chain().focus().unsetAllMarks().clearNodes().run();
    setMenuOpen(false);
  };

  const downloadImage = () => {
    const target = getCurrentTarget();
    const src = target?.kind === "image" ? ((target.node.attrs.src as string | undefined) ?? "") : "";

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
    setMenuOpen(false);
  };

  const setTableAlign = (align: "left" | "center" | "right") => {
    if (!selectWholeTable()) {
      return;
    }

    runTableCommand(setCellAttr("textAlign", align));
  };

  const setTableColor = (attr: "backgroundColor" | "textColor", value: string) => {
    if (!selectWholeTable()) {
      return;
    }

    runTableCommand(setCellAttr(attr, value || null));
    setMenuOpen(false);
  };

  const getTableCellAttrs = (attr: "backgroundColor" | "textAlign" | "textColor") => {
    const table = getCurrentTable();

    if (!table) {
      return null;
    }

    const values = new Set<string>();
    table.node.descendants((node) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        values.add(node.attrs[attr] ?? "");
      }
    });

    if (values.size !== 1) {
      return null;
    }

    return values.values().next().value ?? "";
  };

  const clearTableContents = () => {
    if (!selectWholeTable()) {
      return;
    }

    runTableCommand(deleteCellSelection);
    setMenuOpen(false);
  };

  const fitTableToWidth = () => {
    const table = getCurrentTable();

    if (!table) {
      return;
    }

    const map = TableMap.get(table.node);
    const tr = editor.state.tr;
    map.map.forEach((cellOffset) => {
      const cellPos = table.pos + 1 + cellOffset;
      const cell = tr.doc.nodeAt(cellPos);

      if (cell?.attrs.colwidth) {
        tr.setNodeMarkup(cellPos, null, { ...cell.attrs, colwidth: null });
      }
    });

    if (tr.docChanged) {
      editor.view.dispatch(tr);
    }

    selectWholeTable();
    setMenuOpen(false);
  };

  const currentTarget = getCurrentTarget();
  const isTableMenu = currentTarget?.kind === "table";
  const tableTextColor = isTableMenu ? getTableCellAttrs("textColor") : null;
  const tableBackgroundColor = isTableMenu ? getTableCellAttrs("backgroundColor") : null;
  const tableTextAlign = isTableMenu ? getTableCellAttrs("textAlign") : null;
  const menuTitle =
    currentTarget?.kind === "heading"
      ? "Heading"
      : currentTarget?.kind === "blockquote"
        ? "Blockquote"
        : currentTarget?.kind === "bulletList"
          ? "Bullet list"
          : currentTarget?.kind === "orderedList"
            ? "Numbered list"
            : currentTarget?.kind === "taskList"
              ? "To-do list"
              : currentTarget?.kind === "codeBlock"
                ? "Code Block"
                : currentTarget?.kind === "image" || currentTarget?.kind === "imageUpload"
                  ? "Image"
                  : currentTarget?.kind === "video"
                    ? "Video"
                    : currentTarget?.kind === "divider"
                      ? "Separator"
                      : currentTarget?.kind === "table"
                        ? "Table"
                        : "Text";
  const canColor =
    currentTarget?.kind === "text" ||
    currentTarget?.kind === "heading" ||
    currentTarget?.kind === "blockquote" ||
    currentTarget?.kind === "bulletList" ||
    currentTarget?.kind === "orderedList" ||
    currentTarget?.kind === "taskList";
  const canTurnInto =
    currentTarget?.kind !== "table" &&
    currentTarget?.kind !== "image" &&
    currentTarget?.kind !== "imageUpload" &&
    currentTarget?.kind !== "video";
  const canReset =
    currentTarget?.kind === "text" ||
    currentTarget?.kind === "blockquote" ||
    currentTarget?.kind === "bulletList" ||
    currentTarget?.kind === "orderedList";
  const canDownloadImage = currentTarget?.kind === "image";
  const canDuplicate = currentTarget !== null;

  return (
    <TiptapDragHandle
      editor={editor}
      className="drag-handle-shell"
      onNodeChange={({ node, pos }) => {
        currentNodePosRef.current = pos;

        if (node?.type.name === "horizontalRule") {
          requestAnimationFrame(() => {
            const nodeDom = editor.view.nodeDOM(pos);

            if (!(nodeDom instanceof HTMLElement)) {
              setDividerOffsetY(0);
              return;
            }

            const rule = nodeDom.querySelector("hr");

            if (!(rule instanceof HTMLElement)) {
              setDividerOffsetY(0);
              return;
            }

            const nodeRect = nodeDom.getBoundingClientRect();
            const ruleRect = rule.getBoundingClientRect();
            const buttonsHeight = buttonsRef.current?.getBoundingClientRect().height ?? 32;
            const offset = ruleRect.top + ruleRect.height / 2 - nodeRect.top - buttonsHeight / 2;

            setDividerOffsetY(Math.round(offset));
          });

          return;
        }

        setDividerOffsetY(0);
      }}
      onElementDragStart={() => setIsDragging(true)}
      onElementDragEnd={() => setIsDragging(false)}
    >
      <div
        ref={buttonsRef}
        className={`drag-handle-buttons flex items-start gap-px pr-1 text-muted-foreground/50 hover:text-muted-foreground ${
          isDragging ? "pointer-events-none scale-95 opacity-0" : ""
        }`}
        style={
          {
            "--drag-handle-offset-y": `${dividerOffsetY}px`,
          } as CSSProperties
        }
      >
        <button
          type="button"
          title="Insert block"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleAddBlock}
          className="drag-handle-action drag-handle-add flex h-8 w-6 items-center justify-center rounded-full"
        >
          <Plus className="size-4" strokeWidth={2} />
        </button>

        <div className="relative ml-px flex h-8 w-5 items-center justify-center">
          <button
            type="button"
            title="Click for options. Hold for drag."
            onPointerDown={handleGripPointerDown}
            className="drag-handle-action drag-handle-grip flex h-8 w-5 cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
          >
            <GripVertical className="size-[15px]" strokeWidth={1.8} />
          </button>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <span
                className="pointer-events-none absolute inset-0 outline-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className={isTableMenu ? "table-control-menu w-56" : "table-control-menu w-52"} collisionPadding={16} sideOffset={8}>
              {isTableMenu ? (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Table</div>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <PaintBucket className="size-4" /> Color
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="table-control-menu table-control-color-menu" collisionPadding={16}>
                      <div className="table-control-color-label">Text Color</div>
                      <div className="table-control-color-grid">
                        {tableTextColors.map((color) => (
                          <button
                            key={`table-text-${color.label}`}
                            aria-label={`${color.label} text color`}
                            className={`table-control-color-swatch ${tableTextColor === color.value ? "is-active" : ""}`}
                            onClick={() => setTableColor("textColor", color.value)}
                            onMouseDown={(event) => event.preventDefault()}
                            style={{ color: color.value || "#64748b" }}
                            type="button"
                          >
                            <span>A</span>
                          </button>
                        ))}
                      </div>
                      <div className="table-control-color-label">Background Color</div>
                      <div className="table-control-color-grid">
                        {tableBackgroundColors.map((color) => (
                          <button
                            key={`table-background-${color.label}`}
                            aria-label={`${color.label} background color`}
                            className={`table-control-background-swatch ${tableBackgroundColor === color.value ? "is-active" : ""}`}
                            onClick={() => setTableColor("backgroundColor", color.value)}
                            onMouseDown={(event) => event.preventDefault()}
                            type="button"
                          >
                            <span style={{ background: color.value || "#fff" }} />
                          </button>
                        ))}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <AlignLeft className="size-4" /> Alignment
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="table-control-menu table-control-submenu w-44" collisionPadding={16}>
                      <DropdownMenuItem className={tableTextAlign === "left" ? "table-control-item-active" : ""} onClick={() => setTableAlign("left")}>
                        <AlignLeft className="size-4" /> Left
                      </DropdownMenuItem>
                      <DropdownMenuItem className={tableTextAlign === "center" ? "table-control-item-active" : ""} onClick={() => setTableAlign("center")}>
                        <AlignCenter className="size-4" /> Center
                      </DropdownMenuItem>
                      <DropdownMenuItem className={tableTextAlign === "right" ? "table-control-item-active" : ""} onClick={() => setTableAlign("right")}>
                        <AlignRight className="size-4" /> Right
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem onClick={fitTableToWidth}>
                    <Maximize2 className="size-4" /> Fit to width
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearTableContents}>
                    <Eraser className="size-4" /> Clear all contents
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={deleteNode}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{menuTitle}</div>

                  {canColor && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <PaintBucket className="size-4" /> Color
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="table-control-menu table-control-color-menu" collisionPadding={16}>
                        <div className="table-control-color-label">Text Color</div>
                        <div className="table-control-color-grid">
                          {blockTextColors.map((color) => (
                            <button
                              key={`block-text-${color.label}`}
                              aria-label={`${color.label} text color`}
                              className="table-control-color-swatch"
                              onClick={() => setBlockTextColor(color.value || undefined)}
                              onMouseDown={(event) => event.preventDefault()}
                              style={{ color: color.value || "#64748b" }}
                              type="button"
                            >
                              <span>A</span>
                            </button>
                          ))}
                        </div>
                        <div className="table-control-color-label">Background Color</div>
                        <div className="table-control-color-grid">
                          {blockHighlightColors.map((color) => (
                            <button
                              key={`block-highlight-${color.label}`}
                              aria-label={`${color.label} highlight color`}
                              className="table-control-background-swatch"
                              onClick={() => setBlockHighlightColor(color.value || undefined)}
                              onMouseDown={(event) => event.preventDefault()}
                              type="button"
                            >
                              <span style={{ background: color.value || "#fff" }} />
                            </button>
                          ))}
                        </div>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {canTurnInto && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Repeat className="size-4" /> Turn Into
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="table-control-menu w-48" collisionPadding={16}>
                        {turnIntoItems.map((item) => (
                          <DropdownMenuItem key={item.value} onClick={() => turnInto(item.value)}>
                            <item.icon className="size-4" /> {item.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {canReset && (
                    <DropdownMenuItem onClick={resetFormatting}>
                      <RotateCcw className="size-4" /> Reset formatting
                    </DropdownMenuItem>
                  )}

                  {(canColor || canTurnInto || canReset || canDownloadImage) && <DropdownMenuSeparator />}

                  {canDownloadImage && (
                    <DropdownMenuItem onClick={downloadImage}>
                      <Download className="size-4" /> Download image
                    </DropdownMenuItem>
                  )}

                  {canDuplicate && (
                    <DropdownMenuItem onClick={duplicateNode}>
                      <Copy className="size-4" /> Duplicate node
                    </DropdownMenuItem>
                  )}

                  {canDuplicate && <DropdownMenuSeparator />}

                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={deleteNode}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TiptapDragHandle>
  );
}
